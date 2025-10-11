import React, { useState, useEffect, useContext } from 'react';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';

const NotificationDropdown = ({ isOpen, onClear }) => {
    const { hasUnreadNotifications } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasBeenCleared, setHasBeenCleared] = useState(false);

    useEffect(() => {
        // Si el contexto nos dice que hay una nueva notificación (el punto rojo se encendió),
        // reseteamos nuestro estado de "limpiado" para permitir que se vuelvan a cargar.
        if (hasUnreadNotifications) {
            setHasBeenCleared(false);
        }
    }, [hasUnreadNotifications]);

    useEffect(() => {
        // Solo buscamos notificaciones si el panel está abierto Y no ha sido limpiado manualmente.
        if (isOpen && !hasBeenCleared) {
            setLoading(true);
            api.get('/notifications')
                .then(response => {
                    setNotifications(response.data);
                })
                .catch(error => console.error("Error fetching notifications:", error))
                .finally(() => setLoading(false));
        } else if (!isOpen) {
            // No hacemos nada aquí para mantener el estado
        }
    }, [isOpen, hasBeenCleared]); // Se añade hasBeenCleared a las dependencias

    const handleClearNotifications = () => {
        // --- LÓGICA ORIGINAL RESTAURADA ---
        api.post('/notifications/mark-as-read').catch(err => console.error("Could not contact server to mark notifications as read", err));
        setNotifications([]); // Limpiamos la lista visualmente
        setHasBeenCleared(true); // Marcamos que ya se limpió para que no vuelva a cargar en esta sesión
        if (onClear) {
            onClear(); // Avisamos al Header que apague el punto rojo
        }
    };

    if (!isOpen) return null;

    const getIconForType = (type) => {
        switch (type) {
            case 'stock_alert': return '📦';
            case 'payment_due': return '🚨';
            case 'payment_soon': return '⏳';
            default: return '🔔';
        }
    };

    return (
        <div className="absolute top-14 right-0 w-80 bg-white rounded-lg shadow-xl border z-50 animate-fade-in-down flex flex-col">
            <div className="p-4 font-bold border-b text-gray-700">Notificaciones</div>
            <div className="max-h-80 overflow-y-auto">
                {loading ? <div className="p-4 text-center text-sm text-gray-500">Cargando...</div> :
                    notifications.length > 0 ? (
                        notifications.map(notif => (
                            <div key={notif.id} className="p-4 border-b last:border-b-0 hover:bg-gray-50 flex items-start gap-3">
                                <span className="mt-1 text-xl">{getIconForType(notif.type)}</span>
                                <p className="text-sm text-gray-800">{notif.message}</p>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm text-gray-500">No hay notificaciones nuevas.</div>
                    )}
            </div>
            {notifications.length > 0 && (
                <div className="p-2 border-t">
                    <button 
                        onClick={handleClearNotifications}
                        className="w-full text-center text-sm text-blue-600 hover:bg-gray-100 p-2 rounded-md"
                    >
                        Marcar todas como leídas
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;