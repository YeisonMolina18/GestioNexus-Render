import React, { useContext, useState, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';
import Modal from '../components/Modal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import Swal from 'sweetalert2';

const ProfilePage = () => {
    // Ahora usamos 'setUser' que es nuestra nueva función 'updateUserContext'
    const { user, setUser } = useContext(AuthContext);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const fileInputRef = useRef(null);

    if (!user) { return <div>Cargando perfil...</div>; }

    const handlePhotoClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profile_photo', file);

        try {
            Swal.fire({ title: 'Subiendo imagen...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            const { data } = await api.post('/users/upload-photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // --- CORRECCIÓN AQUÍ ---
            // Usamos la función del contexto para actualizar el usuario de forma segura
            setUser({ profilePictureUrl: data.profilePictureUrl });

            Swal.fire('¡Éxito!', data.msg, 'success');
        } catch (error) {
            Swal.fire('Error', 'No se pudo subir la imagen.', 'error');
        }
    };
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    return (
        <>
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Mi Perfil</h1>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="flex-shrink-0 text-center">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                        
                        {/* --- CORRECCIÓN AQUÍ: Aseguramos que la URL se construya siempre --- */}
                        {user.profilePictureUrl ? (
                            <img src={`${backendUrl}${user.profilePictureUrl}?${new Date().getTime()}`} alt="Foto de perfil" className="w-32 h-32 rounded-full object-cover mx-auto shadow-md" />
                        ) : (
                            <div className="w-32 h-32 bg-[#5D1227] rounded-full flex items-center justify-center text-white text-5xl font-bold mx-auto shadow-md">
                                {user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
                            </div>
                        )}
                        <button onClick={handlePhotoClick} className="w-full mt-2 text-sm text-blue-600 hover:underline">Cambiar foto</button>
                    </div>
                    <div className="space-y-4 flex-grow w-full">
                        <div>
                            <label className="text-sm font-medium text-gray-500">Nombre Completo</label>
                            <p className="text-lg text-gray-800 p-3 bg-gray-100 rounded-md">{user.fullName}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Rol</label>
                            <p className="text-lg text-gray-800 p-3 bg-gray-100 rounded-md capitalize">{user.role}</p>
                        </div>
                        <button onClick={() => setIsPasswordModalOpen(true)} className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">
                            Cambiar Contraseña
                        </button>
                    </div>
                </div>
            </div>

            <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Cambiar Contraseña">
                <ChangePasswordModal closeModal={() => setIsPasswordModalOpen(false)} />
            </Modal>
        </>
    );
};

export default ProfilePage;