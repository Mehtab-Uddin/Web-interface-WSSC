import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl } from '../utils/roles';

export default function SystemSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    gracePeriodMinutes: 15,
    minClockIntervalHours: 6
  });

  const role = user?.role?.toLowerCase() || '';
  const canManage = hasFullControl(role);

  useEffect(() => {
    if (canManage) {
      fetchConfig();
    }
  }, [canManage]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await api.get('/system/config');
      if (response.data.data) {
        setConfig(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load system configuration');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/system/config', config);
      toast.success('System configuration updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="fade-in">
        <Alert variant="warning">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>Only Super Admin and CEO can access system settings.</p>
        </Alert>
      </div>
    );
  }

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
      <h1 className="mb-4 fw-bold">System Settings</h1>

      <Card className="custom-card">
        <Card.Body>
          <div className="card-header-custom mb-3">
            <h4>Attendance Settings</h4>
            <p className="text-muted mb-0">Configure grace period and clock interval requirements</p>
          </div>
          <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">
              Grace Period (Minutes)
            </Form.Label>
            <Form.Control
              type="number"
              min="0"
              max="1440"
              value={config.gracePeriodMinutes}
              onChange={(e) => setConfig({ ...config, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
              className="form-control-custom"
              required
            />
            <Form.Text className="text-muted">
              Time after Shift Start time until which clock-in won't be marked as late (0-1440 minutes / 24 hours)
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">
              Minimum Clock Interval (Hours)
            </Form.Label>
            <Form.Control
              type="number"
              min="0"
              max="24"
              step="0.1"
              value={config.minClockIntervalHours}
              onChange={(e) => setConfig({ ...config, minClockIntervalHours: parseFloat(e.target.value) || 0 })}
              className="form-control-custom"
              required
            />
            <Form.Text className="text-muted">
              Minimum time required between clock-in and clock-out (0-24 hours)
            </Form.Text>
          </Form.Group>

          <Button variant="primary" type="submit" disabled={saving} className="btn-custom">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

