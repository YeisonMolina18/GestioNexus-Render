import React, { useState } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import PasswordInput from './PasswordInput';

const ChangePasswordModal = ({ closeModal }) => {
    const [formData, setFormData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            Swal.fire('Error', 'Las nuevas contraseñas no coinciden.', 'error');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]{8,}$/;
        if (!passwordRegex.test(formData.newPassword)) {
            Swal.fire('Contraseña Insegura', 'La nueva contraseña no cumple con todos los requisitos de seguridad.', 'error');
            return;
        }

        try {
            const { data } = await api.put('/users/update-password', {
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword,
            });
            Swal.fire('¡Éxito!', data.msg, 'success');
            closeModal();
        } catch (error) {
            const errorMsg = error.response?.data?.msg || 'No se pudo cambiar la contraseña.';
            Swal.fire('Error', errorMsg, 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* --- CORRECCIÓN AQUÍ: Se extrae la etiqueta del componente --- */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña Actual</label>
                <PasswordInput
                    name="oldPassword"
                    value={formData.oldPassword}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full p-2 border rounded-md pr-10"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                <PasswordInput
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full p-2 border rounded-md pr-10"
                />
                <PasswordStrengthIndicator password={formData.newPassword} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Confirmar Nueva Contraseña</label>
                <PasswordInput
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full p-2 border rounded-md pr-10"
                />
            </div>
            <div className="flex justify-end pt-4 border-t">
                <button type="button" onClick={closeModal} className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#16A34A] text-white rounded-lg font-semibold">Guardar Contraseña</button>
            </div>
        </form>
    );
};

export default ChangePasswordModal;