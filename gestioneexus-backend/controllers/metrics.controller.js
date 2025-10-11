const pool = require('../db/database');

const getMetrics = async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        // Parámetros para filtrar por fecha. Se usarán en múltiples consultas.
        let dateParams = [];
        if (startDate && endDate) {
            dateParams = [`${startDate} 00:00:00`, `${endDate} 23:59:59`];
        }

        // --- LÓGICA DE MÉTRICAS CORREGIDA Y REFACTORIZADA ---

        // 1. Resumen Financiero del Libro Contable (Ingresos y Egresos)
        const [[financialSummary]] = await pool.query(
            `SELECT 
                SUM(income) as totalIncome,
                SUM(expense) as totalExpense
            FROM financial_ledger 
            ${dateParams.length > 0 ? 'WHERE entry_date BETWEEN ? AND ?' : ''}`,
            dateParams
        );

        // 2. Conteo de Ventas (sigue siendo una métrica útil)
        const [[{ salesCount }]] = await pool.query(
            `SELECT COUNT(*) as salesCount FROM sales ${dateParams.length > 0 ? 'WHERE created_at BETWEEN ? AND ?' : ''}`,
            dateParams
        );

        // 3. Gráfico de Ingresos (lee del libro contable unificado)
        const [incomeData] = await pool.query(
            `SELECT 
                DATE(entry_date) as sale_date,
                SUM(income) as daily_total
            FROM financial_ledger
            ${dateParams.length > 0 ? 'WHERE entry_date BETWEEN ? AND ?' : ''}
            GROUP BY sale_date
            ORDER BY sale_date ASC;`,
            dateParams
        );
        
        // Las métricas de ranking siguen basándose en ventas, lo cual es correcto
        const [employeeRanking] = await pool.query(
            `SELECT u.full_name, COUNT(s.id) as sales_count, SUM(s.total_amount * (1 - s.discount / 100)) as total_sold
            FROM sales s JOIN users u ON s.user_id = u.id
            ${dateParams.length > 0 ? 'WHERE s.created_at BETWEEN ? AND ?' : ''} GROUP BY s.user_id ORDER BY total_sold DESC;`,
            dateParams
        );

        const [productRankingByQuantity] = await pool.query(
            `SELECT p.name, SUM(sd.quantity) as total_quantity_sold
            FROM sale_details sd JOIN sales s ON sd.sale_id = s.id JOIN products p ON sd.product_id = p.id
            ${dateParams.length > 0 ? 'WHERE s.created_at BETWEEN ? AND ?' : ''} GROUP BY sd.product_id ORDER BY total_quantity_sold DESC LIMIT 10;`,
            dateParams
        );

        const [mostProfitableProducts] = await pool.query(
            `SELECT p.name, SUM((sd.unit_price - sd.unit_cost) * sd.quantity) as total_profit
            FROM sale_details sd JOIN sales s ON sd.sale_id = s.id JOIN products p ON sd.product_id = p.id
            ${dateParams.length > 0 ? 'WHERE s.created_at BETWEEN ? AND ?' : ''} GROUP BY sd.product_id HAVING total_profit > 0 ORDER BY total_profit DESC LIMIT 10;`,
            dateParams
        );

        const [stagnantProducts] = await pool.query(
            `SELECT p.name, p.quantity as stock, p.cost, p.price
            FROM products p LEFT JOIN sale_details sd ON p.id = sd.product_id
            WHERE sd.product_id IS NULL AND p.is_active = TRUE;`
        );
        
        // --- CORRECCIÓN FINAL EN LA RESPUESTA ---
        // Calculamos la Ganancia Neta y la enviamos como 'grossProfit' para que el frontend la muestre.
        const totalIncome = financialSummary.totalIncome || 0;
        const totalExpense = financialSummary.totalExpense || 0;
        const netProfit = totalIncome - totalExpense;

        res.json({
            totalIncome: totalIncome,
            salesCount: salesCount || 0,
            grossProfit: netProfit, // <-- ¡Este es el cambio clave! Ahora es Ganancia Neta.
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