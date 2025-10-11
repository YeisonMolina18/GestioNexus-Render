import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const DashboardLayout = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const hideGlobalSearchOnRoutes = [
        '/reports', 
        '/sales-history', 
        '/sales', 
        '/dashboard', 
        '/profile', 
        '/metrics'
    ];
    
    const showGlobalSearch = !hideGlobalSearchOnRoutes.includes(location.pathname);

    return (
        <div className="relative flex h-screen bg-[#F3F4F6]">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            {isSidebarOpen && <div onClick={toggleSidebar} className="fixed inset-0 bg-black opacity-50 z-20 lg:hidden"></div>}

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* --- CAMBIOS PARA RESPONSIVIDAD AQUÍ --- */}
                {/* Hemos ajustado los márgenes (m) y el padding (p) para que sean más adaptativos.
                  - En pantallas pequeñas, los márgenes son más pequeños (m-2).
                  - En pantallas medianas (md), crecen un poco (m-4).
                  - En pantallas grandes (lg), son más amplios (m-6).
                  Esto evita que el contenedor principal ocupe demasiado espacio en pantallas de portátiles.
                */}
                <div className="flex-1 p-4 sm:p-6 m-2 md:m-4 lg:m-6 bg-white rounded-2xl shadow-xl">
                    <Header 
                        searchTerm={searchTerm} 
                        setSearchTerm={setSearchTerm} 
                        toggleSidebar={toggleSidebar}
                        showGlobalSearch={showGlobalSearch}
                    />
                    <main className="mt-6 md:mt-8">
                        <Outlet context={{ searchTerm, setSearchTerm }} />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;