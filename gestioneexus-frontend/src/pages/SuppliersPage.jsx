import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/api';
import Modal from '../components/Modal';
import SupplierForm from '../components/SupplierForm';
import Swal from 'sweetalert2';

const SuppliersPage = () => {
    const { searchTerm } = useOutletContext();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);

    // Lógica de búsqueda (aunque el backend no la soporte para este módulo, el patrón se mantiene)
    const filteredSuppliers = suppliers.filter(s => 
        s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nit.includes(searchTerm)
    );

    useEffect(() => {
        setLoading(true);
        api.get('/suppliers')
            .then(response => {
                setSuppliers(response.data);
            })
            .catch(err => Swal.fire('Error', 'No se pudieron cargar los proveedores.', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const openModalForCreate = () => { setEditingSupplier(null); setIsModalOpen(true); };
    const openModalForEdit = (supplier) => { setEditingSupplier(supplier); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingSupplier(null); };

    const handleSupplierAdded = (newSupplier) => setSuppliers(prev => [newSupplier, ...prev]);
    const handleSupplierUpdated = (updatedSupplier) => setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));

    const handleDelete = (supplierId) => {
        Swal.fire({
            title: '¿Estás seguro?', text: "Esta acción no se puede revertir.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#16A34A', cancelButtonColor: '#D33',
            confirmButtonText: 'Sí, ¡bórralo!', cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/suppliers/${supplierId}`);
                    setSuppliers(prev => prev.filter(s => s.id !== supplierId));
                    Swal.fire('¡Eliminado!', 'El proveedor ha sido eliminado.', 'success');
                } catch (error) {
                    Swal.fire('Error', 'No se pudo eliminar el proveedor.', 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Proveedores</h1>
                <button onClick={openModalForCreate} className="bg-[#16A34A] text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-md">
                    + Agregar Proveedor
                </button>
            </div>
            
            {loading ? <div className="text-center py-8">Cargando...</div> :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(supplier => (
                    <div key={supplier.id} className="bg-white p-5 rounded-lg shadow-lg flex flex-col space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{supplier.company_name}</h3>
                                <p className="text-sm text-gray-500">NIT: {supplier.nit}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => openModalForEdit(supplier)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Editar</button>
                                <button onClick={() => handleDelete(supplier.id)} className="text-xs text-red-600 hover:text-red-800 font-semibold">Eliminar</button>
                            </div>
                        </div>
                        <div className="border-t pt-3 space-y-1 text-sm text-gray-700">
                            <p><strong>Contacto:</strong> {supplier.contact_person || 'N/A'}</p>
                            <p><strong>Teléfono:</strong> {supplier.contact_number || 'N/A'}</p>
                            <p><strong>Email:</strong> {supplier.email || 'N/A'}</p>
                            <p><strong>Dirección:</strong> {supplier.address || 'N/A'}</p>
                        </div>
                    </div>
                ))}
            </div>
            }
            { !loading && filteredSuppliers.length === 0 && <div className="text-center py-12 text-gray-500">No hay proveedores registrados.</div> }

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSupplier ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor'}>
                <SupplierForm
                    onSupplierAdded={handleSupplierAdded}
                    onSupplierUpdated={handleSupplierUpdated}
                    closeModal={closeModal}
                    supplierToEdit={editingSupplier}
                />
            </Modal>
        </div>
    );
};

export default SuppliersPage;