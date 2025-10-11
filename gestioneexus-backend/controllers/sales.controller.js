const pool = require('../db/database');
const { logAction } = require('../helpers/audit.helper');

const getSales = async (req, res) => {
    // Aceptamos parámetros de paginación y filtros
    const { page = 1, limit = 15, userId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    try {
        const params = [];
        let whereConditions = [];

        if (userId) {
            whereConditions.push('s.user_id = ?');
            params.push(userId);
        }
        if (startDate && endDate) {
            whereConditions.push('s.created_at BETWEEN ? AND ?');
            params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const baseQuery = `
            FROM sales s
            JOIN users u ON s.user_id = u.id
            JOIN sale_details sd ON s.id = sd.sale_id
            ${whereClause}
        `;
        
        // Consulta para obtener los datos de la página actual
        const [sales] = await pool.query(`
            SELECT s.id, s.total_amount, s.discount, s.created_at, u.full_name as user_name,
                   SUM(sd.quantity * sd.unit_cost) as total_cost
            ${baseQuery}
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Consulta para obtener el conteo total de registros que coinciden con los filtros
        const [[{ total }]] = await pool.query(`SELECT COUNT(DISTINCT s.id) as total ${baseQuery}`, params);

        res.json({
            sales,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error("Error al obtener las ventas:", error);
        res.status(500).json({ msg: 'Error al obtener las ventas' });
    }
};

const getSaleById = async (req, res) => {
    const { id } = req.params;
    try {
        const [[sale]] = await pool.query(`
            SELECT s.id, s.total_amount, s.discount, s.created_at, u.full_name as user_name
            FROM sales s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ?
        `, [id]);

        if (!sale) {
            return res.status(404).json({ msg: 'Venta no encontrada' });
        }

        // --- INICIO DE LA MEJORA ---
        // Se añade "p.sizes as product_size" a la consulta para obtener la talla del producto.
        const [details] = await pool.query(`
            SELECT sd.quantity, sd.unit_price, sd.unit_cost, p.name as product_name, p.sizes as product_size
            FROM sale_details sd
            JOIN products p ON sd.product_id = p.id
            WHERE sd.sale_id = ?
        `, [id]);
        // --- FIN DE LA MEJORA ---

        res.json({ ...sale, details });
    } catch (error) {
        console.error("Error al obtener el detalle de la venta:", error);
        res.status(500).json({ msg: 'Error al obtener el detalle de la venta' });
    }
};

const createSale = async (req, res) => {
    const { total_amount, products, discount = 0 } = req.body;
    const userId = req.uid;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        for (const product of products) {
            const [[dbProduct]] = await connection.query('SELECT quantity, name, cost FROM products WHERE id = ? FOR UPDATE', [product.product_id]);
            if (!dbProduct || dbProduct.quantity < product.quantity) {
                await connection.rollback();
                return res.status(400).json({ msg: `Stock insuficiente para: ${dbProduct?.name || 'producto desconocido'}` });
            }
            product.cost = dbProduct.cost;
        }

        const [saleResult] = await connection.query(
            'INSERT INTO sales (user_id, total_amount, discount) VALUES (?, ?, ?)',
            [userId, total_amount, discount]
        );
        const saleId = saleResult.insertId;

        for (const product of products) {
            await connection.query(
                'INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, unit_cost) VALUES (?, ?, ?, ?, ?)',
                [saleId, product.product_id, product.quantity, product.unit_price, product.cost]
            );
        }

        const finalAmountWithDiscount = total_amount * (1 - (discount / 100));
        await connection.query(
            'INSERT INTO financial_ledger (entry_date, concept, income) VALUES (CURDATE(), ?, ?)',
            [`Venta (ID: ${saleId}) con ${discount}% desc.`, finalAmountWithDiscount]
        );
        
        await connection.commit();
        
        await logAction(userId, `Registró una venta (ID: ${saleId}) por un total de ${total_amount} con ${discount}% de descuento.`);

        res.status(201).json({ msg: 'Venta creada exitosamente', saleId });

    } catch (error) {
        await connection.rollback();
        console.error("Error al crear la venta:", error);
        res.status(500).json({ msg: 'Error al procesar la venta' });
    } finally {
        connection.release();
    }
};

module.exports = { getSales, getSaleById, createSale };