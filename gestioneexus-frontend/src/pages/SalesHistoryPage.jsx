import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';
import Modal from '../components/Modal';
import SaleDetailModal from '../components/SaleDetailModal';
import Pagination from '../components/Pagination';

const SalesHistoryPage = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingSale, setViewingSale] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // --- ESTADOS PARA LA PAGINACIÓN Y FILTROS ---
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({
        userId: '',
        startDate: '',
        endDate: '',
    });

    // Carga inicial de usuarios para el filtro
    useEffect(() => {
        api.get('/users')
            .then(response => {
                setUsers(response.data);
            })
            .catch(err => console.error("Error fetching users:", err));
    }, []);

    // Efecto para obtener las ventas cada vez que cambian los filtros o la página
    useEffect(() => {
        fetchSales(currentPage, filters);
    }, [currentPage]);

    const fetchSales = (page = 1, currentFilters = filters) => {
        setLoading(true);
        setCurrentPage(page);
        api.get('/sales', { params: { ...currentFilters, page } })
            .then(response => {
                setSales(response.data.sales);
                setTotalPages(response.data.totalPages);
            })
            .catch(err => Swal.fire('Error', 'No se pudo cargar el historial.', 'error'))
            .finally(() => setLoading(false));
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({...prev, [name]: value}));
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchSales(1, filters); // Al filtrar, siempre volvemos a la página 1
    };

    const handleViewDetails = async (saleId) => {
        try {
            const { data } = await api.get(`/sales/${saleId}`);
            setViewingSale(data);
            setIsModalOpen(true);
        } catch (error) {
            Swal.fire('Error', 'No se pudo cargar el detalle de la venta.', 'error');
        }
    };
    
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    const formatDate = (dateString) => new Date(dateString).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Historial de Ventas</h1>

            <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-4 gap-4 items-end border">
                <div>
                    <label htmlFor="userId" className="text-sm font-medium text-gray-700 block mb-1">Vendedor</label>
                    <select name="userId" id="userId" value={filters.userId} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md h-10">
                        <option value="">Todos</option>
                        {users.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="startDate" className="text-sm font-medium text-gray-700 block mb-1">Fecha Inicio</label>
                    <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md h-10" />
                </div>
                <div>
                    <label htmlFor="endDate" className="text-sm font-medium text-gray-700 block mb-1">Fecha Fin</label>
                    <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-md h-10" />
                </div>
                <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 h-10">Filtrar</button>
            </form>

            <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                {loading ? <div className="text-center py-8">Cargando historial...</div> :
                sales.length > 0 ? (
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-6 py-3">Venta ID</th>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Vendido por</th>
                                <th className="px-6 py-3">Total Venta</th>
                                <th className="px-6 py-3">Ganancia</th>
                                <th className="px-6 py-3 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map((sale) => {
                                const finalAmount = sale.total_amount * (1 - (sale.discount / 100));
                                const profit = finalAmount - sale.total_cost;
                                return (
                                    <tr key={sale.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-800">#{sale.id}</td>
                                        <td className="px-6 py-4">{formatDate(sale.created_at)}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{sale.user_name}</td>
                                        <td className="px-6 py-4 font-semibold">{formatCurrency(finalAmount)}</td>
                                        <td className={`px-6 py-4 font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(profit)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleViewDetails(sale.id)} className="text-blue-600 hover:underline font-semibold">Ver Detalle</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-8 text-gray-500">No hay ventas que coincidan con los filtros seleccionados.</div>
                )}

                <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={(page) => fetchSales(page, filters)} 
                />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Detalle de Venta #${viewingSale?.id}`}>
                <SaleDetailModal sale={viewingSale} />
            </Modal>
        </div>
    );
};

export default SalesHistoryPage;