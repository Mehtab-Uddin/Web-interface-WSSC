import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import DashboardStats from '../components/dashboard/DashboardStats';
import UsersByDepartment from '../components/dashboard/UsersByDepartment';
import { useAuth } from '../contexts/AuthContext';
import { Spinner, Row, Col } from 'react-bootstrap';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, roleDeptRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/stats-by-role-dept')
      ]);

      setStats({
        basic: statsRes.data.data,
        byRoleDept: roleDeptRes.data.data
      });
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" role="status" className="spinner-custom">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h1 className="mb-4 fw-bold">Dashboard</h1>
      <DashboardStats stats={stats} user={user} />
      <Row className="mt-4">
        <Col xs={12}>
          <UsersByDepartment user={user} />
        </Col>
      </Row>
    </div>
  );
}

