import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

// Importaciones de todas nuestras páginas
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import LayawayPage from './pages/LayawayPage';
import SalesPage from './pages/SalesPage';
import EmployeesPage from './pages/EmployeesPage';
import ReportsPage from './pages/ReportsPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import AuditLogPage from './pages/AuditLogPage';
import SuppliersPage from './pages/SuppliersPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MetricsPage from './pages/MetricsPage';

// Componente para proteger rutas según si el usuario está logueado
const AuthGuard = () => {
    const { isAuthenticated, loading } = useContext(AuthContext);
    if (loading) return <div>Cargando...</div>;
    return isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />;
};

// Componente para proteger rutas de administrador
const AdminGuard = ({ children }) => {
    const { user } = useContext(AuthContext);
    // Si el usuario tiene el rol de admin, muestra la página. Si no, lo redirige.
    return user.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <Routes>
      {/* --- RUTAS PÚBLICAS --- */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      
      {/* --- RUTA RAÍZ --- */}
      <Route path="/" element={<Navigate to="/dashboard" />} />

      {/* --- RUTAS PROTEGIDAS Y ANIDADAS --- */}
      <Route element={<AuthGuard />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="layaway" element={<LayawayPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          
          {/* Rutas que además de login, requieren ser admin */}
          <Route path="employees" element={<AdminGuard><EmployeesPage /></AdminGuard>} />
          <Route path="reports" element={<AdminGuard><ReportsPage /></AdminGuard>} />
          <Route path="sales-history" element={<AdminGuard><SalesHistoryPage /></AdminGuard>} />
          <Route path="audit-log" element={<AdminGuard><AuditLogPage /></AdminGuard>} />
          <Route path="suppliers" element={<AdminGuard><SuppliersPage /></AdminGuard>} />
          <Route path="metrics" element={<AdminGuard><MetricsPage /></AdminGuard>} />
      </Route>
    </Routes>
  );
}

export default App;