import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  UserCheck,
  MapPin,
  Building,
  FileText,
  CheckCircle,
  Settings,
  Activity,
  BarChart3,
  Layers,
  X
} from 'lucide-react';
import { hasFullControl, hasExecutivePrivileges } from '../../utils/roles';
import { Button } from 'react-bootstrap';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || '';
  const isSuperAdmin = role === 'super_admin';
  const isCEO = role === 'ceo';
  const isGM = role === 'general_manager';
  const hasFullAccess = hasFullControl(role);
  const hasExecAccess = hasExecutivePrivileges(role);

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', access: true },
    { path: '/users', icon: Users, label: 'Users', access: hasFullAccess || isGM },
    { path: '/attendance', icon: Clock, label: 'Attendance', access: hasExecAccess },
    { path: '/leave', icon: Calendar, label: 'Leave Management', access: hasExecAccess },
    { path: '/assignments', icon: UserCheck, label: 'Assignments', access: hasExecAccess },
    { path: '/locations', icon: MapPin, label: 'Locations', access: hasFullAccess || isGM },
    { path: '/zones', icon: Layers, label: 'Beats', access: hasFullAccess || isGM },
    { path: '/departments', icon: Building, label: 'Departments', access: hasFullAccess },
    { path: '/performance', icon: FileText, label: 'Performance', access: hasExecAccess },
    { path: '/approvals', icon: CheckCircle, label: 'Approvals', access: hasExecAccess },
    { path: '/holidays', icon: Calendar, label: 'Holidays', access: hasFullAccess },
    { path: '/live-tracking', icon: Activity, label: 'Live Tracking', access: hasExecAccess },
    { path: '/reports', icon: BarChart3, label: 'Reports', access: hasExecAccess },
    { path: '/settings', icon: Settings, label: 'Settings', access: hasFullAccess },
  ].filter(item => item.access);

  const handleNavClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h3>WSSC Admin</h3>
            <p>{user?.fullName || user?.email}</p>
          </div>
          <Button
            variant="link"
            className="d-md-none close-sidebar-btn"
            onClick={onClose}
            style={{
              padding: '4px',
              color: 'white',
              border: 'none',
              background: 'transparent'
            }}
          >
            <X size={20} />
          </Button>
        </div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.path} className="nav-item-custom">
              <NavLink
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `nav-link-custom ${isActive ? 'active' : ''}`
                }
              >
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

