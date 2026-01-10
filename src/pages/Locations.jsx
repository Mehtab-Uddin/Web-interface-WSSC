import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Badge, Button, Spinner, Modal, Form, Row, Col, InputGroup, Nav, Tab } from 'react-bootstrap';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import TablePagination from '../components/common/TablePagination';
import ConfirmationModal from '../components/common/ConfirmationModal';
import LocationsMap from '../components/tracking/LocationsMap';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl, hasExecutivePrivileges, normalizeRole, ROLE } from '../utils/roles';

export default function Locations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
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

  const role = normalizeRole(user?.role);
  const isGeneralManager = role === ROLE.GENERAL_MANAGER;
  const isFullControlUser = hasFullControl(role);
  const canManage = isFullControlUser || isGeneralManager;
  const canEdit = isFullControlUser; // Only super_admin and CEO can edit
  const canDelete = isFullControlUser;

  // Get user departments for General Manager filtering
  const userDepartments = useMemo(() => {
    const deptFields = [
      ...(Array.isArray(user?.departments) ? user.departments : []),
      user?.department,
      user?.empDeptt,
      user?.emp_deptt,
    ].filter(Boolean);
    return Array.from(new Set(deptFields.map((d) => String(d).trim()))).filter(Boolean);
  }, [user]);

  const matchesDepartment = (deptValue, targets) => {
    if (!targets || targets.length === 0) return true;
    const normalizedTargets = targets.map((d) => String(d).trim().toLowerCase());
    const value = String(deptValue || '').trim().toLowerCase();
    return value && normalizedTargets.includes(value);
  };

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

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/locations/${deleteId}`);
      toast.success('Location deleted successfully');
      setShowConfirmModal(false);
      setDeleteId(null);
      fetchLocations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete location');
      setShowConfirmModal(false);
      setDeleteId(null);
    }
  };

  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      // Department filter for General Manager (if location has department field)
      // Note: Locations might not have department field, so this is optional
      // If locations don't have department, GM will see all locations they can manage
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        String(location.name || '').toLowerCase().includes(searchLower) ||
        String(location.code || '').toLowerCase().includes(searchLower) ||
        String(location.description || '').toLowerCase().includes(searchLower) ||
        String(location.id || '').includes(searchLower);
      
      return matchesSearch;
    });
  }, [locations, searchTerm, isGeneralManager, userDepartments]);

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

      <Tab.Container defaultActiveKey="map">
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="map">Map View</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="list">List View</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="map">
            <Card className="custom-card" style={{ padding: 0 }}>
              <LocationsMap locations={locations} />
            </Card>
          </Tab.Pane>
          <Tab.Pane eventKey="list">
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
                          {canEdit && (
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
                          )}
                          {canDelete && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteClick(location.id)}
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
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {showForm && (
        <Modal show={true} onHide={() => {
          setShowForm(false);
          setEditingLocation(null);
        }} size="lg" backdrop="static">
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

      <ConfirmationModal
        show={showConfirmModal}
        onHide={() => {
          setShowConfirmModal(false);
          setDeleteId(null);
        }}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this location?"
      />
    </div>
  );
}

