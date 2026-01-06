import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { getRoleLabel } from '../../utils/roles';
import { Badge, Button } from 'react-bootstrap';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header-container">
      <div className="d-flex align-items-center justify-content-between px-4 h-100">
        <div>
          <h2 className="mb-0 fw-bold text-dark">WSSC Management System</h2>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-end">
            <p className="mb-0 fw-semibold text-dark">{user?.fullName || user?.email}</p>
            <Badge bg="primary">{getRoleLabel(user?.role)}</Badge>
          </div>
          <Button
            variant="outline-danger"
            onClick={handleLogout}
            className="d-flex align-items-center gap-2"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

