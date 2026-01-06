import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Badge, Button, Spinner, Modal, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import TablePagination from '../components/common/TablePagination';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl, hasExecutivePrivileges } from '../utils/roles';

export default function Locations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    centerLat: '',
    centerLng: '',
    radiusMeters: '',
    morningShiftStart: '09:00',
    morningShiftEnd: '17:00',
    nightShiftStart: '21:00',
    nightShiftEnd: '05:00'
  });

  const role = user?.role?.toLowerCase() || '';
  const canManage = hasFullControl(role) || role === 'general_manager';

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/locations');
      setLocations(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load locations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        centerLat: formData.centerLat ? parseFloat(formData.centerLat) : null,
        centerLng: formData.centerLng ? parseFloat(formData.centerLng) : null,
        radiusMeters: formData.radiusMeters ? parseInt(formData.radiusMeters) : null
      };

      if (editingLocation) {
        await api.put(`/locations/${editingLocation.id}`, payload);
        toast.success('Location updated successfully');
      } else {
        await api.post('/locations', payload);
        toast.success('Location created successfully');
      }
      setShowForm(false);
      setEditingLocation(null);
      fetchLocations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save location');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;

    try {
      await api.delete(`/locations/${id}`);
      toast.success('Location deleted successfully');
      fetchLocations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete location');
    }
  };

  const filteredLocations = locations.filter((location) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(location.name || '').toLowerCase().includes(searchLower) ||
      String(location.code || '').toLowerCase().includes(searchLower) ||
      String(location.description || '').toLowerCase().includes(searchLower) ||
      String(location.id || '').includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold">Locations Management</h1>
        {canManage && (
          <Button
            variant="primary"
            onClick={() => {
              setEditingLocation(null);
              setFormData({
                name: '',
                code: '',
                description: '',
                centerLat: '',
                centerLng: '',
                radiusMeters: '',
                morningShiftStart: '09:00',
                morningShiftEnd: '17:00',
                nightShiftStart: '21:00',
                nightShiftEnd: '05:00'
              });
              setShowForm(true);
            }}
            className="btn-custom d-flex align-items-center gap-2"
          >
            <Plus size={20} />
            <span>Add Location</span>
          </Button>
        )}
      </div>

      <Card className="custom-card mb-4">
        <Row>
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>
                <Search size={18} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control-custom"
              />
            </InputGroup>
          </Col>
        </Row>
      </Card>

      <Card className="custom-card">
        <div className="table-responsive">
          <Table className="custom-table" hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Description</th>
                <th>Coordinates</th>
                <th>Radius (m)</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedLocations.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="text-center py-4 text-muted">
                    No locations found
                  </td>
                </tr>
              ) : (
                paginatedLocations.map((location) => (
                  <tr key={location.id}>
                    <td className="fw-semibold">{location.name || 'N/A'}</td>
                    <td>{location.code || 'N/A'}</td>
                    <td>{location.description || 'N/A'}</td>
                    <td>
                      {location.center_lat && location.center_lng ? (
                        `${location.center_lat.toFixed(6)}, ${location.center_lng.toFixed(6)}`
                      ) : 'N/A'}
                    </td>
                    <td>{location.radius_meters || 'N/A'}</td>
                    {canManage && (
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setEditingLocation(location);
                              setFormData({
                                name: location.name || '',
                                code: location.code || '',
                                description: location.description || '',
                                centerLat: location.center_lat || '',
                                centerLng: location.center_lng || '',
                                radiusMeters: location.radius_meters || '',
                                morningShiftStart: location.morning_shift_start || '09:00',
                                morningShiftEnd: location.morning_shift_end || '17:00',
                                nightShiftStart: location.night_shift_start || '21:00',
                                nightShiftEnd: location.night_shift_end || '05:00'
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit size={16} />
                          </Button>
                          {hasFullControl(role) && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(location.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        {filteredLocations.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredLocations.length}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </Card>

      {showForm && (
        <Modal show={true} onHide={() => {
          setShowForm(false);
          setEditingLocation(null);
        }} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{editingLocation ? 'Edit Location' : 'Create Location'}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="form-control-custom"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Code</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="form-control-custom"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-control-custom"
                />
              </Form.Group>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Latitude</Form.Label>
                    <Form.Control
                      type="number"
                      step="any"
                      value={formData.centerLat}
                      onChange={(e) => setFormData({ ...formData, centerLat: e.target.value })}
                      className="form-control-custom"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Longitude</Form.Label>
                    <Form.Control
                      type="number"
                      step="any"
                      value={formData.centerLng}
                      onChange={(e) => setFormData({ ...formData, centerLng: e.target.value })}
                      className="form-control-custom"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Radius (meters)</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.radiusMeters}
                      onChange={(e) => setFormData({ ...formData, radiusMeters: e.target.value })}
                      className="form-control-custom"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => {
                setShowForm(false);
                setEditingLocation(null);
              }}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingLocation ? 'Update' : 'Create'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
    </div>
  );
}

