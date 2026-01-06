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
  Layers
} from 'lucide-react';
import { hasFullControl, hasExecutivePrivileges } from '../../utils/roles';

export default function Sidebar() {
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

  return (
    <aside className="sidebar-container">
      <div className="sidebar-header">
        <h3>WSSC Admin</h3>
        <p>{user?.fullName || user?.email}</p>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.path} className="nav-item-custom">
              <NavLink
                to={item.path}
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

