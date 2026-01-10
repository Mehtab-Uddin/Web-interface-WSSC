import { useState, useEffect, useMemo } from 'react';
import { Card, Form, Table, Badge, Spinner, Row, Col, InputGroup } from 'react-bootstrap';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Clock, Search, X } from 'lucide-react';

export default function UsersByDepartment({ user: currentUser }) {
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState([]);
  const [usersData, setUsersData] = useState(null);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/departments');
        setDepartments(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch users by department
  useEffect(() => {
    const fetchUsersByDepartment = async () => {
      setLoading(true);
      try {
        const params = selectedDepartment !== 'all' ? { departmentId: selectedDepartment } : {};
        console.log('[Frontend] Fetching users with params:', params);
        const response = await api.get('/dashboard/users-by-department', { params });
        console.log('[Frontend] Response data:', {
          usersCount: response.data.data?.users?.length,
          byDepartmentKeys: Object.keys(response.data.data?.byDepartment || {}),
          stats: response.data.data?.stats
        });
        setUsersData(response.data.data);
      } catch (error) {
        toast.error('Failed to load users by department');
        console.error('[Frontend] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersByDepartment();
  }, [selectedDepartment]);

  const getStatusBadge = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('present')) {
      return <Badge bg="success">Present</Badge>;
    } else if (statusLower.includes('absent')) {
      return <Badge bg="danger">Absent</Badge>;
    } else if (statusLower.includes('leave')) {
      return <Badge bg="warning">On Leave</Badge>;
    } else if (statusLower.includes('holiday')) {
      return <Badge bg="info">Holiday</Badge>;
    }
    return <Badge bg="secondary">{status}</Badge>;
  };

  const selectedDepartmentLabel = useMemo(() => {
    if (selectedDepartment === 'all') return null;
    const dept = departments.find(d => d.id === selectedDepartment);
    const label = dept ? dept.label : null;
    console.log('[Frontend] Selected department:', {
      selectedDepartment,
      foundDept: dept,
      label
    });
    return label;
  }, [selectedDepartment, departments]);

  const departmentFilteredUsers = useMemo(() => {
    if (!usersData) return [];
    if (selectedDepartment === 'all') {
      return usersData.users || [];
    }
    // Filter by department label since backend groups by label
    if (selectedDepartmentLabel) {
      console.log('[Frontend] Filtering users:', {
        selectedDepartmentLabel,
        availableKeys: Object.keys(usersData.byDepartment || {}),
        foundUsers: usersData.byDepartment[selectedDepartmentLabel]?.length || 0
      });
      return usersData.byDepartment[selectedDepartmentLabel] || [];
    }
    console.log('[Frontend] No department label found, returning empty array');
    return [];
  }, [usersData, selectedDepartment, selectedDepartmentLabel]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return departmentFilteredUsers;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    return departmentFilteredUsers.filter(user => {
      // Search in name
      const fullName = (user.full_name || '').toLowerCase();
      // Search in email
      const email = (user.email || '').toLowerCase();
      // Search in employee number
      const empNo = (user.emp_no || '').toString().toLowerCase();
      // Search in department
      const department = (user.department || '').toLowerCase();
      // Search in role
      const role = (user.role || '').toLowerCase().replace('_', ' ');
      // Search in status
      const status = (user.status || '').toLowerCase();
      // Search in status detail
      const statusDetail = (user.status_detail || '').toLowerCase();

      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        empNo.includes(searchLower) ||
        department.includes(searchLower) ||
        role.includes(searchLower) ||
        status.includes(searchLower) ||
        statusDetail.includes(searchLower)
      );
    });
  }, [departmentFilteredUsers, searchTerm]);

  const departmentStats = useMemo(() => {
    if (!usersData) return null;
    if (selectedDepartment === 'all') {
      return usersData.summary;
    }
    // Find stats by department label
    if (selectedDepartmentLabel) {
      const stats = usersData.stats?.find(s => s.department === selectedDepartmentLabel);
      return stats ? {
        total: stats.total,
        present: stats.present,
        absent: stats.absent,
        onLeave: stats.onLeave,
        holiday: stats.holiday
      } : null;
    }
    return null;
  }, [usersData, selectedDepartment, selectedDepartmentLabel]);

  const formatTime = (datetime) => {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !usersData) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Card className="custom-card">
      <div className="card-header-custom">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <h4 className="mb-0">Users by Department</h4>
          <Form.Select
            style={{ maxWidth: '300px' }}
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.label}
              </option>
            ))}
          </Form.Select>
        </div>
        <InputGroup>
          <InputGroup.Text>
            <Search size={16} />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search by name, email, employee #, department, role, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <InputGroup.Text 
              style={{ cursor: 'pointer' }}
              onClick={() => setSearchTerm('')}
            >
              <X size={16} />
            </InputGroup.Text>
          )}
        </InputGroup>
      </div>

      {departmentStats && (
        <div className="p-3 bg-light border-bottom">
          <Row className="g-3">
            <Col xs={6} sm={4} md={2}>
              <div className="text-center">
                <div className="fw-bold text-primary fs-4">{departmentStats.total}</div>
                <div className="text-muted small">Total</div>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div className="text-center">
                <div className="fw-bold text-success fs-4">{departmentStats.present}</div>
                <div className="text-muted small">Present</div>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div className="text-center">
                <div className="fw-bold text-danger fs-4">{departmentStats.absent}</div>
                <div className="text-muted small">Absent</div>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div className="text-center">
                <div className="fw-bold text-warning fs-4">{departmentStats.onLeave}</div>
                <div className="text-muted small">On Leave</div>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div className="text-center">
                <div className="fw-bold text-info fs-4">{departmentStats.holiday}</div>
                <div className="text-muted small">Holiday</div>
              </div>
            </Col>
          </Row>
        </div>
      )}

      <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <Table hover className="mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th>Name</th>
              <th>Employee #</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
                  {searchTerm ? `No users found matching "${searchTerm}"` : 'No users found'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="fw-semibold">{user.full_name}</div>
                    {user.email && (
                      <div className="text-muted small">{user.email}</div>
                    )}
                  </td>
                  <td>{user.emp_no || 'N/A'}</td>
                  <td>{user.department}</td>
                  <td>
                    <span className="text-capitalize">
                      {user.role?.replace('_', ' ') || 'N/A'}
                    </span>
                  </td>
                  <td>{getStatusBadge(user.status)}</td>
                  <td>
                    {user.clock_in ? (
                      <div className="d-flex align-items-center gap-1">
                        <Clock size={14} />
                        <span>{formatTime(user.clock_in)}</span>
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    {user.clock_out ? (
                      <div className="d-flex align-items-center gap-1">
                        <Clock size={14} />
                        <span>{formatTime(user.clock_out)}</span>
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <small className="text-muted">{user.status_detail}</small>
                    {user.leave_type && (
                      <div>
                        <small className="text-warning">
                          {user.leave_type} ({user.leave_start} to {user.leave_end})
                        </small>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}

