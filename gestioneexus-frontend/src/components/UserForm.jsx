import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import PasswordInput from './PasswordInput'; // 1. Importamos el nuevo componente

const FormField = ({ label, name, type = 'text', value, onChange, required = false, disabled = false }) => (
    <div>
        <label htmlFor={name} className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
        <input id={name} type={type} name={name} value={value} onChange={onChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D1227] disabled:bg-gray-200" 
            required={required} disabled={disabled} />
    </div>
);

const UserForm = ({ onUserAdded, onUserUpdated, closeModal, userToEdit, loggedInUser }) => {
    const [formData, setFormData] = useState({
        full_name: '', username: '', email: '', password: '', role_id: '2',
    });

    const isEditing = !!userToEdit;
    const isEditingSelf = isEditing && userToEdit.id === loggedInUser.id;

    useEffect(() => {
        if (isEditing) {
            setFormData({
                full_name: userToEdit.full_name || '', username: userToEdit.username || '',
                email: userToEdit.email || '', password: '',
                role_id: userToEdit.role === 'admin' ? '1' : '2',
            });
        } else {
            setFormData({ full_name: '', username: '', email: '', password: '', role_id: '2' });
        }
    }, [userToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^()_+\-=\[\]{};':.,\/?~`])[A-Za-z\d!@#$%^()_+\-=\[\]{};':.,\/?~`]{8,}$/;
        
        if (formData.password && !passwordRegex.test(formData.password)) {
            Swal.fire({
                icon: 'error', title: 'Contraseña Insegura',
                text: 'La contraseña no cumple con todos los requisitos de seguridad.',
                confirmButtonColor: '#5D1227'
            });
            return;
        }
        
        const dataToSubmit = { ...formData, role_id: parseInt(formData.role_id) };
        if (isEditing && !dataToSubmit.password) {
            delete dataToSubmit.password;
        }

        try {
            if (isEditing) {
                const { data: updatedUserResponse } = await api.put(`/users/${userToEdit.id}`, dataToSubmit);
                Swal.fire('¡Éxito!', 'Usuario actualizado correctamente.', 'success');
                onUserUpdated(updatedUserResponse);
            } else {
                const { data: newUser } = await api.post('/users', dataToSubmit);
                Swal.fire('¡Éxito!', 'Usuario creado correctamente.', 'success');
                onUserAdded(newUser);
            }
            closeModal();
        } catch (error) {
            const errorMsg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Ocurrió un error.';
            Swal.fire({ icon: 'error', title: 'Error', text: errorMsg, confirmButtonColor: '#5D1227' });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nombre Completo" name="full_name" value={formData.full_name} onChange={handleChange} required />
                <FormField label="Nombre de Usuario" name="username" value={formData.username} onChange={handleChange} required />
                <FormField label="Correo Electrónico" name="email" type="email" value={formData.email} onChange={handleChange} required />
                <div>
                    <label htmlFor="role_id" className="block mb-1 text-sm font-medium text-gray-700">Rol</label>
                    <select name="role_id" id="role_id" value={formData.role_id} onChange={handleChange} disabled={isEditingSelf}
                        className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-200">
                        <option value="2">Normal</option>
                        <option value="1">Admin</option>
                    </select>
                    {isEditingSelf && <p className="text-xs text-gray-500 mt-1">No puedes cambiar tu propio rol.</p>}
                </div>
                <div className="md:col-span-2">
                    {/* 2. Reemplazamos el FormField de contraseña */}
                    <PasswordInput
                        label={`Contraseña ${isEditing ? '(Opcional: solo si se desea cambiar)' : ''}`}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={!isEditing}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D1227] pr-10" // Añadimos padding a la derecha
                    />
                    <PasswordStrengthIndicator password={formData.password} />
                </div>
            </div>
            <div className="flex justify-end pt-4 border-t mt-6">
                <button type="button" onClick={closeModal} className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#16A34A] text-white rounded-lg hover:bg-green-700 font-semibold">
                    {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
            </div>
        </form>
    );
};

export default UserForm;