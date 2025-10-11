import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/api';
import Swal from 'sweetalert2';
import Pagination from '../components/Pagination'; // Asumiendo que tienes un componente de paginación reutilizable

const AuditLogPage = () => {
    const { searchTerm } = useOutletContext(); 

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    // --- 1. NUEVO ESTADO PARA LOS FILTROS DE FECHA ---
    const [dateFilters, setDateFilters] = useState({
        month: '',
        year: ''
    });

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timerId);
    }, [searchTerm]);

    // --- 2. LA BÚSQUEDA AHORA DEPENDE DE TODOS LOS FILTROS ---
    useEffect(() => {
        fetchLogs(1); // Siempre volvemos a la página 1 al cambiar un filtro
    }, [debouncedSearchTerm, dateFilters]);

    const fetchLogs = (page = currentPage) => {
        setLoading(true);
        api.get('/logs', {
            params: { 
                page,
                search: debouncedSearchTerm,
                month: dateFilters.month,
                year: dateFilters.year
            }
        })
        .then(({ data }) => {
            setLogs(data.logs);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
        })
        .catch(error => {
            console.error("Error al obtener los logs:", error);
            Swal.fire('Error', 'No se pudieron cargar los registros de auditoría.', 'error');
        })
        .finally(() => setLoading(false));
    };

    const handleDateFilterChange = (e) => {
        const { name, value } = e.target;
        setDateFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setDateFilters({ month: '', year: '' });
        // La búsqueda se disparará automáticamente por el useEffect
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });

    // --- LÓGICA PARA GENERAR LAS OPCIONES DE LOS SELECTS ---
    const months = [
        { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
    ];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Historial de Cambios (Auditoría)</h1>
            
            {/* --- 3. NUEVO FORMULARIO DE FILTROS DE FECHA --- */}
            <div className="bg-white p-4 rounded-lg shadow-md border flex flex-wrap items-end gap-4">
                <div className="flex-grow">
                    <label htmlFor="month" className="text-sm font-medium text-gray-700">Mes</label>
                    <select id="month" name="month" value={dateFilters.month} onChange={handleDateFilterChange} className="w-full mt-1 p-2 border rounded-md">
                        <option value="">Todos los meses</option>
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
                <div className="flex-grow">
                    <label htmlFor="year" className="text-sm font-medium text-gray-700">Año</label>
                    <select id="year" name="year" value={dateFilters.year} onChange={handleDateFilterChange} className="w-full mt-1 p-2 border rounded-md">
                        <option value="">Todos los años</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button onClick={handleClearFilters} className="bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 h-10">
                    Limpiar Filtros
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                {loading ? <div className="text-center py-8">Cargando...</div> :
                logs.length > 0 ? (
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-6 py-3">Fecha y Hora</th>
                                <th className="px-6 py-3">Usuario</th>
                                <th className="px-6 py-3">Acción Realizada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">{formatDate(log.created_at)}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{log.user_name}</td>
                                    <td className="px-6 py-4">{log.action}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-8 text-gray-500">No se encontraron registros para los filtros seleccionados.</div>
                )}
                
                <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={(page) => fetchLogs(page)} 
                />
            </div>
        </div>
    );
};

export default AuditLogPage;