import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Badge, Button, Spinner, Tabs, Tab, InputGroup, Form, Row, Col } from 'react-bootstrap';
import { CheckCircle, XCircle, Search } from 'lucide-react';
import TablePagination from '../components/common/TablePagination';
import { formatDate, formatTime, formatStaffName } from '../utils/format.jsx';
import { useAuth } from '../contexts/AuthContext';
import { hasManagementPrivileges, hasFullControl } from '../utils/roles';

export default function Approvals() {
  const { user } = useAuth();
  const [attendanceApprovals, setAttendanceApprovals] = useState([]);
  const [leaveApprovals, setLeaveApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const role = user?.role?.toLowerCase() || '';
  const canApprove = hasManagementPrivileges(role) || hasFullControl(role);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const [attRes, leaveRes] = await Promise.all([
        api.get('/approvals/pending'),
        api.get('/leave?status=pending')
      ]);
      setAttendanceApprovals(attRes.data.data || []);
      setLeaveApprovals(leaveRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load approvals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAttendance = async (id) => {
    try {
      await api.put(`/approvals/attendance/${id}/approve`);
      toast.success('Attendance approved');
      fetchApprovals();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve attendance');
    }
  };

  const handleRejectAttendance = async (id) => {
    try {
      await api.put(`/approvals/attendance/${id}/reject`);
      toast.success('Attendance rejected');
      fetchApprovals();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject attendance');
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      await api.put(`/leave/${id}/approve`);
      toast.success('Leave request approved');
      fetchApprovals();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve leave request');
    }
  };

  const handleRejectLeave = async (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await api.put(`/leave/${id}/reject`, { reason });
      toast.success('Leave request rejected');
      fetchApprovals();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject leave request');
    }
  };

  const filteredAttendanceApprovals = attendanceApprovals.filter((att) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(att.staff_name || '').toLowerCase().includes(searchLower) ||
      String(att.location_name || '').toLowerCase().includes(searchLower) ||
      String(att.nc_location_name || '').toLowerCase().includes(searchLower) ||
      formatDate(att.attendance_date || att.date).toLowerCase().includes(searchLower)
    );
  });

  const filteredLeaveApprovals = leaveApprovals.filter((request) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(request.staff_name || '').toLowerCase().includes(searchLower) ||
      String(request.leave_type || '').toLowerCase().includes(searchLower) ||
      String(request.reason || '').toLowerCase().includes(searchLower) ||
      formatDate(request.start_date).toLowerCase().includes(searchLower) ||
      formatDate(request.end_date).toLowerCase().includes(searchLower)
    );
  });

  // Pagination for attendance approvals
  const attendanceTotalPages = Math.ceil(filteredAttendanceApprovals.length / itemsPerPage);
  const attendanceStartIndex = (currentPage - 1) * itemsPerPage;
  const attendanceEndIndex = attendanceStartIndex + itemsPerPage;
  const paginatedAttendanceApprovals = filteredAttendanceApprovals.slice(attendanceStartIndex, attendanceEndIndex);

  // Pagination for leave approvals
  const leaveTotalPages = Math.ceil(filteredLeaveApprovals.length / itemsPerPage);
  const leaveStartIndex = (currentPage - 1) * itemsPerPage;
  const leaveEndIndex = leaveStartIndex + itemsPerPage;
  const paginatedLeaveApprovals = filteredLeaveApprovals.slice(leaveStartIndex, leaveEndIndex);

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
      <h1 className="mb-4 fw-bold">Approvals Queue</h1>

      <Card className="custom-card mb-4">
        <Row>
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>
                <Search size={18} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search approvals..."
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
          <Tab eventKey="attendance" title={`Attendance (${attendanceApprovals.length})`}>
            <div className="table-responsive">
              <Table className="custom-table" hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff</th>
                    <th>Location</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Status</th>
                    {canApprove && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedAttendanceApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={canApprove ? 7 : 6} className="text-center py-4 text-muted">
                        No pending attendance approvals
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendanceApprovals.map((att) => (
                      <tr key={att.id}>
                        <td>{formatDate(att.attendance_date || att.date)}</td>
                        <td className="fw-semibold">{formatStaffName(att)}</td>
                        <td>{att.location_name || att.nc_location_name || 'N/A'}</td>
                        <td>{att.clock_in ? formatTime(att.clock_in) : 'N/A'}</td>
                        <td>{att.clock_out ? formatTime(att.clock_out) : 'N/A'}</td>
                        <td>
                          <Badge bg="warning">Pending</Badge>
                        </td>
                        {canApprove && (
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApproveAttendance(att.id)}
                              >
                                <CheckCircle size={16} />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRejectAttendance(att.id)}
                              >
                                <XCircle size={16} />
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
            {filteredAttendanceApprovals.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={attendanceTotalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredAttendanceApprovals.length}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
              />
            )}
          </Tab>

          <Tab eventKey="leave" title={`Leave Requests (${leaveApprovals.length})`}>
            <div className="table-responsive">
              <Table className="custom-table" hover>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
                    <th>Reason</th>
                    {canApprove && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeaveApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={canApprove ? 7 : 6} className="text-center py-4 text-muted">
                        No pending leave requests
                      </td>
                    </tr>
                  ) : (
                    paginatedLeaveApprovals.map((request) => {
                      const startDate = new Date(request.start_date);
                      const endDate = new Date(request.end_date);
                      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

                      return (
                        <tr key={request.id}>
                          <td className="fw-semibold">{formatStaffName(request)}</td>
                          <td>
                            <Badge bg="info">{request.leave_type || 'N/A'}</Badge>
                          </td>
                          <td>{formatDate(request.start_date)}</td>
                          <td>{formatDate(request.end_date)}</td>
                          <td>{days} day{days !== 1 ? 's' : ''}</td>
                          <td>
                            <span className="text-truncate-2" style={{ maxWidth: '200px' }}>
                              {request.reason || 'N/A'}
                            </span>
                          </td>
                          {canApprove && (
                            <td>
                              <div className="d-flex gap-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleApproveLeave(request.id)}
                                >
                                  <CheckCircle size={16} />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRejectLeave(request.id)}
                                >
                                  <XCircle size={16} />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
            {filteredLeaveApprovals.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={leaveTotalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredLeaveApprovals.length}
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

