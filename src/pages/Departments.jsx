import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Button, Spinner, Modal, Form, InputGroup, Row, Col } from 'react-bootstrap';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import TablePagination from '../components/common/TablePagination';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl } from '../utils/roles';

export default function Departments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    deptId: '',
    label: '',
    description: ''
  });

  const role = user?.role?.toLowerCase() || '';
  const canManage = hasFullControl(role);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load departments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, formData);
        toast.success('Department updated successfully');
      } else {
        await api.post('/departments', formData);
        toast.success('Department created successfully');
      }
      setShowForm(false);
      setEditingDept(null);
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save department');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;

    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department deleted successfully');
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete department');
    }
  };

  const filteredDepartments = departments.filter((dept) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(dept.deptId || '').toLowerCase().includes(searchLower) ||
      String(dept.label || '').toLowerCase().includes(searchLower) ||
      String(dept.description || '').toLowerCase().includes(searchLower) ||
      String(dept.id || '').includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDepartments = filteredDepartments.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
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
        <h1 className="fw-bold">Departments Management</h1>
        {canManage && (
          <Button
            variant="primary"
            onClick={() => {
              setEditingDept(null);
              setFormData({ deptId: '', label: '', description: '' });
              setShowForm(true);
            }}
            className="btn-custom d-flex align-items-center gap-2"
          >
            <Plus size={20} />
            <span>Add Department</span>
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
                placeholder="Search departments..."
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
                <th>ID</th>
                <th>Label</th>
                <th>Description</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedDepartments.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="text-center py-4 text-muted">
                    No departments found
                  </td>
                </tr>
              ) : (
                paginatedDepartments.map((dept) => (
                  <tr key={dept.id}>
                    <td>{dept.deptId || dept.id}</td>
                    <td className="fw-semibold">{dept.label || 'N/A'}</td>
                    <td>{dept.description || 'N/A'}</td>
                    <td>
                      <span className={`badge bg-${dept.isActive ? 'success' : 'secondary'}`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setEditingDept(dept);
                              setFormData({
                                deptId: dept.deptId || '',
                                label: dept.label || '',
                                description: dept.description || ''
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(dept.id)}
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
        {filteredDepartments.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredDepartments.length}
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
          setEditingDept(null);
        }}>
          <Modal.Header closeButton>
            <Modal.Title>{editingDept ? 'Edit Department' : 'Create Department'}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Department ID *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.deptId}
                  onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}
                  required
                  className="form-control-custom"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Label *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
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
                setEditingDept(null);
              }}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingDept ? 'Update' : 'Create'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
    </div>
  );
}

