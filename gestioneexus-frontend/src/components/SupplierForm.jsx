import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';

const SupplierForm = ({ onSupplierAdded, onSupplierUpdated, closeModal, supplierToEdit }) => {
    const [formData, setFormData] = useState({
        company_name: '',
        contact_person: '',
        contact_number: '',
        email: '',
        address: '',
        nit: '',
    });

    const isEditing = !!supplierToEdit;

    useEffect(() => {
        if (isEditing) {
            setFormData({
                company_name: supplierToEdit.company_name || '',
                contact_person: supplierToEdit.contact_person || '',
                contact_number: supplierToEdit.contact_number || '',
                email: supplierToEdit.email || '',
                address: supplierToEdit.address || '',
                nit: supplierToEdit.nit || '',
            });
        } else {
            setFormData({
                company_name: '', contact_person: '', contact_number: '',
                email: '', address: '', nit: '',
            });
        }
    }, [supplierToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // --- VALIDACIÓN EN TIEMPO REAL PARA EL NIT ---
        if (name === 'nit') {
            // Solo permite números en el campo NIT
            const numericValue = value.replace(/[^0-9]/g, '');
            setFormData(prevState => ({ ...prevState, [name]: numericValue }));
        } else {
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const { data: updatedSupplier } = await api.put(`/suppliers/${supplierToEdit.id}`, formData);
                Swal.fire('¡Éxito!', 'Proveedor actualizado correctamente.', 'success');
                onSupplierUpdated(updatedSupplier);
            } else {
                const { data: newSupplier } = await api.post('/suppliers', formData);
                Swal.fire('¡Éxito!', 'Proveedor agregado correctamente.', 'success');
                onSupplierAdded(newSupplier);
            }
            closeModal();
        } catch (error) {
            const errorMsg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Ocurrió un error al guardar el proveedor.';
            Swal.fire('Error', errorMsg, 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="company_name" placeholder="Nombre de la Empresa" value={formData.company_name} onChange={handleChange} required className="w-full p-2 border rounded-md" />
                
                {/* --- CAMPO NIT MEJORADO --- */}
                <input 
                    name="nit" 
                    placeholder="NIT (solo números)" 
                    value={formData.nit} 
                    onChange={handleChange} 
                    required 
                    className="w-full p-2 border rounded-md"
                    inputMode="numeric" // Mejora la experiencia en móviles
                    pattern="[0-9]*"   // Ayuda a la validación del navegador
                />

                <input name="contact_person" placeholder="Nombre del Encargado" value={formData.contact_person} onChange={handleChange} className="w-full p-2 border rounded-md" />
                <input name="contact_number" placeholder="Número de Contacto" value={formData.contact_number} onChange={handleChange} className="w-full p-2 border rounded-md" />
                <input name="email" type="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded-md" />
                <input name="address" placeholder="Dirección" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded-md" />
            </div>
            <div className="flex justify-end pt-4 border-t mt-6">
                <button type="button" onClick={closeModal} className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#16A34A] text-white rounded-lg hover:bg-green-700 font-semibold">
                    {isEditing ? 'Guardar Cambios' : 'Agregar Proveedor'}
                </button>
            </div>
        </form>
    );
};

export default SupplierForm;