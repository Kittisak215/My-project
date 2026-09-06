import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useAuthStore from './store/authStore';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import ExecutiveLayout from './layouts/ExecutiveLayout';
import DriverLayout from './layouts/DriverLayout';

// Auth
import LoginPage from './pages/LoginPage';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UsersPage from './pages/admin/Users';
import VehiclesPage from './pages/admin/Vehicles';
import DriversPage from './pages/admin/Drivers';
import RepairsPage from './pages/admin/Repairs';
import GaragesPage from './pages/admin/Garages';
import AlertsPage from './pages/admin/Alerts';
import VehicleTypesPage from './pages/admin/VehicleTypes';

// Executive Pages
import ExecutiveDashboard from './pages/executive/Dashboard';
import ExpenseReportPage from './pages/executive/ExpenseReport';
import ApprovalsPage from './pages/admin/Approvals';
import FleetRegistryPage from './pages/executive/FleetRegistry';

// Driver Pages
import DriverDashboard from './pages/driver/Dashboard';
import MileagePage from './pages/driver/Mileage';
import DriverRepairPage from './pages/driver/Repair';
import DriverHistoryPage from './pages/driver/History';
import DriverProfilePage from './pages/driver/Profile';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/login" replace />;
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuthStore();
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'EXECUTIVE') return <Navigate to="/executive" replace />;
  if (user?.role === 'DRIVER') return <Navigate to="/driver" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="repairs" element={<RepairsPage />} />
          <Route path="garages" element={<GaragesPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="vehicle-types" element={<VehicleTypesPage />} />
        </Route>

        {/* Executive Routes */}
        <Route path="/executive" element={<ProtectedRoute allowedRoles={['EXECUTIVE']}><ExecutiveLayout /></ProtectedRoute>}>
          <Route index element={<ExecutiveDashboard />} />
          <Route path="expense-report" element={<ExpenseReportPage />} />
          <Route path="fleet-registry" element={<FleetRegistryPage />} />
        </Route>

        {/* Driver Routes */}
        <Route path="/driver" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverLayout /></ProtectedRoute>}>
          <Route index element={<DriverDashboard />} />
          <Route path="mileage" element={<MileagePage />} />
          <Route path="repair" element={<DriverRepairPage />} />
          <Route path="history" element={<DriverHistoryPage />} />
          <Route path="profile" element={<DriverProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
