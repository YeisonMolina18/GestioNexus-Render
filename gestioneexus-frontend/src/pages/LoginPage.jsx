import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput'; // 1. Importamos el nuevo componente

const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>;

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex font-sans">
            <div className="hidden lg:flex w-1/2 bg-white items-center justify-center p-12">
                <div className="text-center">
                    <img 
                        src="/images/logo_almacen.png" 
                        alt="Logo Variedades Cinthya"
                        className="w-68 h-68 object-contain rounded-full mx-auto mb-4"
                    />
                </div>
            </div>

            <div className="w-full lg:w-1/2 bg-[#5D1227] flex items-center justify-center p-8 sm:p-12 relative">
                <div className="w-full max-w-md">
                    <h1 className="text-yellow-400 text-5xl font-bold mb-2">Bienvenid@</h1>
                    <p className="text-white text-lg mb-8">Inicio de Sesión</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-white text-sm font-bold mb-2 block">Correo Electrónico</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    required
                                />
                            </div>
                        </div>
                        
                        {/* 2. Reemplazamos el input de contraseña */}
                        <PasswordInput
                            label="Contraseña"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full pl-11 pr-12 py-3 bg-white border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            leftIcon={<LockIcon />}
                        />
                        
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center text-white cursor-pointer">
                                <input type="checkbox" className="mr-2 h-4 w-4 rounded bg-transparent text-yellow-400 focus:ring-yellow-400 border-white" />
                                Recuérdame
                            </label>
                            <Link to="/forgot-password" className="font-semibold text-white hover:text-yellow-400 hover:underline">
                                Olvidé mi contraseña
                            </Link>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#28a745] text-white py-3 mt-4 rounded-full font-bold text-lg hover:bg-green-700 transition-all duration-300 shadow-lg"
                        >
                            Ingresar
                        </button>
                    </form>
                </div>
                
                <div className="absolute bottom-6 right-6">
                    <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-xs">
                        GN
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;