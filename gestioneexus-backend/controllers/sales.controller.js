const pool = require('../db/database');
const { logAction } = require('../helpers/audit.helper');

const getSales = async (req, res) => {
    const { page = 1, limit = 15, userId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    try {
        let params = [];
        let whereConditions = [];
        let paramIndex = 1;

        if (userId) {
            whereConditions.push(`s.user_id = $${paramIndex++}`);
            params.push(userId);
        }
        if (startDate && endDate) {
            whereConditions.push(`s.created_at BETWEEN $${paramIndex++} AND $${paramIndex++}`);
            params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const baseQuery = `
            FROM sales s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN sale_details sd ON s.id = sd.sale_id
            ${whereClause}
        `;
        
        const salesParams = [...params, parseInt(limit), parseInt(offset)];
        const { rows: sales } = await pool.query(`
            SELECT s.id, s.total_amount, s.discount, s.created_at, u.full_name as user_name,
                   COALESCE(SUM(sd.quantity * sd.unit_cost), 0) as total_cost
            ${baseQuery}
            GROUP BY s.id, u.full_name
            ORDER BY s.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `, salesParams);

        const { rows: totalRows } = await pool.query(`SELECT COUNT(DISTINCT s.id) as total FROM sales s ${whereClause}`, params);
        const total = totalRows[0].total;

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
        const { rows: [sale] } = await pool.query(`
            SELECT s.id, s.total_amount, s.discount, s.created_at, u.full_name as user_name
            FROM sales s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = $1
        `, [id]);

        if (!sale) {
            return res.status(404).json({ msg: 'Venta no encontrada' });
        }

        const { rows: details } = await pool.query(`
            SELECT sd.quantity, sd.unit_price, sd.unit_cost, p.name as product_name, p.sizes as product_size
            FROM sale_details sd
            JOIN products p ON sd.product_id = p.id
            WHERE sd.sale_id = $1
        `, [id]);

        res.json({ ...sale, details });
    } catch (error) {
        console.error("Error al obtener el detalle de la venta:", error);
        res.status(500).json({ msg: 'Error al obtener el detalle de la venta' });
    }
};

const createSale = async (req, res) => {
    const { total_amount, products, discount = 0 } = req.body;
    const userId = req.uid;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const product of products) {
            const { rows: [dbProduct] } = await client.query('SELECT quantity, name, cost FROM products WHERE id = $1 FOR UPDATE', [product.product_id]);
            if (!dbProduct || dbProduct.quantity < product.quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: `Stock insuficiente para: ${dbProduct?.name || 'producto desconocido'}` });
            }
            product.cost = dbProduct.cost;
        }

        const saleResult = await client.query(
            'INSERT INTO sales (user_id, total_amount, discount) VALUES ($1, $2, $3) RETURNING id',
            [userId, total_amount, discount]
        );
        const saleId = saleResult.rows[0].id;

        for (const product of products) {
            await client.query(
                'INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, unit_cost) VALUES ($1, $2, $3, $4, $5)',
                [saleId, product.product_id, product.quantity, product.unit_price, product.cost]
            );
        }

        const finalAmountWithDiscount = total_amount * (1 - (discount / 100));
        await client.query(
            'INSERT INTO financial_ledger (entry_date, concept, income) VALUES (CURRENT_DATE, $1, $2)',
            [`Venta (ID: ${saleId}) con ${discount}% desc.`, finalAmountWithDiscount]
        );
        
        await client.query('COMMIT');
        
        await logAction(userId, `Registró una venta (ID: ${saleId}) por un total de ${total_amount} con ${discount}% de descuento.`);

        res.status(201).json({ msg: 'Venta creada exitosamente', saleId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al crear la venta:", error);
        res.status(500).json({ msg: 'Error al procesar la venta' });
    } finally {
        client.release();
    }
};

module.exports = { getSales, getSaleById, createSale };