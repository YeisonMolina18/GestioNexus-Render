const pool = require('../db/database');
const { logAction } = require('../helpers/audit.helper');

const getLayawayPlans = async (req, res) => {
    const { search = '', status = 'active' } = req.query;
    try {
        // --- CORRECCIÓN: CURDATE() cambiado a CURRENT_DATE ---
        await pool.query("UPDATE layaway_plans SET status = 'overdue' WHERE deadline < CURRENT_DATE AND status = 'active'");
        
        const searchTerm = `%${search}%`;
        const queryParams = [searchTerm, searchTerm];
        let paramIndex = 3;
        
        // --- CORRECCIÓN: Placeholders '?' cambiados a '$1', '$2', etc. y LIKE por ILIKE ---
        let query = 'SELECT * FROM layaway_plans WHERE (customer_name ILIKE $1 OR customer_id_doc ILIKE $2)';
        
        if (status && status !== 'all') {
            query += ` AND status = $${paramIndex++}`;
            queryParams.push(status);
        }
        query += ' ORDER BY created_at DESC';
        
        // --- CORRECCIÓN: Se desestructura { rows: plans } ---
        const { rows: plans } = await pool.query(query, queryParams);
        res.json(plans);
    } catch (error) {
        console.error("Error al obtener planes separe:", error);
        res.status(500).json({ msg: 'Error al obtener los planes separe' });
    }
};

const getLayawayPlanById = async (req, res) => {
    const { id } = req.params;
    try {
        // --- CORRECCIÓN: Se usa $1 y se desestructura { rows: [plan] } ---
        const { rows: [plan] } = await pool.query('SELECT * FROM layaway_plans WHERE id = $1', [id]);
        if (!plan) {
            return res.status(404).json({ msg: 'Plan separe no encontrado' });
        }

        // --- CORRECCIÓN: Se usa $1 y { rows: products } ---
        const { rows: products } = await pool.query(
            `SELECT 
                d.quantity, 
                p.price as price_at_sale, 
                p.name as product_name, 
                p.id as product_id,
                p.sizes as product_sizes
             FROM layaway_plan_details d 
             JOIN products p ON d.product_id = p.id 
             WHERE d.layaway_plan_id = $1`,
            [id]
        );

        res.json({ ...plan, products: products });
    } catch (error) {
        console.error("Error al obtener el detalle del plan separe:", error);
        res.status(500).json({ msg: 'Error al obtener el detalle del plan' });
    }
};

const createLayawayPlan = async (req, res) => {
    const { customer_name, customer_id_doc, customer_contact, total_value, down_payment, deadline, products } = req.body;
    const balance_due = total_value - down_payment;
    
    // --- CORRECCIÓN: Manejo de transacciones para 'pg' ---
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Iniciar transacción

        for (const product of products) {
            // --- CORRECCIÓN: Se usa $1 y { rows: [dbProduct] } ---
            const { rows: [dbProduct] } = await client.query('SELECT quantity, name FROM products WHERE id = $1 FOR UPDATE', [product.product_id]);
            if (!dbProduct || dbProduct.quantity < product.quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: `Stock insuficiente para el producto: ${dbProduct.name}` });
            }
        }

        // --- CORRECCIÓN: Se usa $1..$7 y RETURNING id ---
        const planResult = await client.query(
            'INSERT INTO layaway_plans (customer_name, customer_id_doc, customer_contact, total_value, down_payment, balance_due, deadline) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [customer_name, customer_id_doc, customer_contact, total_value, down_payment, balance_due, deadline]
        );
        // --- CORRECCIÓN: Se obtiene el ID de result.rows[0].id ---
        const planId = planResult.rows[0].id;

        for (const product of products) {
            await client.query(
                'INSERT INTO layaway_plan_details (layaway_plan_id, product_id, quantity) VALUES ($1, $2, $3)',
                [planId, product.product_id, product.quantity]
            );
        }

        if (down_payment > 0) {
            // --- CORRECCIÓN: CURDATE() cambiado a CURRENT_DATE ---
            await client.query(
                'INSERT INTO financial_ledger (entry_date, concept, income) VALUES (CURRENT_DATE, $1, $2)',
                [`Abono inicial Plan Separe #${planId} - ${customer_name}`, down_payment]
            );
        }

        await client.query('COMMIT'); // Confirmar transacción
        
        const { rows: [newPlan] } = await pool.query('SELECT * FROM layaway_plans WHERE id = $1', [planId]);
        await logAction(req.uid, `Creó un plan separe (ID: ${planId}) para el cliente ${customer_name}`);
        res.status(201).json(newPlan[0]);
    } catch (error) {
        await client.query('ROLLBACK'); // Deshacer en caso de error
        console.error("Error al crear plan separe:", error);
        res.status(500).json({ msg: 'Error al crear el plan separe', error });
    } finally {
        client.release(); // Liberar cliente al pool
    }
};

const updateLayawayPlan = async (req, res) => {
    const { id } = req.params;
    const { uid } = req;
    const { new_payment_amount } = req.body;
    
    // --- CORRECCIÓN: Transacción ---
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        // --- CORRECCIÓN: $1 y { rows: [plan] } ---
        const { rows: [plan] } = await client.query('SELECT * FROM layaway_plans WHERE id = $1 FOR UPDATE', [id]);
        if (!plan) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Plan separe no encontrado' });
        }
        
        if (new_payment_amount && !isNaN(new_payment_amount)) {
            const payment = parseFloat(new_payment_amount);
            let { down_payment, balance_due, customer_name } = plan;

            down_payment = parseFloat(down_payment) + payment;
            balance_due = parseFloat(balance_due) - payment;
            let newStatus = plan.status;

            if (balance_due <= 0) {
                newStatus = 'completed';
                balance_due = 0;
            }

            await client.query(
                'UPDATE layaway_plans SET down_payment = $1, balance_due = $2, status = $3 WHERE id = $4',
                [down_payment, balance_due, newStatus, id]
            );

            // --- CORRECCIÓN: CURDATE() a CURRENT_DATE ---
            await client.query(
                'INSERT INTO financial_ledger (entry_date, concept, income) VALUES (CURRENT_DATE, $1, $2)',
                [`Abono a Plan Separe #${id} - ${customer_name}`, payment]
            );
        }

        const { rows: [updatedPlan] } = await client.query('SELECT * FROM layaway_plans WHERE id = $1', [id]);
        await client.query('COMMIT');
        
        await logAction(uid, `Actualizó el plan separe (ID: ${id}) con un abono.`);
        res.json(updatedPlan);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al actualizar el plan:", error);
        res.status(500).json({ msg: 'Error al actualizar el plan' });
    } finally {
        client.release();
    }
};

const deleteLayawayPlan = async (req, res) => {
    const { id } = req.params;
    const { uid } = req;
    
    // --- CORRECIÓN: Transacción ---
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // NOTA: Tu trigger 'after_layawaydetail_delete' ya devuelve el stock
        await client.query('DELETE FROM layaway_plan_details WHERE layaway_plan_id = $1', [id]);
        await client.query('DELETE FROM layaway_plans WHERE id = $1', [id]);
        await client.query('COMMIT');
        
        await logAction(uid, `Eliminó/Canceló el plan separe (ID: ${id})`);
        res.json({ msg: 'Plan separe eliminado y stock devuelto.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al eliminar plan separe:", error);
        res.status(500).json({ msg: 'Error al eliminar el plan separe' });
    } finally {
        client.release();
    }
};

module.exports = {
    getLayawayPlans,
    getLayawayPlanById,
    createLayawayPlan,
    updateLayawayPlan,
    deleteLayawayPlan
};