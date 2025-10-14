const pool = require('../db/database');

const getLogs = async (req, res) => {
    // 1. Se obtienen los parámetros de la consulta
    const { page = 1, limit = 15, search = '', month, year } = req.query;
    const offset = (page - 1) * limit;

    try {
        const searchTerm = `%${search}%`;
        
        // 2. Se construyen la consulta y los parámetros dinámicamente para PostgreSQL
        let conditions = ['(u.full_name ILIKE $1 OR l.action ILIKE $2)'];
        let params = [searchTerm, searchTerm];
        let paramIndex = 3; // El contador para los siguientes parámetros

        if (month) {
            // --- CORRECCIÓN: Se usa EXTRACT(MONTH FROM ...) para PostgreSQL ---
            conditions.push(`EXTRACT(MONTH FROM l.created_at) = $${paramIndex++}`);
            params.push(parseInt(month));
        }
        if (year) {
            // --- CORRECCIÓN: Se usa EXTRACT(YEAR FROM ...) para PostgreSQL ---
            conditions.push(`EXTRACT(YEAR FROM l.created_at) = $${paramIndex++}`);
            params.push(parseInt(year));
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        // 3. Se ejecuta la consulta principal con los nuevos filtros
        const queryParams = [...params, parseInt(limit), parseInt(offset)];
        const { rows: logs } = await pool.query(`
            SELECT 
                l.id, l.action, l.created_at, u.full_name as user_name
            FROM audit_logs l
            JOIN users u ON l.user_id = u.id
            ${whereClause}
            ORDER BY l.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `, queryParams);

        // 4. Se ejecuta la consulta de conteo con los mismos filtros
        const { rows: [{ total }] } = await pool.query(
            `SELECT COUNT(*) as total 
             FROM audit_logs l
             JOIN users u ON l.user_id = u.id
             ${whereClause}`,
            params
        );
        
        res.json({
            logs,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
        });

    } catch (error) {
        console.error("Error al obtener los logs de auditoría:", error);
        res.status(500).json({ msg: 'Error al obtener los registros de auditoría' });
    }
};

module.exports = {
    getLogs
};