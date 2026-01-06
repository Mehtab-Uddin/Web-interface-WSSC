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
      <BrowserRouter basename="/wsscswat">
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
        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              fontSize: '16px',
              padding: '16px 20px',
              minWidth: '300px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              fontFamily: 'Google Sans, sans-serif',
            },
            success: {
              iconTheme: {
                primary: '#198754',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#dc3545',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

