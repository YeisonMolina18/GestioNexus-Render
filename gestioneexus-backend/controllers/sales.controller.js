const pool = require('../db/database');

const getDashboardStats = async (req, res) => {
    try {
        // --- CORRECCIÓN: Using { rows } to get results and accessing the first item. ---
        // Also, using quotes for aliases to preserve capitalization.

        // Total count of active products
        const { rows: productRows } = await pool.query('SELECT COUNT(*) AS "productCount" FROM products WHERE is_active = TRUE');
        const productCount = productRows[0].productCount;

        // Total count of sales
        const { rows: salesRows } = await pool.query('SELECT COUNT(*) AS "salesCount" FROM sales');
        const salesCount = salesRows[0].salesCount;

        // Total count of active users
        const { rows: userRows } = await pool.query('SELECT COUNT(*) AS "userCount" FROM users WHERE is_active = TRUE');
        const userCount = userRows[0].userCount;

        // Top 5 best-selling products
        const { rows: topProducts } = await pool.query(`
            SELECT p.name, p.quantity as stock, SUM(sd.quantity) as "totalSold"
            FROM sale_details sd
            JOIN products p ON sd.product_id = p.id
            GROUP BY p.id, p.name, p.quantity
            ORDER BY "totalSold" DESC
            LIMIT 5;
        `);

        // Last 5 sales
        const { rows: recentSales } = await pool.query(`
            SELECT p.name as "productName", s.created_at, (sd.quantity * sd.unit_price) as "saleTotal"
            FROM sale_details sd
            JOIN sales s ON sd.sale_id = s.id
            JOIN products p ON sd.product_id = p.id
            ORDER BY s.created_at DESC
            LIMIT 5;
        `);

        res.json({
            userCount,
            productCount,
            salesCount,
            topProducts,
            recentSales
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ msg: 'Error fetching dashboard statistics' });
    }
};

module.exports = {
    getDashboardStats
};