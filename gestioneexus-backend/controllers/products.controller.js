const pool = require('../db/database');
const { logAction } = require('../helpers/audit.helper');

// --- NUEVA FUNCIÓN PARA OBTENER MARCAS ÚNICAS ---
const getUniqueBrands = async (req, res) => {
    try {
        // --- CORRECCIÓN: Se usa { rows } ---
        const { rows: brands } = await pool.query(
            'SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != \'\' ORDER BY brand ASC'
        );
        res.json(brands.map(b => b.brand));
    } catch (error) {
        console.error("Error al obtener marcas:", error);
        res.status(500).json({ msg: 'Error al obtener las marcas' });
    }
};

const getProducts = async (req, res) => {
    const { search = '', page = 1, limit = 15 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const searchTerm = `%${search}%`;
        // --- CORRECCIÓN: Placeholders $1, $2, etc. y { rows: products } ---
        const { rows: products } = await pool.query(
            'SELECT * FROM products WHERE is_active = TRUE AND (name ILIKE $1 OR reference ILIKE $2) ORDER BY name ASC LIMIT $3 OFFSET $4',
            [searchTerm, searchTerm, parseInt(limit), parseInt(offset)]
        );

        // --- CORRECCIÓN: Se obtiene el total correctamente ---
        const { rows: totalRows } = await pool.query(
            'SELECT COUNT(*) as total FROM products WHERE is_active = TRUE AND (name ILIKE $1 OR reference ILIKE $2)',
            [searchTerm, searchTerm]
        );
        const total = totalRows[0].total;
        
        res.json({
            products,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ msg: 'Error al obtener los productos', error });
    }
};

const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        // --- CORRECCIÓN ---
        const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (rows.length <= 0) {
            return res.status(404).json({ msg: 'Producto no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener el producto', error });
    }
};

const getProductByReference = async (req, res) => {
    const { ref } = req.params;
    try {
        // --- CORRECCIÓN ---
        const { rows } = await pool.query('SELECT * FROM products WHERE reference = $1 AND is_active = TRUE', [ref]);
        
        if (rows.length <= 0) {
            return res.status(404).json({ msg: 'Producto no encontrado, está inactivo o sin stock.' });
        }
        res.json(rows);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener el producto', error });
    }
};

const createProduct = async (req, res) => {
    const { name, reference, category, sizes, brand, quantity, price, cost } = req.body;
    try {
        // --- CORRECCIÓN ---
        const { rows: existingRows } = await pool.query(
            'SELECT id, is_active FROM products WHERE reference = $1 AND sizes = $2',
            [reference, sizes]
        );

        if (existingRows.length > 0) {
            const existingProduct = existingRows[0];
            if (existingProduct.is_active) {
                return res.status(400).json({ msg: `Ya existe un producto activo con la referencia '${reference}' y la talla '${sizes}'.` });
            }

            await pool.query(
                'UPDATE products SET name = $1, category = $2, brand = $3, quantity = $4, price = $5, cost = $6, is_active = TRUE WHERE id = $7',
                [name, category, brand, quantity, price, cost, existingProduct.id]
            );
            
            await logAction(req.uid, `Reactivó y actualizó el producto '${name}' (ID: ${existingProduct.id})`);
            const { rows: updatedProductRows } = await pool.query('SELECT * FROM products WHERE id = $1', [existingProduct.id]);
            return res.status(200).json(updatedProductRows[0]);
        }

        // --- CORRECCIÓN: Se usa RETURNING id para obtener el nuevo ID ---
        const result = await pool.query(
            'INSERT INTO products (name, reference, category, sizes, brand, quantity, price, cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [name, reference, category, sizes, brand, quantity, price, cost]
        );
        const newProductId = result.rows[0].id;
        
        await logAction(req.uid, `Creó el producto '${name}' (Ref: ${reference}, Talla: ${sizes}, ID: ${newProductId})`);
        const { rows: newProductRows } = await pool.query('SELECT * FROM products WHERE id = $1', [newProductId]);
        res.status(201).json(newProductRows[0]);

    } catch (error) {
        console.error("Error al crear/actualizar producto:", error);
        res.status(500).json({ msg: 'Error al procesar la solicitud del producto', error });
    }
};

const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, reference, category, sizes, brand, quantity, price, cost } = req.body;
    try {
        // --- CORRECCIÓN ---
        await pool.query(
            'UPDATE products SET name = $1, reference = $2, category = $3, sizes = $4, brand = $5, quantity = $6, price = $7, cost = $8 WHERE id = $9',
            [name, reference, category, sizes, brand, quantity, price, cost, id]
        );
        const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        await logAction(req.uid, `Actualizó el producto '${name}' (ID: ${id})`);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ msg: 'Error al actualizar el producto', error });
    }
};

const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        // --- CORRECCIÓN ---
        await pool.query('UPDATE products SET is_active = FALSE WHERE id = $1', [id]);
        await logAction(req.uid, `Desactivó el producto con ID: ${id}`);
        res.json({ msg: 'Producto desactivado correctamente' });
    } catch (error) {
        console.error("Error al desactivar producto:", error);
        res.status(500).json({ msg: 'Error al desactivar el producto' });
    }
};

const bulkImportProducts = async (req, res) => {
    const { products } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ msg: 'No se proporcionaron productos válidos para importar.' });
    }
    
    // --- CORRECCIÓN: Lógica de transacciones y bucle para inserción masiva en PostgreSQL ---
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const p of products) {
            await client.query(
                'INSERT INTO products (name, brand, category, sizes, reference, quantity, price, cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [p.NOMBRE, p.MARCA, p.CATEGORIA, p.TALLAS, p.REFERENCIA, p.CANTIDAD, p.PRECIO, p.COSTO]
            );
        }
        
        await client.query('COMMIT');
        
        await logAction(req.uid, `Importó masivamente ${products.length} productos desde un archivo Excel.`);
        
        res.status(201).json({ msg: `${products.length} productos han sido importados exitosamente.` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en la importación masiva:', error);
        // --- CORRECCIÓN: Código de error para duplicados en PostgreSQL ---
        if (error.code === '23505') {
            return res.status(400).json({ msg: 'El archivo contiene una o más referencias de producto que ya existen.' });
        }
        res.status(500).json({ msg: 'Ocurrió un error en el servidor durante la importación.' });
    } finally {
        client.release();
    }
};

module.exports = {
    getProducts,
    getProductById,
    getProductByReference,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkImportProducts,
    getUniqueBrands
};