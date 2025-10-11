import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import Swal from 'sweetalert2';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

const ResetPasswordPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useParams(); // Obtiene el token de la URL
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            Swal.fire('Error', 'Las contraseñas no coinciden.', 'error');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post(`/auth/reset-password/${token}`, { password });
            await Swal.fire('¡Éxito!', data.msg, 'success');
            navigate('/login');
        } catch (error) {
            Swal.fire('Error', error.response?.data?.msg || 'Ocurrió un error.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#5D1227] p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-xl text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Establecer Nueva Contraseña</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input type="password" placeholder="Nueva Contraseña" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#5D1227]" required />
                        <PasswordStrengthIndicator password={password} />
                    </div>
                    <input type="password" placeholder="Confirmar Nueva Contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#5D1227]" required />
                    <button type="submit" disabled={loading} className="w-full bg-[#5D1227] text-white py-3 rounded-full font-bold hover:bg-opacity-90 disabled:bg-gray-400">
                        {loading ? 'Guardando...' : 'Restablecer Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;