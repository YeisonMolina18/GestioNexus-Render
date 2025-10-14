const pool = require('../db/database');

const getMetrics = async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        let dateClause = '';
        let dateParams = [];
        // --- CORRECCIÓN: Se construye la cláusula WHERE y los parámetros para PostgreSQL ---
        if (startDate && endDate) {
            dateClause = 'WHERE entry_date BETWEEN $1 AND $2';
            dateParams = [`${startDate} 00:00:00`, `${endDate} 23:59:59`];
        }
        
        // 1. Resumen Financiero del Libro Contable (Ingresos y Egresos)
        const { rows: [financialSummary] } = await pool.query(
            `SELECT 
                COALESCE(SUM(income), 0) as "totalIncome",
                COALESCE(SUM(expense), 0) as "totalExpense"
             FROM financial_ledger 
             ${dateClause.replace('entry_date', 'entry_date')}`, // Re-usa la cláusula de fecha
            dateParams
        );

        // 2. Conteo de Ventas
        const { rows: [{ salesCount }] } = await pool.query(
            `SELECT COUNT(*) as "salesCount" FROM sales ${dateClause.replace('entry_date', 'created_at')}`,
            dateParams
        );

        // 3. Gráfico de Ingresos
        const { rows: incomeData } = await pool.query(
            `SELECT 
                DATE(entry_date) as sale_date,
                SUM(income) as daily_total
             FROM financial_ledger
             ${dateClause.replace('entry_date', 'entry_date')}
             GROUP BY sale_date
             ORDER BY sale_date ASC;`,
            dateParams
        );
        
        // 4. Ranking de Empleados
        // --- CORRECCIÓN: Se añade u.full_name al GROUP BY ---
        const { rows: employeeRanking } = await pool.query(
            `SELECT u.full_name, COUNT(s.id) as sales_count, SUM(s.total_amount * (1 - s.discount / 100)) as total_sold
             FROM sales s JOIN users u ON s.user_id = u.id
             ${dateClause.replace('entry_date', 's.created_at')} 
             GROUP BY s.user_id, u.full_name 
             ORDER BY total_sold DESC;`,
            dateParams
        );

        // 5. Ranking de Productos por Cantidad
        const { rows: productRankingByQuantity } = await pool.query(
            `SELECT p.name, SUM(sd.quantity) as total_quantity_sold
             FROM sale_details sd JOIN sales s ON sd.sale_id = s.id JOIN products p ON sd.product_id = p.id
             ${dateClause.replace('entry_date', 's.created_at')} 
             GROUP BY sd.product_id, p.name 
             ORDER BY total_quantity_sold DESC LIMIT 10;`,
            dateParams
        );

        // 6. Productos más rentables
        const { rows: mostProfitableProducts } = await pool.query(
            `SELECT p.name, SUM((sd.unit_price - sd.unit_cost) * sd.quantity) as total_profit
             FROM sale_details sd JOIN sales s ON sd.sale_id = s.id JOIN products p ON sd.product_id = p.id
             ${dateClause.replace('entry_date', 's.created_at')} 
             GROUP BY sd.product_id, p.name 
             HAVING SUM((sd.unit_price - sd.unit_cost) * sd.quantity) > 0 
             ORDER BY total_profit DESC LIMIT 10;`,
            dateParams
        );

        // 7. Productos estancados (sin ventas)
        const { rows: stagnantProducts } = await pool.query(
            `SELECT p.name, p.quantity as stock, p.cost, p.price
             FROM products p 
             LEFT JOIN sale_details sd ON p.id = sd.product_id
             WHERE sd.product_id IS NULL AND p.is_active = TRUE;`
        );
        
        const totalIncome = financialSummary.totalIncome || 0;
        const totalExpense = financialSummary.totalExpense || 0;
        const netProfit = totalIncome - totalExpense;

        res.json({
            totalIncome: totalIncome,
            salesCount: salesCount || 0,
            grossProfit: netProfit,
            salesData: incomeData,
            employeeRanking,
            productRankingByQuantity,
            mostProfitableProducts,
            stagnantProducts
        });

    } catch (error) {
        console.error("Error al obtener las métricas:", error);
        res.status(500).json({ msg: 'Error al procesar las métricas' });
    }
};

module.exports = {
    getMetrics
};