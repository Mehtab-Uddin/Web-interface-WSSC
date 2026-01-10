import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Form, Button, Spinner, Alert, Table, Badge, Modal, Tab, Tabs } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl } from '../utils/roles';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

const TAB_TYPES = {
  JOBS: 'jobs',
  GRADES: 'grades',
  MARITAL_STATUSES: 'marital-statuses',
  GENDERS: 'genders',
  SHIFT_DAYS: 'shift-days',
  SHIFT_TIMES: 'shift-times'
};

const TAB_LABELS = {
  [TAB_TYPES.JOBS]: 'Jobs',
  [TAB_TYPES.GRADES]: 'Grades',
  [TAB_TYPES.MARITAL_STATUSES]: 'Marital Statuses',
  [TAB_TYPES.GENDERS]: 'Genders',
  [TAB_TYPES.SHIFT_DAYS]: 'Shift Days',
  [TAB_TYPES.SHIFT_TIMES]: 'Shift Times'
};

export default function DropdownOptions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_TYPES.JOBS);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [formData, setFormData] = useState({
    jobId: '',
    gradeId: '',
    value: '',
    label: '',
    description: '',
    days: '',
    startTime: '',
    endTime: '',
    displayOrder: '0',
    isActive: true
  });

  const role = user?.role?.toLowerCase() || '';
  const canManage = hasFullControl(role);

  useEffect(() => {
    if (canManage) {
      loadItems();
    }
  }, [activeTab, canManage]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/dropdown-options/${activeTab}?includeInactive=true`);
      if (response.data.success) {
        setItems(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        toast.error(response.data.error || 'Failed to load items');
        setItems([]);
      }
    } catch (error) {
      toast.error('Failed to load items');
      console.error(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      jobId: '',
      gradeId: '',
      value: '',
      label: '',
      description: '',
      days: '',
      startTime: '',
      endTime: '',
      displayOrder: '0',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    if (!item) return;
    setEditingItem(item);
    try {
      if (activeTab === TAB_TYPES.JOBS) {
        setFormData({
          jobId: (item.jobId || '').toString(),
          label: item.label || '',
          description: item.description || '',
          displayOrder: (item.displayOrder || 0).toString(),
          isActive: item.isActive !== undefined ? item.isActive : true
        });
      } else if (activeTab === TAB_TYPES.GRADES) {
        setFormData({
          gradeId: (item.gradeId || '').toString(),
          label: item.label || '',
          description: item.description || '',
          displayOrder: (item.displayOrder || 0).toString(),
          isActive: item.isActive !== undefined ? item.isActive : true
        });
      } else if (activeTab === TAB_TYPES.SHIFT_DAYS) {
        setFormData({
          value: item.value || '',
          label: item.label || '',
          days: (item.days || '').toString(),
          description: item.description || '',
          displayOrder: (item.displayOrder || 0).toString(),
          isActive: item.isActive !== undefined ? item.isActive : true
        });
      } else if (activeTab === TAB_TYPES.SHIFT_TIMES) {
        setFormData({
          value: item.value || '',
          label: item.label || '',
          startTime: item.startTime || '',
          endTime: item.endTime || '',
          description: item.description || '',
          displayOrder: (item.displayOrder || 0).toString(),
          isActive: item.isActive !== undefined ? item.isActive : true
        });
      } else {
        setFormData({
          value: item.value || '',
          label: item.label || '',
          displayOrder: (item.displayOrder || 0).toString(),
          isActive: item.isActive !== undefined ? item.isActive : true
        });
      }
      setShowModal(true);
    } catch (error) {
      console.error('Error editing item:', error);
      toast.error('Failed to load item data');
    }
  };

  const handleSave = async () => {
    if (!formData.label) {
      toast.error('Label is required');
      return;
    }

    if ((activeTab === TAB_TYPES.JOBS && !formData.jobId) ||
        (activeTab === TAB_TYPES.GRADES && !formData.gradeId) ||
        ((activeTab === TAB_TYPES.MARITAL_STATUSES || activeTab === TAB_TYPES.GENDERS || 
          activeTab === TAB_TYPES.SHIFT_DAYS || activeTab === TAB_TYPES.SHIFT_TIMES) && !formData.value)) {
      const fieldName = activeTab === TAB_TYPES.JOBS ? 'Job ID' : 
                       activeTab === TAB_TYPES.GRADES ? 'Grade ID' : 'Value';
      toast.error(`${fieldName} is required`);
      return;
    }

    if (activeTab === TAB_TYPES.SHIFT_DAYS && !formData.days) {
      toast.error('Days is required');
      return;
    }

    if (activeTab === TAB_TYPES.SHIFT_TIMES && (!formData.startTime || !formData.endTime)) {
      toast.error('Start Time and End Time are required');
      return;
    }

    setSaving(true);
    try {
      let response;
      const payload = { ...formData };
      
      if (activeTab === TAB_TYPES.JOBS) {
        payload.jobId = parseInt(payload.jobId);
      } else if (activeTab === TAB_TYPES.GRADES) {
        payload.gradeId = parseInt(payload.gradeId);
      } else if (activeTab === TAB_TYPES.SHIFT_DAYS) {
        payload.days = parseInt(payload.days);
      }
      
      payload.displayOrder = parseInt(payload.displayOrder || 0);

      if (editingItem) {
        response = await api.put(`/dropdown-options/${activeTab}/${editingItem.id}`, payload);
      } else {
        response = await api.post(`/dropdown-options/${activeTab}`, payload);
      }

      if (response.data.success) {
        toast.success(editingItem ? 'Item updated successfully' : 'Item created successfully');
        setShowModal(false);
        loadItems();
      } else {
        toast.error(response.data.error || 'Failed to save item');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save item');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (item) => {
    setDeletingItem(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    setSaving(true);
    try {
      const response = await api.delete(`/dropdown-options/${activeTab}/${deletingItem.id}`);
      if (response.data.success) {
        toast.success('Item updated successfully');
        setShowDeleteModal(false);
        setDeletingItem(null);
        loadItems();
      } else {
        toast.error(response.data.error || 'Failed to update item');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update item');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="fade-in">
        <Alert variant="warning">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>Only Super Admin can access dropdown options management.</p>
        </Alert>
      </div>
    );
  }

  const renderTable = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <Alert variant="info" className="mt-3">
          No items found. Click "Add {TAB_LABELS[activeTab].slice(0, -1)}" to create one.
        </Alert>
      );
    }

    return (
      <Table striped bordered hover responsive className="mt-3">
        <thead>
          <tr>
            {activeTab === TAB_TYPES.JOBS && <th>Job ID</th>}
            {activeTab === TAB_TYPES.GRADES && <th>Grade ID</th>}
            {(activeTab === TAB_TYPES.MARITAL_STATUSES || activeTab === TAB_TYPES.GENDERS || 
              activeTab === TAB_TYPES.SHIFT_DAYS || activeTab === TAB_TYPES.SHIFT_TIMES) && <th>Value</th>}
            <th>Label</th>
            {(activeTab === TAB_TYPES.JOBS || activeTab === TAB_TYPES.GRADES || 
              activeTab === TAB_TYPES.SHIFT_DAYS || activeTab === TAB_TYPES.SHIFT_TIMES) && <th>Description</th>}
            {activeTab === TAB_TYPES.SHIFT_DAYS && <th>Days</th>}
            {activeTab === TAB_TYPES.SHIFT_TIMES && (
              <>
                <th>Start Time</th>
                <th>End Time</th>
              </>
            )}
            <th>Display Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {activeTab === TAB_TYPES.JOBS && <td>{item.jobId}</td>}
              {activeTab === TAB_TYPES.GRADES && <td>{item.gradeId}</td>}
              {(activeTab === TAB_TYPES.MARITAL_STATUSES || activeTab === TAB_TYPES.GENDERS || 
                activeTab === TAB_TYPES.SHIFT_DAYS || activeTab === TAB_TYPES.SHIFT_TIMES) && <td>{item.value}</td>}
              <td>{item.label}</td>
              {(activeTab === TAB_TYPES.JOBS || activeTab === TAB_TYPES.GRADES || 
                activeTab === TAB_TYPES.SHIFT_DAYS || activeTab === TAB_TYPES.SHIFT_TIMES) && (
                <td>{item.description || '-'}</td>
              )}
              {activeTab === TAB_TYPES.SHIFT_DAYS && <td>{item.days}</td>}
              {activeTab === TAB_TYPES.SHIFT_TIMES && (
                <>
                  <td>{item.startTime}</td>
                  <td>{item.endTime}</td>
                </>
              )}
              <td>{item.displayOrder || 0}</td>
              <td>
                <Badge bg={item.isActive ? 'success' : 'secondary'}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="p-1 me-2"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleDeleteClick(item)}
                  className="p-1 text-danger"
                  title={item.isActive ? 'Deactivate' : 'Activate'}
                >
                  <Trash2 size={16} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold">Dropdown Options Management</h1>
        <Button variant="primary" onClick={handleAdd}>
          <Plus size={20} className="me-2" />
          Add {TAB_LABELS[activeTab].slice(0, -1)}
        </Button>
      </div>

      <Card className="custom-card">
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            {Object.values(TAB_TYPES).map((tab) => (
              <Tab key={tab} eventKey={tab} title={TAB_LABELS[tab]} />
            ))}
          </Tabs>

          {renderTable()}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingItem ? 'Edit' : 'Add'} {TAB_LABELS[activeTab].slice(0, -1)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {(activeTab === TAB_TYPES.JOBS || activeTab === TAB_TYPES.GRADES) && (
              <Form.Group className="mb-3">
                <Form.Label>
                  {activeTab === TAB_TYPES.JOBS ? 'Job ID' : 'Grade ID'} *
                </Form.Label>
                <Form.Control
                  type="number"
                  value={activeTab === TAB_TYPES.JOBS ? formData.jobId : formData.gradeId}
                  onChange={(e) => setFormData({
                    ...formData,
                    [activeTab === TAB_TYPES.JOBS ? 'jobId' : 'gradeId']: e.target.value
                  })}
                  disabled={!!editingItem}
                  required
                />
              </Form.Group>
            )}

            {(activeTab === TAB_TYPES.MARITAL_STATUSES || activeTab === TAB_TYPES.GENDERS || 
              activeTab === TAB_TYPES.SHIFT_DAYS || activeTab === TAB_TYPES.SHIFT_TIMES) && (
              <Form.Group className="mb-3">
                <Form.Label>Value *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  disabled={!!editingItem}
                  required
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Label *</Form.Label>
              <Form.Control
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
              />
            </Form.Group>

            {activeTab === TAB_TYPES.SHIFT_DAYS && (
              <Form.Group className="mb-3">
                <Form.Label>Days *</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                  required
                />
              </Form.Group>
            )}

            {activeTab === TAB_TYPES.SHIFT_TIMES && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    placeholder="09:00"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>End Time *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    placeholder="17:00"
                    required
                  />
                </Form.Group>
              </>
            )}

            {(activeTab === TAB_TYPES.JOBS || activeTab === TAB_TYPES.GRADES || 
              activeTab === TAB_TYPES.SHIFT_DAYS || activeTab === TAB_TYPES.SHIFT_TIMES) && (
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Display Order</Form.Label>
              <Form.Control
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
            <X size={16} className="me-2" />
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="me-2" />
                Save
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Confirm Action"
        message={`Are you sure you want to ${deletingItem?.isActive ? 'deactivate' : 'activate'} this item?`}
        confirmText={deletingItem?.isActive ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
      />
    </div>
  );
}

