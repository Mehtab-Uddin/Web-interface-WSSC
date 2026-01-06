import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { canAccessWebInterface } from '../utils/roles';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser && canAccessWebInterface(currentUser.role)) {
      setUser(currentUser);
    } else if (currentUser) {
      // User doesn't have access, clear storage
      authService.logout();
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    if (canAccessWebInterface(response.user.role)) {
      setUser(response.user);
      return response;
    } else {
      authService.logout();
      const accessError = new Error('Access denied');
      accessError.isAccessDenied = true;
      throw accessError;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

