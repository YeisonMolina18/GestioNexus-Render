import React, { createContext, useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

    const checkNotificationStatus = async () => {
        try {
            const { data } = await api.get('/notifications/status');
            setHasUnreadNotifications(data.hasUnread);
        } catch (error) {
            console.error("Error checking notification status:", error);
        }
    };

    useEffect(() => {
        const checkAuthStatus = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const { data } = await api.get('/auth/renew');
                localStorage.setItem('token', data.token);
                // Estandarizamos el objeto de usuario
                setUser({
                    id: data.user.id,
                    name: data.user.name, // Mantenemos 'name' por si se usa en otro lado
                    fullName: data.user.fullName,
                    role: data.user.role,
                    profilePictureUrl: data.user.profilePictureUrl
                });
                checkNotificationStatus(); 
            } catch (error) {
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkAuthStatus();
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            // --- CORRECCIÓN AQUÍ: Estandarizamos el objeto de usuario ---
            // Aseguramos que las propiedades 'name' y 'fullName' existan siempre.
            setUser({
                id: data.user.id,
                name: data.user.fullName, // Asignamos fullName a name
                fullName: data.user.fullName,
                role: data.user.role,
                profilePictureUrl: data.user.profilePictureUrl
            });
            checkNotificationStatus();
            return true;
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error en el inicio de sesión', text: error.response?.data?.msg || 'Credenciales incorrectas.' });
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const updateUserContext = (newUserData) => {
        setUser(prevUser => ({ ...prevUser, ...newUserData }));
    };

    const markNotificationsAsRead = () => {
        setHasUnreadNotifications(false);
        api.post('/notifications/mark-as-read').catch(err => console.error(err));
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            setUser: updateUserContext, 
            login, 
            logout, 
            loading, 
            isAuthenticated: !!user,
            hasUnreadNotifications,
            checkNotificationStatus,
            markNotificationsAsRead
        }}>
            {children}
        </AuthContext.Provider>
    );
};
