const pool = require('../db/database');
const { logAction } = require('../helpers/audit.helper');

const getSuppliers = async (req, res) => {
    try {
        // --- CORRECCIÓN: Se usa { rows: suppliers } para obtener el resultado ---
        const { rows: suppliers } = await pool.query('SELECT * FROM suppliers ORDER BY company_name ASC');
        res.json(suppliers);
    } catch (error) {
        console.error("Error al obtener proveedores:", error);
        res.status(500).json({ msg: 'Error al obtener los proveedores' });
    }
};

const createSupplier = async (req, res) => {
    const { company_name, contact_person, contact_number, email, address, nit } = req.body;
    try {
        // --- CORRECCIÓN: Se usan placeholders $1, $2, etc., y RETURNING id ---
        const result = await pool.query(
            'INSERT INTO suppliers (company_name, contact_person, contact_number, email, address, nit) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [company_name, contact_person, contact_number, email, address, nit]
        );
        const newSupplierId = result.rows[0].id;

        await logAction(req.uid, `Creó el proveedor '${company_name}' (ID: ${newSupplierId})`);
        
        const { rows: [newSupplier] } = await pool.query('SELECT * FROM suppliers WHERE id = $1', [newSupplierId]);
        res.status(201).json(newSupplier);
    } catch (error) {
        console.error("Error al crear proveedor:", error);
        // --- CORRECCIÓN: El código de error de duplicado en PostgreSQL es '23505' ---
        if (error.code === '23505') { // 23505 es unique_violation
            return res.status(400).json({ msg: 'El NIT del proveedor ya existe.' });
        }
        res.status(500).json({ msg: 'Error al crear el proveedor', error });
    }
};

const updateSupplier = async (req, res) => {
    const { id } = req.params;
    const { company_name, contact_person, contact_number, email, address, nit } = req.body;
    try {
        // --- CORRECCIÓN: Se usan placeholders $1, $2, etc. ---
        await pool.query(
            'UPDATE suppliers SET company_name = $1, contact_person = $2, contact_number = $3, email = $4, address = $5, nit = $6 WHERE id = $7',
            [company_name, contact_person, contact_number, email, address, nit, id]
        );

        const { rows: [updatedSupplier] } = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);
        await logAction(req.uid, `Actualizó el proveedor '${company_name}' (ID: ${id})`);
        res.json(updatedSupplier);
    } catch (error) {
        console.error("Error al actualizar proveedor:", error);
        res.status(500).json({ msg: 'Error al actualizar el proveedor', error });
    }
};

const deleteSupplier = async (req, res) => {
    const { id } = req.params;
    try {
        // --- CORRECCIÓN: Se usa $1 ---
        await pool.query('DELETE FROM suppliers WHERE id = $1', [id]);
        await logAction(req.uid, `Eliminó el proveedor con ID: ${id}`);
        res.json({ msg: 'Proveedor eliminado' });
    } catch (error) {
        console.error("Error al eliminar proveedor:", error);
        res.status(500).json({ msg: 'Error al eliminar el proveedor', error });
    }
};

module.exports = { getSuppliers, createSupplier, updateSupplier, deleteSupplier };