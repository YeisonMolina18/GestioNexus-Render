import React, { useState, useEffect, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';
import Modal from '../components/Modal';
import UserForm from '../components/UserForm';
import Swal from 'sweetalert2';

const EmployeesPage = () => {
    const { searchTerm } = useOutletContext();
    const { user: loggedInUser } = useContext(AuthContext);
    
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        setLoading(true);
        const timerId = setTimeout(() => {
            api.get('/users', { params: { search: searchTerm } })
                .then(response => {
                    setUsers(response.data);
                })
                .catch(err => {
                    console.error("Error al obtener los usuarios:", err);
                    Swal.fire('Error', 'No se pudieron cargar los usuarios.', 'error');
                })
                .finally(() => {
                    setLoading(false);
                });
        }, 500);

        return () => {
            clearTimeout(timerId);
        };
    }, [searchTerm]);

    const openModalForCreate = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openModalForEdit = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleUserAdded = (newUser) => {
        setUsers(prevUsers => [newUser, ...prevUsers]);
    };

    const handleUserUpdated = (updatedUser) => {
        setUsers(prevUsers => prevUsers.map(user => 
            user.id === updatedUser.id ? updatedUser : user
        ));
    };

    const handleToggleUserStatus = async (userToToggle) => {
        if (loggedInUser.id === userToToggle.id) {
            Swal.fire('Acción no permitida', 'No puedes cambiar tu propio estado.', 'error');
            return;
        }

        const actionText = userToToggle.is_active ? 'desactivar' : 'activar';
        const confirmationText = userToToggle.is_active ? 'El usuario no podrá iniciar sesión.' : 'El usuario podrá iniciar sesión de nuevo.';

        Swal.fire({
            title: `¿Estás seguro de ${actionText} a este usuario?`,
            text: confirmationText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#16A34A',
            cancelButtonColor: '#D33',
            confirmButtonText: `Sí, ¡${actionText}!`,
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = userToToggle.is_active
                        ? await api.delete(`/users/${userToToggle.id}`)
                        : await api.put(`/users/activate/${userToToggle.id}`);
                    
                    handleUserUpdated(response.data);
                    Swal.fire('¡Éxito!', `El usuario ha sido ${actionText}do.`, 'success');
                } catch (error) {
                    Swal.fire('Error', `No se pudo ${actionText} el usuario.`, 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Empleados</h1>
                <button onClick={openModalForCreate} className="bg-[#16A34A] text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-md">
                    + Agregar Usuario
                </button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                {loading ? <div className="text-center py-8">Cargando...</div> : 
                users.length > 0 ? (
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-6 py-3">Nombre Completo</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Rol</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{user.full_name}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{user.role}</span></td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.is_active ? 'Activo' : 'Inactivo'}</span></td>
                                    <td className="px-6 py-4 text-center space-x-4">
                                        <button onClick={() => openModalForEdit(user)} className="text-blue-600 hover:underline font-semibold">Editar</button>
                                        {loggedInUser.id !== user.id && (
                                            <button onClick={() => handleToggleUserStatus(user)} className={`font-semibold ${user.is_active ? 'text-red-600 hover:underline' : 'text-green-600 hover:underline'}`}>
                                                {user.is_active ? 'Desactivar' : 'Activar'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                     <div className="text-center py-8 text-gray-500">No se encontraron usuarios {searchTerm && `para la búsqueda '${searchTerm}'`}.</div>
                )}
            </div>
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}>
                <UserForm onUserAdded={handleUserAdded} onUserUpdated={handleUserUpdated} closeModal={closeModal} userToEdit={editingUser} loggedInUser={loggedInUser} />
            </Modal>
        </div>
    );
};

export default EmployeesPage;