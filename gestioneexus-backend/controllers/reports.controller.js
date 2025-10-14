// Se importa la función para registrar en la auditoría
const { logAction } = require('../helpers/audit.helper');
const pool = require('../db/database');
const ExcelJS = require('exceljs');
// Nota: jspdf y jspdf-autotable no se usan en este archivo, se pueden remover si no se usan en otro lado.

const getFinancialLedger = async (req, res) => {
    const { page = 1, limit = 15, startDate, endDate, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let baseQuery = 'FROM financial_ledger';
    const conditions = [];
    const params = [];
    let paramIndex = 1; // Contador para los placeholders de PostgreSQL

    // --- CORRECCIÓN: Se construyen los placeholders dinámicamente ($1, $2, etc.) ---
    if (startDate && endDate) {
        conditions.push(`entry_date BETWEEN $${paramIndex++} AND $${paramIndex++}`);
        params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }
    if (search) {
        conditions.push(`concept ILIKE $${paramIndex++}`);
        params.push(`%${search}%`);
    }
    if (conditions.length > 0) {
        baseQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    try {
        const queryParams = [...params, parseInt(limit), parseInt(offset)];
        // --- CORRECCIÓN: Se usan los nuevos placeholders y se obtiene el resultado con { rows } ---
        const { rows: entries } = await pool.query(
            `SELECT * ${baseQuery} ORDER BY entry_date DESC, id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`, 
            queryParams
        );

        const { rows: [{ total }] } = await pool.query(`SELECT COUNT(*) as total ${baseQuery}`, params);
        
        const { rows: [summary] } = await pool.query(`
            SELECT
                COALESCE(SUM(income), 0) as "totalIncome",
                COALESCE(SUM(expense), 0) as "totalExpense"
            ${baseQuery}
        `, params);

        res.json({
            entries,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            summary: {
                totalIncome: summary.totalIncome || 0,
                totalExpense: summary.totalExpense || 0,
                netBalance: (summary.totalIncome || 0) - (summary.totalExpense || 0)
            }
        });
    } catch (error) {
        console.error("Error al obtener el libro contable:", error);
        res.status(500).json({ msg: 'Error al obtener los reportes' });
    }
};

const createFinancialEntry = async (req, res) => {
    const { entry_date, concept, income, expense } = req.body;
    const userId = req.uid; 

    try {
        // --- CORRECCIÓN: Se usan placeholders $1, $2, etc. ---
        await pool.query(
            'INSERT INTO financial_ledger (entry_date, concept, income, expense) VALUES ($1, $2, $3, $4)',
            [entry_date, concept || null, income || 0, expense || 0]
        );

        let actionDetails = '';
        if (income > 0) {
            actionDetails = `Se registró un INGRESO por "${concept}" por un monto de ${income}.`;
        } else if (expense > 0) {
            actionDetails = `Se registró un EGRESO por "${concept}" por un monto de ${expense}.`;
        }

        if (actionDetails) {
            await logAction(userId, actionDetails);
        }

        res.status(201).json({ msg: 'Entrada contable creada' });
    } catch (error) {
        console.error("Error al registrar movimiento:", error);
        res.status(500).json({ msg: 'No se pudo registrar el movimiento.' });
    }
};

const exportLedgerToExcel = async (req, res) => {
    try {
        // --- CORRECCIÓN: Se obtiene el resultado con { rows } ---
        const { rows: ledgerData } = await pool.query('SELECT * FROM financial_ledger ORDER BY entry_date DESC, id DESC');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte Financiero');
        worksheet.columns = [
            { header: 'Fecha', key: 'date', width: 15 },
            { header: 'Concepto', key: 'concept', width: 40 },
            { header: 'Ingresos', key: 'income', width: 15, style: { numFmt: '"$"#,##0.00' } },
            { header: 'Egresos', key: 'expense', width: 15, style: { numFmt: '"$"#,##0.00' } },
        ];
        ledgerData.forEach(row => {
            worksheet.addRow({
                date: new Date(row.entry_date),
                concept: row.concept,
                income: parseFloat(row.income),
                expense: parseFloat(row.expense)
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte-financiero.xlsx');
        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
    } catch (error) {
        console.error("Error al generar el Excel:", error);
        res.status(500).json({ msg: 'Error al generar el reporte en Excel' });
    }
};

module.exports = { 
    getFinancialLedger, 
    createFinancialEntry, 
    exportLedgerToExcel 
};