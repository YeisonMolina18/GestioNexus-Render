import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { format, startOfMonth, startOfYear, isValid, parseISO, getMonth, getYear, differenceInDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// --- Componentes Auxiliares ---
const MetricCard = ({ title, value, colorClass }) => (
    <div className="bg-white p-6 rounded-xl shadow-md text-center">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
        <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
);

const RankingTable = ({ headers, data, renderRow }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                    <th className="px-6 py-3">Pos.</th>
                    {headers.map((header, index) => (
                        <th key={index} className={`px-6 py-3 ${header.align || 'text-left'}`}>{header.label}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data && data.length > 0 ? data.map((item, index) => (
                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold">{index + 1}</td>
                        {renderRow(item)}
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={headers.length + 1} className="text-center py-8 text-gray-500">No hay datos para mostrar.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const FilterButton = ({ onClick, label, isActive }) => (
    <button onClick={onClick} className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${isActive ? 'bg-white shadow' : 'bg-transparent text-gray-600 hover:bg-white hover:bg-opacity-50'}`}>
        {label}
    </button>
);


// --- Componente Principal ---
const MetricsPage = () => {
    const [metrics, setMetrics] = useState({ 
        salesData: [], employeeRanking: [], productRankingByQuantity: [],
        mostProfitableProducts: [], stagnantProducts: [], grossProfit: 0,
        totalIncome: 0, salesCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [activeQuickFilter, setActiveQuickFilter] = useState('monthly');

    const initialStartDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const initialEndDate = format(new Date(), 'yyyy-MM-dd');

    const [dateRange, setDateRange] = useState({
        startDate: initialStartDate,
        endDate: initialEndDate
    });

    useEffect(() => {
        fetchMetrics({ startDate: initialStartDate, endDate: initialEndDate });
    }, []);

    const fetchMetrics = (filters) => {
        setLoading(true);
        api.get('/metrics', { params: filters })
            .then(response => { 
                setMetrics(response.data); 
            })
            .catch(err => {
                console.error("Error fetching metrics:", err);
                Swal.fire('Error', 'No se pudieron cargar las métricas.', 'error');
            })
            .finally(() => setLoading(false));
    };

    const handleDateChange = (e) => {
        setActiveQuickFilter('custom');
        setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchMetrics(dateRange);
    };

    const handleClearFilters = () => {
        handleQuickFilterClick('monthly');
    };

    const handleQuickFilterClick = (filterType) => {
        setActiveQuickFilter(filterType);
        const now = new Date();
        let newStartDate, newEndDate = now;

        if (filterType === 'daily') {
            newStartDate = now;
        } else if (filterType === 'weekly') {
            newStartDate = subDays(now, 6);
        } else if (filterType === 'monthly') {
            newStartDate = startOfMonth(now);
        } else if (filterType === 'yearly') {
            newStartDate = startOfYear(now);
        }

        const newFilters = {
            startDate: format(newStartDate, 'yyyy-MM-dd'),
            endDate: format(newEndDate, 'yyyy-MM-dd')
        };
        setDateRange(newFilters);
        fetchMetrics(newFilters);
    };
    
    const processSalesData = () => {
        const data = metrics.salesData;
        if (!data || data.length === 0) return { labels: [], datasets: [] };
        
        const startDate = parseISO(dateRange.startDate);
        const endDate = parseISO(dateRange.endDate);
        const diffDays = isValid(startDate) && isValid(endDate) ? differenceInDays(endDate, startDate) : 0;
        
        let aggregationMode = activeQuickFilter;
        if (aggregationMode === 'custom') {
            if (diffDays > 364) aggregationMode = 'yearly';
            else if (diffDays > 31) aggregationMode = 'weekly';
            else aggregationMode = 'daily';
        }
        
        let labels = [];

        if (aggregationMode === 'yearly') {
            const currentYear = getYear(new Date());
            labels = Array.from({ length: 12 }, (_, i) => format(new Date(currentYear, i), 'MMM yy', { locale: es }));
            
            const monthlySales = new Array(12).fill(0);
            data.forEach(sale => {
                const month = getMonth(parseISO(sale.sale_date));
                monthlySales[month] += parseFloat(sale.daily_total);
            });
            return { labels, datasets: [{ label: 'Ingresos por Mes', data: monthlySales, ...chartStyles }] };
        }
        
        const dailyTotals = data.reduce((acc, sale) => {
            const dateKey = format(parseISO(sale.sale_date), 'yyyy-MM-dd');
            acc[dateKey] = (acc[dateKey] || 0) + parseFloat(sale.daily_total);
            return acc;
        }, {});

        labels = Object.keys(dailyTotals).sort();
        const finalData = labels.map(label => dailyTotals[label]);
        const formattedLabels = labels.map(label => format(parseISO(label), 'd MMM', { locale: es }));

        return { labels: formattedLabels, datasets: [{ label: 'Ingresos por Día', data: finalData, ...chartStyles }] };
    };

    const chartStyles = {
        borderColor: '#5D1227',
        backgroundColor: 'rgba(93, 18, 39, 0.5)',
        fill: true,
        tension: 0.1
    };
    const chartData = processSalesData();
    const chartOptions = { responsive: true, maintainAspectRatio: false };
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0);
    
    const showBarChart = activeQuickFilter === 'daily' && chartData.labels.length === 1;

    if (loading) return <div className="text-center py-10">Cargando métricas...</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">Métricas y Analíticas de Negocio</h1>

            <div className="bg-white p-4 rounded-lg shadow-md border space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">Filtros Rápidos:</span>
                    <div className="flex bg-gray-200 rounded-lg p-1">
                        <FilterButton onClick={() => handleQuickFilterClick('daily')} label="Hoy" isActive={activeQuickFilter === 'daily'} />
                        <FilterButton onClick={() => handleQuickFilterClick('weekly')} label="Últimos 7 Días" isActive={activeQuickFilter === 'weekly'} />
                        <FilterButton onClick={() => handleQuickFilterClick('monthly')} label="Este Mes" isActive={activeQuickFilter === 'monthly'} />
                        <FilterButton onClick={() => handleQuickFilterClick('yearly')} label="Este Año" isActive={activeQuickFilter === 'yearly'} />
                    </div>
                </div>
                <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="startDate" className="text-sm font-medium text-gray-700 block mb-1">Rango Personalizado (Inicio)</label>
                        <input type="date" id="startDate" name="startDate" value={dateRange.startDate} onChange={handleDateChange} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="text-sm font-medium text-gray-700 block mb-1">Rango Personalizado (Fin)</label>
                        <input type="date" id="endDate" name="endDate" value={dateRange.endDate} onChange={handleDateChange} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 h-10">Aplicar Filtro</button>
                    <button type="button" onClick={handleClearFilters} className="bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 h-10">Limpiar y ver Mes Actual</button>
                </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Ingresos en Período" value={formatCurrency(metrics.totalIncome)} colorClass="text-blue-600" />
                <MetricCard 
                    title="Ganancia en Período" 
                    value={formatCurrency(metrics.grossProfit)} 
                    colorClass={metrics.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'} 
                />
                <MetricCard title="Nº de Ventas en Período" value={metrics.salesCount} colorClass="text-purple-600" />
                <MetricCard title="Productos sin Venta" value={metrics.stagnantProducts.length} colorClass="text-orange-600" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg h-[400px]">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Rendimiento de Ingresos</h3>
                <div className="h-[320px]">
                    {showBarChart ? (
                        <Bar options={chartOptions} data={chartData} />
                    ) : (
                        <Line options={chartOptions} data={chartData} />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">🏆 Productos Más Rentables</h3>
                    <RankingTable 
                        headers={[{label: 'Producto'}, {label: 'Ganancia Total', align: 'text-right'}]} 
                        data={metrics.mostProfitableProducts} 
                        renderRow={(item) => (
                            <><td className="px-6 py-4 font-medium text-gray-900">{item.name}</td><td className="px-6 py-4 text-right text-green-600 font-semibold">{formatCurrency(item.total_profit)}</td></>
                        )} 
                    />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Productos Más Vendidos (Cantidad)</h3>
                    <RankingTable 
                        headers={[{label: 'Producto'}, {label: 'Unidades Vendidas', align: 'text-center'}]} 
                        data={metrics.productRankingByQuantity} 
                        renderRow={(item) => (
                            <><td className="px-6 py-4 font-medium text-gray-900">{item.name}</td><td className="px-6 py-4 text-center">{item.total_quantity_sold}</td></>
                        )} 
                    />
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">⭐ Ranking de Empleados por Ventas</h3>
                <RankingTable 
                    headers={[{label: 'Empleado'}, {label: 'Nº de Ventas', align: 'text-center'}, {label: 'Total Vendido', align: 'text-right'}]} 
                    data={metrics.employeeRanking} 
                    renderRow={(item) => (
                        <><td className="px-6 py-4 font-medium text-gray-900">{item.full_name}</td><td className="px-6 py-4 text-center">{item.sales_count}</td><td className="px-6 py-4 text-right font-semibold">{formatCurrency(item.total_sold)}</td></>
                    )} 
                />
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📦 Productos Sin Movimiento (Stock Estancado)</h3>
                <RankingTable 
                    headers={[{label: 'Producto'}, {label: 'Stock Actual', align: 'text-center'}, {label: 'Valor en Stock (Costo)', align: 'text-right'}]} 
                    data={metrics.stagnantProducts} 
                    renderRow={(item) => (
                        <><td className="px-6 py-4 font-medium text-gray-900">{item.name}</td><td className="px-6 py-4 text-center">{item.stock}</td><td className="px-6 py-4 text-right text-orange-600">{formatCurrency(item.stock * item.cost)}</td></>
                    )} 
                />
            </div>
        </div>
    );
};

export default MetricsPage;