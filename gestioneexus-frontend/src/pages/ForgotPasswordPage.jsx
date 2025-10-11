import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import Swal from 'sweetalert2';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            Swal.fire('Revisa tu Correo', data.msg, 'info');
        } catch (error) {
            Swal.fire('Error', 'Ocurrió un error al procesar la solicitud.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#5D1227] p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-xl text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Recuperar Contraseña</h1>
                <p className="text-gray-500 mb-6">Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="email" placeholder="Correo Electrónico" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#5D1227]" required />
                    <button type="submit" disabled={loading} className="w-full bg-[#5D1227] text-white py-3 rounded-full font-bold hover:bg-opacity-90 disabled:bg-gray-400">
                        {loading ? 'Enviando...' : 'Enviar Enlace'}
                    </button>
                </form>
                <Link to="/login" className="text-sm text-gray-600 hover:underline mt-6 inline-block">Volver a Inicio de Sesión</Link>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;