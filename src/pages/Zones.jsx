import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Button, Spinner, Modal, Form, Row, Col, InputGroup, Nav, Tab } from 'react-bootstrap';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import SearchableSelect from '../components/common/SearchableSelect';
import TablePagination from '../components/common/TablePagination';
import ConfirmationModal from '../components/common/ConfirmationModal';
import ZonesMap from '../components/tracking/ZonesMap';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl, hasExecutivePrivileges, normalizeRole, ROLE } from '../utils/roles';

export default function Zones() {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    locationId: '',
    description: '',
    centerLat: '',
    centerLng: '',
    radiusMeters: ''
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
    fetchZones();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await api.get('/zones');
      setZones(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load beats');
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

      if (editingZone) {
        await api.put(`/zones/${editingZone.id}`, payload);
        toast.success('Beat updated successfully');
      } else {
        await api.post('/zones', payload);
        toast.success('Beat created successfully');
      }
      setShowForm(false);
      setEditingZone(null);
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save beat');
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/zones/${deleteId}`);
      toast.success('Beat deleted successfully');
      setShowConfirmModal(false);
      setDeleteId(null);
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete beat');
      setShowConfirmModal(false);
      setDeleteId(null);
    }
  };

  const filteredZones = useMemo(() => {
    return zones.filter((zone) => {
      // Department filter for General Manager (if zone has department field)
      // Note: Zones might not have department field directly, so this is optional
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        String(zone.name || '').toLowerCase().includes(searchLower) ||
        String(zone.location_name || '').toLowerCase().includes(searchLower) ||
        String(zone.description || '').toLowerCase().includes(searchLower) ||
        String(zone.id || '').includes(searchLower);
      
      return matchesSearch;
    });
  }, [zones, searchTerm, isGeneralManager, userDepartments]);

  // Pagination
  const totalPages = Math.ceil(filteredZones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedZones = filteredZones.slice(startIndex, endIndex);

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
        <h1 className="fw-bold">Beats Management</h1>
        {canManage && (
          <Button
            variant="primary"
            onClick={() => {
              setEditingZone(null);
              setFormData({
                name: '',
                locationId: '',
                description: '',
                centerLat: '',
                centerLng: '',
                radiusMeters: ''
              });
              setShowForm(true);
            }}
            className="btn-custom d-flex align-items-center gap-2"
          >
            <Plus size={20} />
            <span>Add Beat</span>
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
              <ZonesMap zones={zones} />
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
                      placeholder="Search beats..."
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
                <th>Location</th>
                <th>Description</th>
                <th>Coordinates</th>
                <th>Radius (m)</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedZones.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="text-center py-4 text-muted">
                    No beats found
                  </td>
                </tr>
              ) : (
                paginatedZones.map((zone) => (
                  <tr key={zone.id}>
                    <td className="fw-semibold">{zone.name || 'N/A'}</td>
                    <td>{zone.location_name || 'N/A'}</td>
                    <td>{zone.description || 'N/A'}</td>
                    <td>
                      {zone.center_lat && zone.center_lng ? (
                        `${zone.center_lat.toFixed(6)}, ${zone.center_lng.toFixed(6)}`
                      ) : 'N/A'}
                    </td>
                    <td>{zone.radius_meters || 'N/A'}</td>
                    {canManage && (
                      <td>
                        <div className="d-flex gap-2">
                          {canEdit && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setEditingZone(zone);
                                setFormData({
                                  name: zone.name || '',
                                  locationId: zone.location_id || '',
                                  description: zone.description || '',
                                  centerLat: zone.center_lat || '',
                                  centerLng: zone.center_lng || '',
                                  radiusMeters: zone.radius_meters || ''
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
                              onClick={() => handleDeleteClick(zone.id)}
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
        {filteredZones.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredZones.length}
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
          setEditingZone(null);
        }} size="lg" backdrop="static">
          <Modal.Header closeButton>
            <Modal.Title>{editingZone ? 'Edit Beat' : 'Create Beat'}</Modal.Title>
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
                    <Form.Label className="form-label-custom">Location *</Form.Label>
                    <SearchableSelect
                      value={formData.locationId}
                      onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                      options={locations}
                      placeholder="Select Location"
                      searchPlaceholder="Search locations..."
                      getOptionLabel={(loc) => loc.name}
                      getOptionValue={(loc) => loc.id}
                      required
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
                setEditingZone(null);
              }}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingZone ? 'Update' : 'Create'}
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
        message="Are you sure you want to delete this beat?"
      />
    </div>
  );
}

