const pool = require('../db/database');
const { logAction } = require('../helpers/audit.helper');

// --- NUEVA FUNCIÓN PARA OBTENER MARCAS ÚNICAS ---
const getUniqueBrands = async (req, res) => {
    try {
        const [brands] = await pool.query(
            'SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != "" ORDER BY brand ASC'
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
        const [products] = await pool.query(
            'SELECT * FROM products WHERE is_active = TRUE AND (name LIKE ? OR reference LIKE ?) ORDER BY name ASC LIMIT ? OFFSET ?',
            [searchTerm, searchTerm, parseInt(limit), parseInt(offset)]
        );

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM products WHERE is_active = TRUE AND (name LIKE ? OR reference LIKE ?)',
            [searchTerm, searchTerm]
        );
        
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
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
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
        const [rows] = await pool.query('SELECT * FROM products WHERE reference = ? AND is_active = TRUE', [ref]);
        
        if (rows.length <= 0) {
            return res.status(404).json({ msg: 'Producto no encontrado, está inactivo o sin stock.' });
        }
        res.json(rows);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener el producto', error });
    }
};

// --- FUNCIÓN 'createProduct' ACTUALIZADA CON LÓGICA DE REACTIVACIÓN ---
const createProduct = async (req, res) => {
    const { name, reference, category, sizes, brand, quantity, price, cost } = req.body;
    try {
        // 1. Buscamos si ya existe un producto con la misma referencia Y la misma talla.
        const [existingRows] = await pool.query(
            'SELECT id, is_active FROM products WHERE reference = ? AND sizes = ?',
            [reference, sizes]
        );

        if (existingRows.length > 0) {
            const existingProduct = existingRows[0];

            // 2a. Si el producto existe Y está ACTIVO, es un duplicado y lanzamos un error.
            if (existingProduct.is_active) {
                return res.status(400).json({ msg: `Ya existe un producto activo con la referencia '${reference}' y la talla '${sizes}'.` });
            }

            // 2b. Si el producto existe pero está INACTIVO, lo reactivamos y actualizamos.
            await pool.query(
                'UPDATE products SET name = ?, category = ?, brand = ?, quantity = ?, price = ?, cost = ?, is_active = TRUE WHERE id = ?',
                [name, category, brand, quantity, price, cost, existingProduct.id]
            );
            
            await logAction(req.uid, `Reactivó y actualizó el producto '${name}' (ID: ${existingProduct.id})`);
            const [updatedProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [existingProduct.id]);
            return res.status(200).json(updatedProduct[0]); // Usamos 200 OK para actualizaciones
        }

        // 3. Si el producto no existe, lo creamos como nuevo.
        const [result] = await pool.query(
            'INSERT INTO products (name, reference, category, sizes, brand, quantity, price, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, reference, category, sizes, brand, quantity, price, cost]
        );
        await logAction(req.uid, `Creó el producto '${name}' (Ref: ${reference}, Talla: ${sizes}, ID: ${result.insertId})`);
        const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        res.status(201).json(newProduct[0]);

    } catch (error) {
        console.error("Error al crear/actualizar producto:", error);
        res.status(500).json({ msg: 'Error al procesar la solicitud del producto', error });
    }
};


const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, reference, category, sizes, brand, quantity, price, cost } = req.body;
    try {
        await pool.query(
            'UPDATE products SET name = ?, reference = ?, category = ?, sizes = ?, brand = ?, quantity = ?, price = ?, cost = ? WHERE id = ?',
            [name, reference, category, sizes, brand, quantity, price, cost, id]
        );
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        await logAction(req.uid, `Actualizó el producto '${name}' (ID: ${id})`);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ msg: 'Error al actualizar el producto', error });
    }
};

const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE products SET is_active = FALSE WHERE id = ?', [id]);
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

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const query = 'INSERT INTO products (name, brand, category, sizes, reference, quantity, price, cost) VALUES ?';
        
        const values = products.map(p => [
            p.NOMBRE, p.MARCA, p.CATEGORIA, p.TALLAS, p.REFERENCIA,
            p.CANTIDAD, p.PRECIO, p.COSTO
        ]);

        const [result] = await connection.query(query, [values]);
        
        await connection.commit();
        
        await logAction(req.uid, `Importó masivamente ${result.affectedRows} productos desde un archivo Excel.`);
        
        res.status(201).json({ msg: `${result.affectedRows} productos han sido importados exitosamente.` });

    } catch (error) {
        await connection.rollback();
        console.error('Error en la importación masiva:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ msg: 'El archivo contiene una o más referencias de producto que ya existen.' });
        }
        res.status(500).json({ msg: 'Ocurrió un error en el servidor durante la importación.' });
    } finally {
        connection.release();
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