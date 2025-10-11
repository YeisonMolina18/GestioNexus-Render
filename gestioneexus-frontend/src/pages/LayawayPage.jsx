import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/api';
import Modal from '../components/Modal';
import LayawayForm from '../components/LayawayForm';
import LayawayViewModal from '../components/LayawayViewModal';
import Swal from 'sweetalert2';

const LayawayPage = () => {
    const { searchTerm } = useOutletContext();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingPlan, setViewingPlan] = useState(null);
    const [statusFilter, setStatusFilter] = useState('active');

    const fetchPlans = () => {
        setLoading(true);
        const timerId = setTimeout(() => {
            api.get('/layaway', { params: { search: searchTerm, status: statusFilter } })
                .then(response => { setPlans(response.data); })
                .catch(err => { console.error("Error fetching layaway plans:", err); })
                .finally(() => { setLoading(false); });
        }, 500);
        return () => clearTimeout(timerId);
    };

    useEffect(() => {
        fetchPlans();
    }, [searchTerm, statusFilter]);

    const handlePlanAdded = () => {
        setStatusFilter('active');
        fetchPlans();
    };
    
    const handlePlanUpdated = () => {
        fetchPlans();
    };

    const handleCancelPlan = (planId) => {
        Swal.fire({
            title: '¿Estás seguro de cancelar este plan?',
            text: "El stock de los productos asociados será devuelto. ¡No podrás revertir esto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#16A34A',
            cancelButtonColor: '#D33',
            confirmButtonText: 'Sí, ¡cancélalo!',
            cancelButtonText: 'No'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/layaway/${planId}`);
                    Swal.fire('¡Cancelado!', 'El plan separe ha sido cancelado.', 'success');
                    fetchPlans();
                } catch (error) {
                    Swal.fire('Error', 'No se pudo cancelar el plan.', 'error');
                }
            }
        });
    };

    const openViewModal = (plan) => {
        setViewingPlan(plan);
        setIsViewModalOpen(true);
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

    const FilterButton = ({ status, label }) => (
        <button onClick={() => setStatusFilter(status)} className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${statusFilter === status ? 'bg-white shadow' : 'bg-transparent text-gray-600 hover:bg-white hover:bg-opacity-50'}`}>
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Planes Separe</h1>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-[#16A34A] text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-md">
                    + Nuevo Plan Separe
                </button>
            </div>
            
            <div className="flex bg-gray-200 rounded-lg p-1 w-auto self-start">
                <FilterButton status="active" label="Activos" />
                <FilterButton status="completed" label="Completados" />
                <FilterButton status="overdue" label="Vencidos" />
                <FilterButton status="all" label="Todos" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                {loading ? <div className="text-center py-8">Cargando...</div> :
                plans.length > 0 ? (
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Valor Total</th>
                                <th className="px-6 py-3">Abono</th>
                                <th className="px-6 py-3">Saldo</th>
                                <th className="px-6 py-3">Fecha Límite</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plans.map((plan) => (
                                <tr key={plan.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4"><div className="font-medium text-gray-900">{plan.customer_name}</div><div className="text-xs text-gray-500">{plan.customer_contact}</div></td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(plan.total_value)}</td>
                                    <td className="px-6 py-4 text-green-600 font-semibold">{formatCurrency(plan.down_payment)}</td>
                                    <td className="px-6 py-4 text-red-600 font-semibold">{formatCurrency(plan.balance_due)}</td>
                                    <td className="px-6 py-4">{formatDate(plan.deadline)}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${plan.status === 'active' ? 'bg-blue-100 text-blue-800' : plan.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{plan.status}</span></td>
                                    <td className="px-6 py-4 text-center space-x-4">
                                        <button onClick={() => openViewModal(plan)} className="text-blue-600 hover:underline font-semibold">Ver/Abonar</button>
                                        {/* --- CORRECCIÓN AQUÍ: Se permite cancelar si está activo O vencido --- */}
                                        {(plan.status === 'active' || plan.status === 'overdue') && <button onClick={() => handleCancelPlan(plan.id)} className="text-red-600 hover:underline font-semibold">Cancelar</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-8 text-gray-500">No se encontraron planes separe {searchTerm ? `para la búsqueda '${searchTerm}'` : `con el estado '${statusFilter}'`}.</div>
                )}
            </div>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Crear Nuevo Plan Separe">
                <LayawayForm onPlanAdded={handlePlanAdded} closeModal={() => setIsCreateModalOpen(false)} />
            </Modal>
            
            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Detalle del Plan #${viewingPlan?.id}`}>
                {viewingPlan && (
                    <LayawayViewModal 
                        plan={viewingPlan} 
                        onClose={() => setIsViewModalOpen(false)} 
                        onPlanUpdated={handlePlanUpdated} 
                    />
                )}
            </Modal>
        </div>
    );
};

export default LayawayPage;