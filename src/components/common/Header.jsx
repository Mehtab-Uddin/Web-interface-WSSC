import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { getRoleLabel } from '../../utils/roles';
import { Badge, Button } from 'react-bootstrap';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header-container">
      <div className="d-flex align-items-center justify-content-between px-3 px-md-4 h-100">
        <div className="d-flex align-items-center gap-3">
          <Button
            variant="link"
            className="d-md-none menu-toggle-btn"
            onClick={onMenuClick}
            style={{
              padding: '8px',
              color: '#333',
              border: 'none',
              background: 'transparent'
            }}
          >
            <Menu size={24} />
          </Button>
          <h2 className="mb-0 fw-bold text-dark header-title">WSSC Management System</h2>
        </div>
        <div className="d-flex align-items-center gap-2 gap-md-3">
          <div className="text-end d-none d-md-block">
            <p className="mb-0 fw-semibold text-dark">{user?.fullName || user?.email}</p>
            <Badge bg="primary">{getRoleLabel(user?.role)}</Badge>
          </div>
          <div className="d-md-none">
            <Badge bg="primary">{getRoleLabel(user?.role)}</Badge>
          </div>
          <Button
            variant="outline-danger"
            onClick={handleLogout}
            className="d-flex align-items-center gap-1 gap-md-2 logout-btn"
            size="sm"
          >
            <LogOut size={18} />
            <span className="d-none d-sm-inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

