import React, { useState } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';

const FinancialEntryForm = ({ onEntryAdded, closeModal }) => {
    // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
    // Se construye la fecha de hoy basándose en la zona horaria local del navegador,
    // evitando la conversión a UTC de .toISOString() que causaba el error.
    const todayDate = new Date();
    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0'); // Se añade +1 porque los meses van de 0-11
    const day = String(todayDate.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    // --- FIN DE LA CORRECCIÓN ---

    const [formData, setFormData] = useState({
        entry_date: today, // Fecha de hoy por defecto
        concept: '',
        income: '',
        expense: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.income && !formData.expense) {
            Swal.fire('Error', 'Debes ingresar un monto de ingreso o de egreso.', 'error');
            return;
        }

        try {
            await api.post('/reports/financial-ledger', formData);
            Swal.fire('¡Éxito!', 'Movimiento registrado correctamente.', 'success');
            onEntryAdded();
            closeModal();
        } catch (error) {
            console.error("Error al registrar el movimiento:", error);
            const errorMsg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'No se pudo registrar el movimiento.';
            Swal.fire('Error', errorMsg, 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="entry_date" className="block mb-1 text-sm font-medium text-gray-700">Fecha</label>
                    <input id="entry_date" name="entry_date" type="date" value={formData.entry_date} onChange={handleChange} required max={today} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="concept" className="block mb-1 text-sm font-medium text-gray-700">Concepto</label>
                    <input id="concept" name="concept" type="text" placeholder="Ej: Compra de mercancía, pago de servicios" value={formData.concept} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="income" className="block mb-1 text-sm font-medium text-gray-700">Ingresos ($)</label>
                    <input id="income" name="income" type="number" step="0.01" placeholder="0" value={formData.income} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" min="0"/>
                </div>
                <div>
                    <label htmlFor="expense" className="block mb-1 text-sm font-medium text-gray-700">Egresos ($)</label>
                    <input id="expense" name="expense" type="number" step="0.01" placeholder="0" value={formData.expense} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" min="0"/>
                </div>
            </div>
            <div className="flex justify-end pt-4 border-t mt-6">
                <button type="button" onClick={closeModal} className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#16A34A] text-white rounded-lg hover:bg-green-700 font-semibold">Registrar Movimiento</button>
            </div>
        </form>
    );
};

export default FinancialEntryForm;