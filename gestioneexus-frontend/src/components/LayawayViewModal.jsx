import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';

const LayawayViewModal = ({ plan, onClose, onPlanUpdated }) => {
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [planProducts, setPlanProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);

    useEffect(() => {
        if (plan?.id) {
            const fetchPlanDetails = async () => {
                setIsLoadingProducts(true);
                try {
                    const { data } = await api.get(`/layaway/${plan.id}`);
                    setPlanProducts(data.products || []);
                } catch (error) {
                    console.error("Error fetching plan details:", error);
                    setPlanProducts([]);
                } finally {
                    setIsLoadingProducts(false);
                }
            };
            fetchPlanDetails();
        }
    }, [plan?.id]);

    if (!plan) return null;

    const handleAddPayment = async (e) => {
        e.preventDefault();
        const amount = parseFloat(paymentAmount);
        
        if (!amount || amount <= 0) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Por favor, ingresa un monto de abono válido.' });
            return;
        }

        if (amount > plan.balance_due) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'El abono no puede ser mayor que el saldo pendiente.' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const { data } = await api.put(`/layaway/${plan.id}`, {
                new_payment_amount: amount
            });
            
            onPlanUpdated(data); 
            onClose();
            Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Abono registrado correctamente.' });

        } catch (error) {
            console.error("Error al registrar el abono:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar el abono.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-CO', options);
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h4 className="font-bold text-lg text-gray-800">Cliente: {plan.customer_name}</h4>
                <p className="text-sm text-gray-600">Contacto: {plan.customer_contact}</p>
                <p className="text-sm text-gray-600">Cédula: {plan.customer_id_doc || 'No registrada'}</p>
                <p className="text-sm text-gray-600">Fecha Límite: {formatDate(plan.deadline)}</p>
            </div>

            <div>
                <h4 className="font-bold text-lg text-gray-800 mb-2">Productos Separados</h4>
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {isLoadingProducts ? (
                        <p className="p-4 text-center text-gray-500">Cargando productos...</p>
                    ) : planProducts.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {planProducts.map(item => (
                                <li key={item.product_id} className="p-3 flex justify-between items-center text-sm">
                                    <div>
                                        {/* --- CORRECCIÓN AQUÍ: Usamos item.product_sizes --- */}
                                        <p className="font-semibold text-gray-800">{item.product_name} - Talla: {item.product_sizes}</p>
                                        <p className="text-gray-500">Cantidad: {item.quantity}</p>
                                    </div>
                                    <p className="font-medium text-gray-700">{formatCurrency(item.price_at_sale * item.quantity)}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="p-4 text-center text-gray-500">No se encontraron productos para este plan.</p>
                    )}
                </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-sm text-gray-500">Valor Total</p>
                    <p className="font-bold text-lg">{formatCurrency(plan.total_value)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Total Abonado</p>
                    <p className="font-bold text-lg text-green-600">{formatCurrency(plan.down_payment)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Saldo Pendiente</p>
                    <p className="font-bold text-lg text-red-600">{formatCurrency(plan.balance_due)}</p>
                </div>
            </div>

            {(plan.status === 'active' || plan.status === 'overdue') && (
                 <form onSubmit={handleAddPayment} className="pt-4 border-t">
                     <h4 className="font-bold text-lg text-gray-800 mb-2">Registrar Nuevo Abono</h4>
                     <div className="flex items-center gap-4">
                         <input
                             type="number"
                             step="0.01"
                             placeholder="Monto del abono"
                             value={paymentAmount}
                             onChange={(e) => setPaymentAmount(e.target.value)}
                             className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D1227]"
                             required
                         />
                         <button 
                             type="submit"
                             disabled={isSubmitting}
                             className="px-4 py-2 bg-[#16A34A] text-white rounded-lg hover:bg-green-700 font-semibold whitespace-nowrap disabled:bg-gray-400"
                         >
                             {isSubmitting ? 'Registrando...' : 'Registrar Abono'}
                         </button>
                     </div>
                 </form>
            )}
            
            <div className="flex justify-end pt-4 border-t mt-4">
                 <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Cerrar</button>
            </div>
        </div>
    );
};

export default LayawayViewModal;