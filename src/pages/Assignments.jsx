import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Badge, Button, Spinner, Tabs, Tab, InputGroup, Form, Row, Col } from 'react-bootstrap';
import { Plus, Search } from 'lucide-react';
import TablePagination from '../components/common/TablePagination';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl, hasExecutivePrivileges } from '../utils/roles';
import { formatStaffName } from '../utils/format.jsx';

export default function Assignments() {
  const { user } = useAuth();
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [supervisorAssignments, setSupervisorAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('staff');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const role = user?.role?.toLowerCase() || '';
  const canManage = hasFullControl(role) || hasExecutivePrivileges(role);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const [staffRes, supervisorRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/assignments/supervisor-locations')
      ]);
      setStaffAssignments(staffRes.data.data || []);
      setSupervisorAssignments(supervisorRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load assignments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id, type) => {
    if (!window.confirm('Are you sure you want to deactivate this assignment?')) return;

    try {
      if (type === 'staff') {
        await api.put(`/assignments/${id}/deactivate`);
      }
      toast.success('Assignment deactivated');
      fetchAssignments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to deactivate assignment');
    }
  };

  const filteredStaffAssignments = staffAssignments.filter((assignment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(assignment.staff_name || '').toLowerCase().includes(searchLower) ||
      String(assignment.supervisor_name || '').toLowerCase().includes(searchLower) ||
      String(assignment.zone_name || '').toLowerCase().includes(searchLower) ||
      String(assignment.location_name || '').toLowerCase().includes(searchLower)
    );
  });

  const filteredSupervisorAssignments = supervisorAssignments.filter((assignment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(assignment.supervisor_name || '').toLowerCase().includes(searchLower) ||
      String(assignment.location_name || '').toLowerCase().includes(searchLower)
    );
  });

  // Pagination for staff assignments
  const staffTotalPages = Math.ceil(filteredStaffAssignments.length / itemsPerPage);
  const staffStartIndex = (currentPage - 1) * itemsPerPage;
  const staffEndIndex = staffStartIndex + itemsPerPage;
  const paginatedStaffAssignments = filteredStaffAssignments.slice(staffStartIndex, staffEndIndex);

  // Pagination for supervisor assignments
  const supervisorTotalPages = Math.ceil(filteredSupervisorAssignments.length / itemsPerPage);
  const supervisorStartIndex = (currentPage - 1) * itemsPerPage;
  const supervisorEndIndex = supervisorStartIndex + itemsPerPage;
  const paginatedSupervisorAssignments = filteredSupervisorAssignments.slice(supervisorStartIndex, supervisorEndIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

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
      <h1 className="mb-4 fw-bold">Assignments Management</h1>

      <Card className="custom-card mb-4">
        <Row>
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>
                <Search size={18} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control-custom"
              />
            </InputGroup>
          </Col>
        </Row>
      </Card>

      <Card className="custom-card">
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          <Tab eventKey="staff" title="Staff Assignments">
            <div className="table-responsive">
              <Table className="custom-table" hover>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Supervisor</th>
                    <th>Beat</th>
                    <th>Location</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedStaffAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="text-center py-4 text-muted">
                        No staff assignments found
                      </td>
                    </tr>
                  ) : (
                    paginatedStaffAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="fw-semibold">{formatStaffName(assignment)}</td>
                        <td>{assignment.supervisor_name || 'N/A'}</td>
                        <td>{assignment.zone_name || 'N/A'}</td>
                        <td>{assignment.location_name || 'N/A'}</td>
                        <td>
                          <Badge bg={assignment.is_active ? 'success' : 'secondary'}>
                            {assignment.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        {canManage && (
                          <td>
                            {assignment.is_active && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeactivate(assignment.id, 'staff')}
                              >
                                Deactivate
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
            {filteredStaffAssignments.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={staffTotalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredStaffAssignments.length}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
              />
            )}
          </Tab>

          <Tab eventKey="supervisor" title="Supervisor Assignments">
            <div className="table-responsive">
              <Table className="custom-table" hover>
                <thead>
                  <tr>
                    <th>Supervisor</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSupervisorAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-4 text-muted">
                        No supervisor assignments found
                      </td>
                    </tr>
                  ) : (
                    paginatedSupervisorAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="fw-semibold">{assignment.supervisor_name || 'N/A'}</td>
                        <td>{assignment.location_name || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
            {filteredSupervisorAssignments.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={supervisorTotalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredSupervisorAssignments.length}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
              />
            )}
          </Tab>
        </Tabs>
      </Card>
    </div>
  );
}

