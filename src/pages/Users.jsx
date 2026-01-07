import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Button, Card, Table, Badge, Form, InputGroup, Row, Col, Spinner } from 'react-bootstrap';
import SearchableSelect from '../components/common/SearchableSelect';
import TablePagination from '../components/common/TablePagination';
import ConfirmationModal from '../components/common/ConfirmationModal';
import UserForm from '../components/users/UserForm';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl, getRoleLabel, getRoleBadgeColor, ROLE_OPTIONS, normalizeRole, ROLE } from '../utils/roles';
import { formatDate, formatStaffName } from '../utils/format.jsx';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const role = normalizeRole(currentUser?.role);
  const isGeneralManager = role === ROLE.GENERAL_MANAGER;
  const isFullControlUser = hasFullControl(role);
  const canCreate = isFullControlUser || isGeneralManager;
  const canEdit = isFullControlUser; // Only super_admin and CEO can edit
  const canDelete = isFullControlUser;

  // Get user departments for General Manager filtering
  const userDepartments = useMemo(() => {
    const deptFields = [
      ...(Array.isArray(currentUser?.departments) ? currentUser.departments : []),
      currentUser?.department,
      currentUser?.empDeptt,
      currentUser?.emp_deptt,
    ].filter(Boolean);
    return Array.from(new Set(deptFields.map((d) => String(d).trim()))).filter(Boolean);
  }, [currentUser]);

  const matchesDepartment = (deptValue, targets) => {
    if (!targets || targets.length === 0) return true;
    const normalizedTargets = targets.map((d) => String(d).trim().toLowerCase());
    const value = String(deptValue || '').trim().toLowerCase();
    return value && normalizedTargets.includes(value);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (userId) => {
    setDeleteId(userId);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/users/${deleteId}`);
      toast.success('User deleted successfully');
      setShowConfirmModal(false);
      setDeleteId(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
      setShowConfirmModal(false);
      setDeleteId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Department filter for General Manager
      if (isGeneralManager && userDepartments.length > 0) {
        const userDept = user.emp_deptt || user.empDeptt || user.department;
        if (!matchesDepartment(userDept, userDepartments)) {
          return false;
        }
      }

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        String(user.full_name || '').toLowerCase().includes(searchLower) ||
        String(user.email || '').toLowerCase().includes(searchLower) ||
        String(user.username || '').toLowerCase().includes(searchLower);
      const matchesRole = !filterRole || user.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole, isGeneralManager, userDepartments]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

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
        <h1 className="fw-bold">Users Management</h1>
        {canCreate && (
          <Button
            variant="primary"
            onClick={() => {
              setEditingUser(null);
              setShowForm(true);
            }}
            className="btn-custom d-flex align-items-center gap-2"
          >
            <Plus size={20} />
            <span>Add User</span>
          </Button>
        )}
      </div>

      <Card className="custom-card mb-4">
        <Row className="g-3">
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>
                <Search size={18} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control-custom"
              />
            </InputGroup>
          </Col>
          <Col md={6}>
            <SearchableSelect
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              options={[{ value: '', label: 'All Roles' }, ...ROLE_OPTIONS]}
              placeholder="All Roles"
              searchPlaceholder="Search roles..."
              getOptionLabel={(option) => option.label || 'All Roles'}
              getOptionValue={(option) => option.value || ''}
              className="form-control-custom"
            />
          </Col>
        </Row>
      </Card>

      <Card className="custom-card">
        <div className="table-responsive">
          <Table className="custom-table" hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                {canCreate && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={canCreate ? 7 : 6} className="text-center py-4 text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td className="fw-semibold">{formatStaffName(user)}</td>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td>
                      <Badge bg={getRoleBadgeColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td>{user.emp_deptt || user.department || 'N/A'}</td>
                    <td>
                      <Badge bg={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {canCreate && (
                      <td>
                        <div className="d-flex gap-2">
                          {canEdit && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
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
                              onClick={() => handleDeleteClick(user.user_id)}
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
        {filteredUsers.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredUsers.length}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </Card>

      {showForm && (
        <UserForm
          user={editingUser}
          onClose={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}

      <ConfirmationModal
        show={showConfirmModal}
        onHide={() => {
          setShowConfirmModal(false);
          setDeleteId(null);
        }}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this user?"
      />
    </div>
  );
}

