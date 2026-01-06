import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Button, Spinner, Form, Row, Col, Badge } from 'react-bootstrap';
import { RefreshCw } from 'lucide-react';
import SearchableSelect from '../components/common/SearchableSelect';
import LiveTrackingMap from '../components/tracking/LiveTrackingMap';
import { formatStaffName, formatStaffNameString } from '../utils/format.jsx';

export default function LiveTracking() {
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    staffId: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [staffList, setStaffList] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    fetchTracking();
    fetchStaff();
    
    // Set up auto-refresh every 10 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchTracking();
      }, 10000); // Refresh every 10 seconds
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/users/staff');
      setStaffList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchTracking = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.staffId) params.append('staffId', filters.staffId);
      if (filters.date) params.append('date', filters.date);

      const response = await api.get(`/live-tracking?${params.toString()}`);
      const data = response.data.data || [];
      setTrackingData(data);
    } catch (error) {
      toast.error('Failed to load live tracking data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh when filters change
  useEffect(() => {
    fetchTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.staffId, filters.date]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Filter tracking data to show only those with locations
  const activeTrackingData = trackingData.filter(track => {
    const locations = track.locations 
      ? (typeof track.locations === 'string' ? JSON.parse(track.locations) : track.locations)
      : [];
    return locations.length > 0;
  });

  if (loading && trackingData.length === 0) {
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold">Live Tracking</h1>
        <div className="d-flex align-items-center gap-2">
          <Badge bg={autoRefresh ? 'success' : 'secondary'} className="px-3 py-2">
            {autoRefresh ? 'Auto-Refresh: ON' : 'Auto-Refresh: OFF'}
          </Badge>
          <Button
            variant="outline-primary"
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            {autoRefresh ? 'Disable Auto-Refresh' : 'Enable Auto-Refresh'}
          </Button>
          <Button
            variant="primary"
            onClick={fetchTracking}
            size="sm"
            className="d-flex align-items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh Now
          </Button>
        </div>
      </div>

      <Card className="custom-card mb-3">
        <Row className="g-3">
          <Col md={4}>
            <Form.Label className="form-label-custom">Staff Member</Form.Label>
            <SearchableSelect
              value={filters.staffId}
              onChange={(e) => handleFilterChange('staffId', e.target.value)}
              options={[{ id: '', name: 'All Staff' }, ...staffList]}
              placeholder="All Staff"
              searchPlaceholder="Search staff..."
              getOptionLabel={(staff) => staff.id === '' ? 'All Staff' : formatStaffNameString(staff)}
              getOptionValue={(staff) => staff.user_id || staff.id || ''}
              className="form-control-custom"
            />
          </Col>
          <Col md={4}>
            <Form.Label className="form-label-custom">Date</Form.Label>
            <Form.Control
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="form-control-custom"
            />
          </Col>
          <Col md={4} className="d-flex align-items-end">
            <Button variant="primary" onClick={fetchTracking} className="w-100">
              Apply Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {activeTrackingData.length > 0 && (
        <Card className="custom-card mb-3">
          <div className="d-flex flex-wrap gap-2">
            <small className="text-muted me-2">Active Staff:</small>
            {activeTrackingData.map((track, index) => {
              const locations = track.locations 
                ? (typeof track.locations === 'string' ? JSON.parse(track.locations) : track.locations)
                : [];
              const color = ['#0d6efd', '#dc3545', '#198754', '#ffc107', '#0dcaf0', '#6610f2', '#e83e8c', '#fd7e14', '#20c997', '#6f42c1'][index % 10];
              return (
                <Badge 
                  key={track.id} 
                  bg="light" 
                  text="dark"
                  style={{ borderLeft: `4px solid ${color}` }}
                  className="px-3 py-2"
                >
                  {formatStaffName(track)} ({locations.length} points)
                  {track.is_active && <Badge bg="success" className="ms-2">Active</Badge>}
                </Badge>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="custom-card" style={{ padding: 0 }}>
        <LiveTrackingMap trackingData={activeTrackingData} />
      </Card>
    </div>
  );
}

