import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Badge, Button, Spinner, Modal, Form, InputGroup, Row, Col } from 'react-bootstrap';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import TablePagination from '../components/common/TablePagination';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { formatDate } from '../utils/format.jsx';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl } from '../utils/roles';

export default function Holidays() {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    description: ''
  });

  const role = user?.role?.toLowerCase() || '';
  const canManage = hasFullControl(role);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const response = await api.get('/holidays');
      setHolidays(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load holidays');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        await api.put(`/holidays/${editingHoliday.id}`, formData);
        toast.success('Holiday updated successfully');
      } else {
        await api.post('/holidays', formData);
        toast.success('Holiday created successfully');
      }
      setShowForm(false);
      setEditingHoliday(null);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save holiday');
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/holidays/${deleteId}`);
      toast.success('Holiday deleted successfully');
      setShowConfirmModal(false);
      setDeleteId(null);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete holiday');
      setShowConfirmModal(false);
      setDeleteId(null);
    }
  };

  const filteredHolidays = holidays.filter((holiday) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(holiday.name || '').toLowerCase().includes(searchLower) ||
      String(holiday.description || '').toLowerCase().includes(searchLower) ||
      formatDate(holiday.date).toLowerCase().includes(searchLower) ||
      String(holiday.created_by?.name || '').toLowerCase().includes(searchLower) ||
      String(holiday.id || '').includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredHolidays.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHolidays = filteredHolidays.slice(startIndex, endIndex);

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
        <h1 className="fw-bold">Holidays Management</h1>
        {canManage && (
          <Button
            variant="primary"
            onClick={() => {
              setEditingHoliday(null);
              setFormData({ date: '', name: '', description: '' });
              setShowForm(true);
            }}
            className="btn-custom d-flex align-items-center gap-2"
          >
            <Plus size={20} />
            <span>Add Holiday</span>
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
                placeholder="Search holidays..."
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
                <th>Date</th>
                <th>Name</th>
                <th>Description</th>
                <th>Created By</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedHolidays.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="text-center py-4 text-muted">
                    No holidays found
                  </td>
                </tr>
              ) : (
                paginatedHolidays.map((holiday) => (
                  <tr key={holiday.id}>
                    <td className="fw-semibold">{formatDate(holiday.date)}</td>
                    <td>{holiday.name || 'N/A'}</td>
                    <td>{holiday.description || 'N/A'}</td>
                    <td>{holiday.created_by?.name || 'N/A'}</td>
                    {canManage && (
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setEditingHoliday(holiday);
                              setFormData({
                                date: holiday.date || '',
                                name: holiday.name || '',
                                description: holiday.description || ''
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteClick(holiday.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        {filteredHolidays.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredHolidays.length}
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
          setEditingHoliday(null);
        }}>
          <Modal.Header closeButton>
            <Modal.Title>{editingHoliday ? 'Edit Holiday' : 'Create Holiday'}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Date *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="form-control-custom"
                />
              </Form.Group>
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
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => {
                setShowForm(false);
                setEditingHoliday(null);
              }}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingHoliday ? 'Update' : 'Create'}
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
        message="Are you sure you want to delete this holiday?"
      />
    </div>
  );
}

