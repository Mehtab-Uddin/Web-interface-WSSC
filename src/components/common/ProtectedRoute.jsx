import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessWebInterface } from '../../utils/roles';
import { Spinner } from 'react-bootstrap';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" role="status" className="spinner-custom">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!user || !canAccessWebInterface(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

