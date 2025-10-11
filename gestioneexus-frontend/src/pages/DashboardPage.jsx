import React, { useState, useEffect, useContext } from 'react';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';

const StatCard = ({ title, value, icon, color }) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-md flex items-center">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center mr-4 ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-500 font-bold">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
};

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
const ProductosIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>;
const VentasIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H7.118l-.38-1.516A1 1 0 005.74.5H3zM6.38 6h7.392l-2.25 4.5H8.518L6.38 6z" /><path d="M10 18a2 2 0 11-4 0 2 2 0 014 0zM18 18a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;

const DashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.get('/dashboard');
                setStats(data);
            } catch (err) {
                setError('No se pudieron cargar las estadísticas.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

    if (loading) return <div className="text-center py-8">Cargando dashboard...</div>;
    if (error) return <div className="text-center py-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                <StatCard title="Usuarios" value={stats?.userCount ?? 0} icon={<UserIcon />} color="bg-red-400" />
                <StatCard title="Productos" value={stats?.productCount ?? 0} icon={<ProductosIcon />} color="bg-blue-400" />
                <StatCard title="Ventas" value={stats?.salesCount ?? 0} icon={<VentasIcon />} color="bg-green-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#F3F4F6] p-4 rounded-lg">
                    <h3 className="font-bold text-lg text-gray-800 mb-4">PRODUCTOS MÁS VENDIDOS</h3>
                    {/* --- CAMBIO PARA RESPONSIVIDAD AQUÍ --- */}
                    {/* Cambiamos 'overflow-hidden' por 'overflow-x-auto'.
                      Esto asegura que si la tabla es demasiado ancha para la pantalla,
                      aparecerá una barra de scroll horizontal en lugar de que la tabla
                      se desborde y rompa el diseño.
                    */}
                    <div className="overflow-x-auto rounded-lg">
                        <table className="w-full text-sm text-left text-gray-800">
                            <thead className="text-xs text-white uppercase bg-[#5D1227]">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Producto</th>
                                    <th scope="col" className="px-6 py-3 text-center">Total vendido</th>
                                    <th scope="col" className="px-6 py-3 text-center">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.topProducts.map((product, index) => (
                                    <tr key={index} className="bg-white border-b border-gray-200">
                                        <th scope="row" className="px-6 py-4 font-medium whitespace-nowrap">{product.name}</th>
                                        <td className="px-6 py-4 text-center">{product.totalSold}</td>
                                        <td className="px-6 py-4 text-center">{product.stock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-[#F3F4F6] p-4 rounded-lg">
                    <h3 className="font-bold text-lg text-gray-800 mb-4">ÚLTIMAS VENTAS</h3>
                    {/* --- CAMBIO PARA RESPONSIVIDAD AQUÍ --- */}
                    <div className="overflow-x-auto rounded-lg">
                        <table className="w-full text-sm text-left text-gray-800">
                            <thead className="text-xs text-white uppercase bg-[#5D1227]">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Producto</th>
                                    <th scope="col" className="px-6 py-3">Fecha</th>
                                    <th scope="col" className="px-6 py-3">Venta total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.recentSales.map((sale, index) => (
                                    <tr key={index} className="bg-white border-b border-gray-200">
                                        <th scope="row" className="px-6 py-4 font-medium whitespace-nowrap">{sale.productName}</th>
                                        <td className="px-6 py-4">{new Date(sale.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{formatCurrency(sale.saleTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;