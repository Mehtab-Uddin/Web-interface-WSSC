import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Assignments from './pages/Assignments';
import Locations from './pages/Locations';
import Zones from './pages/Zones';
import Departments from './pages/Departments';
import Performance from './pages/Performance';
import Approvals from './pages/Approvals';
import Holidays from './pages/Holidays';
import LiveTracking from './pages/LiveTracking';
import Reports from './pages/Reports';
import SystemSettings from './pages/SystemSettings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="locations" element={<Locations />} />
            <Route path="zones" element={<Zones />} />
            <Route path="departments" element={<Departments />} />
            <Route path="performance" element={<Performance />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="holidays" element={<Holidays />} />
            <Route path="live-tracking" element={<LiveTracking />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

