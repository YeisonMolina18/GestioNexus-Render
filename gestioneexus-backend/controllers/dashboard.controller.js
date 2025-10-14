const pool = require('../db/database');

const getDashboardStats = async (req, res) => {
    try {
        // Conteo total de productos activos
        const { rows: productRows } = await pool.query('SELECT COUNT(*) AS "productCount" FROM products WHERE is_active = TRUE');
        const productCount = productRows[0].productCount;

        // Conteo total de ventas
        const { rows: salesRows } = await pool.query('SELECT COUNT(*) AS "salesCount" FROM sales');
        const salesCount = salesRows[0].salesCount;

        // Conteo total de usuarios activos
        const { rows: userRows } = await pool.query('SELECT COUNT(*) AS "userCount" FROM users WHERE is_active = TRUE');
        const userCount = userRows[0].userCount;

        // Productos más vendidos (Top 5)
        const { rows: topProducts } = await pool.query(`
            SELECT p.name, p.quantity as stock, SUM(sd.quantity) as "totalSold"
            FROM sale_details sd
            JOIN products p ON sd.product_id = p.id
            GROUP BY p.id, p.name, p.quantity
            ORDER BY "totalSold" DESC
            LIMIT 5;
        `);

        // Últimas ventas (Top 5)
        const { rows: recentSales } = await pool.query(`
            SELECT p.name as "productName", s.created_at, (sd.quantity * sd.unit_price) as "saleTotal"
            FROM sale_details sd
            JOIN sales s ON sd.sale_id = s.id
            JOIN products p ON sd.product_id = p.id
            ORDER BY s.created_at DESC
            LIMIT 5;
        `);

        res.json({
            userCount: userCount,
            productCount: productCount,
            salesCount: salesCount,
            topProducts,
            recentSales
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ msg: 'Error al obtener las estadísticas del dashboard' });
    }
};

module.exports = {
    getDashboardStats
};