const pool = require('../db/database');

const logAction = async (userId, action) => {
    try {
        if (!userId) {
            console.error('Intento de registrar acción sin userId.');
            return;
        }
        // --- CORRECTION: Using $1, $2 placeholders for PostgreSQL ---
        await pool.query('INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)', [userId, action]);
    } catch (error) {
        // This will now show a clear error in your Render logs if something else is wrong
        console.error('Error al registrar la acción de auditoría:', error);
    }
};

module.exports = { 
    logAction 
};