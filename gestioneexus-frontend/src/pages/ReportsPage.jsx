import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';
import Modal from '../components/Modal';
import FinancialEntryForm from '../components/FinancialEntryForm';
import Pagination from '../components/Pagination';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

const SummaryCard = ({ title, value, colorClass }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
        <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
);

const ReportsPage = () => {
    const [entries, setEntries] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0 });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [filters, setFilters] = useState({
        search: '',
        startDate: '',
        endDate: '',
    });
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const today = new Date().toISOString().slice(0, 10);

    useEffect(() => {
        fetchLedger(1, filters);
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const fetchLedger = (page = 1, currentFilters = filters) => {
        setLoading(true);
        setCurrentPage(page);
        api.get('/reports/financial-ledger', { params: { ...currentFilters, page } })
            .then(response => {
                setEntries(response.data.entries);
                setSummary(response.data.summary);
                setTotalPages(response.data.totalPages);
            })
            .catch(err => Swal.fire('Error', 'No se pudieron cargar los reportes.', 'error'))
            .finally(() => setLoading(false));
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchLedger(1, filters);
    };

    const handleEntryAdded = () => {
        fetchLedger(currentPage, filters);
    };

    const handleGenerateReport = async () => {
        const { value: format } = await Swal.fire({
            title: 'Generar Reporte',
            text: '¿En qué formato deseas generar el reporte?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'PDF',
            showDenyButton: true,
            denyButtonText: 'Excel',
            confirmButtonColor: '#D33',
            denyButtonColor: '#16A34A',
            cancelButtonText: 'Cancelar'
        });

        if (format) { // PDF
            generatePdf();
        } else if (format === false) { // Excel
            downloadExcel();
        }
    };
    
    const generatePdf = async () => {
        try {
            const { data } = await api.get('/reports/financial-ledger', { params: { ...filters, limit: 10000 } });
            const allEntries = data.entries;
            const reportSummary = data.summary;

            if (allEntries.length === 0) {
                Swal.fire('Vacío', 'No hay datos para generar el reporte con los filtros seleccionados.', 'info');
                return;
            }

            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Reporte Financiero - Variedades Cinthya", 14, 22);
            
            const tableColumn = ["Fecha", "Concepto", "Ingresos", "Egresos"];
            const tableRows = allEntries.map(entry => [
                formatDate(entry.entry_date),
                entry.concept,
                formatCurrency(entry.income),
                formatCurrency(entry.expense)
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 30,
                headStyles: { fillColor: [93, 18, 39] },
                foot: [
                    ['', 'TOTALES', formatCurrency(reportSummary.totalIncome), formatCurrency(reportSummary.totalExpense)],
                    ['', 'BALANCE NETO', { content: formatCurrency(reportSummary.netBalance), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }]
                ],
                footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0 },
            });

            doc.save(`reporte-financiero-${new Date().toISOString().slice(0,10)}.pdf`);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron obtener los datos para el PDF.', 'error');
        }
    };

    const downloadExcel = async () => {
        try {
            const { data } = await api.get('/reports/financial-ledger', { params: { ...filters, limit: 10000 } });
            const allEntries = data.entries;
            const reportSummary = data.summary;

            if (allEntries.length === 0) {
                Swal.fire('Vacío', 'No hay datos para generar el reporte con los filtros seleccionados.', 'info');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte Financiero');

            worksheet.columns = [
                { header: 'Fecha', key: 'date', width: 15 },
                { header: 'Concepto', key: 'concept', width: 50 },
                { header: 'Ingresos', key: 'income', width: 20, style: { numFmt: '"$"#,##0' } },
                { header: 'Egresos', key: 'expense', width: 20, style: { numFmt: '"$"#,##0' } }
            ];

            allEntries.forEach(entry => {
                worksheet.addRow({
                    date: new Date(entry.entry_date),
                    concept: entry.concept,
                    income: parseFloat(entry.income),
                    expense: parseFloat(entry.expense)
                });
            });

            worksheet.addRow({});
            const totalsRow = worksheet.addRow(['', 'TOTALES', parseFloat(reportSummary.totalIncome), parseFloat(reportSummary.totalExpense)]);
            totalsRow.font = { bold: true };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte-financiero-${new Date().toISOString().slice(0, 10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo generar el reporte en Excel.', 'error');
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0);

    // --- FUNCIÓN CORREGIDA ---
    const formatDate = (dateString) => {
        // Esta función previene la conversión de zona horaria al tomar solo la parte de la fecha (YYYY-MM-DD)
        const [datePart] = dateString.split('T');
        const [year, month, day] = datePart.split('-');
        // Se formatea a DD/MM/YYYY para la visualización en la tabla
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Reporte Financiero</h1>
            
            <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-4 gap-4 items-end border">
                <div>
                    <label htmlFor="search" className="text-sm font-medium text-gray-700">Concepto / ID Venta</label>
                    <input type="text" id="search" name="search" placeholder="Buscar..." value={filters.search} onChange={handleFilterChange} className="w-full mt-1 p-2 border rounded-md" />
                </div>
                <div>
                    <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Fecha Inicio</label>
                    <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} max={today} className="w-full mt-1 p-2 border rounded-md" />
                </div>
                <div>
                    <label htmlFor="endDate" className="text-sm font-medium text-gray-700">Fecha Fin</label>
                    <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} max={today} className="w-full mt-1 p-2 border rounded-md" />
                </div>
                <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 h-10">Filtrar</button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard title="Total Ingresos" value={formatCurrency(summary.totalIncome)} colorClass="text-green-600" />
                <SummaryCard title="Total Egresos" value={formatCurrency(summary.totalExpense)} colorClass="text-red-600" />
                <SummaryCard title="Saldo Neto (Ganancia / Pérdida)" value={formatCurrency(summary.netBalance)} colorClass={summary.netBalance >= 0 ? "text-blue-600" : "text-red-600"}/>
            </div>

            <div className="flex justify-end items-center gap-4">
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">
                    + Añadir Movimiento
                </button>
                <button onClick={handleGenerateReport} className="bg-[#16A34A] text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">
                    + Generar Reporte
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                <h3 className="font-bold text-lg text-gray-800 mb-4">HISTORIAL DE MOVIMIENTOS</h3>
                {loading ? <div className="text-center py-8">Cargando...</div> : 
                entries.length > 0 ? (
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-white uppercase bg-[#5D1227]">
                            <tr>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Concepto</th>
                                <th className="px-6 py-3">Ingresos</th>
                                <th className="px-6 py-3">Egresos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr key={entry.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">{formatDate(entry.entry_date)}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{entry.concept}</td>
                                    <td className="px-6 py-4 text-green-600 font-semibold">{formatCurrency(entry.income)}</td>
                                    <td className="px-6 py-4 text-red-600 font-semibold">{formatCurrency(entry.expense)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <div className="text-center py-8 text-gray-500">No hay entradas para los filtros seleccionados.</div> }
                
                <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={(page) => fetchLedger(page, filters)} 
                />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Movimiento">
                <FinancialEntryForm onEntryAdded={handleEntryAdded} closeModal={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default ReportsPage;