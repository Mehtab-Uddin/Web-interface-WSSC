import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Badge, Form, Row, Col, Button, Spinner, Modal, InputGroup } from 'react-bootstrap';
import { CheckCircle, XCircle, Eye, Search } from 'lucide-react';
import SearchableSelect from '../components/common/SearchableSelect';
import TablePagination from '../components/common/TablePagination';
import { formatDate, formatStaffName, formatStaffNameString } from '../utils/format.jsx';
import { useAuth } from '../contexts/AuthContext';
import { hasManagementPrivileges, hasFullControl } from '../utils/roles';

export default function Leave() {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    staffId: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [staffList, setStaffList] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const role = user?.role?.toLowerCase() || '';
  const canApprove = hasManagementPrivileges(role) || hasFullControl(role);

  useEffect(() => {
    fetchLeaveRequests();
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/users/staff');
      setStaffList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.staffId) params.append('staffId', filters.staffId);
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await api.get(`/leave?${params.toString()}`);
      setLeaveRequests(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load leave requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await api.put(`/leave/${requestId}/approve`);
      toast.success('Leave request approved');
      fetchLeaveRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve leave request');
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await api.put(`/leave/${requestId}/reject`, { reason });
      toast.success('Leave request rejected');
      fetchLeaveRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject leave request');
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    fetchLeaveRequests();
  };

  const filteredLeaveRequests = leaveRequests.filter((request) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(request.staff_name || '').toLowerCase().includes(searchLower) ||
      String(request.leave_type || '').toLowerCase().includes(searchLower) ||
      String(request.reason || '').toLowerCase().includes(searchLower) ||
      String(request.status || '').toLowerCase().includes(searchLower) ||
      formatDate(request.start_date).toLowerCase().includes(searchLower) ||
      formatDate(request.end_date).toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredLeaveRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeaveRequests = filteredLeaveRequests.slice(startIndex, endIndex);

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
      <h1 className="mb-4 fw-bold">Leave Management</h1>

      <Card className="custom-card mb-4">
        <div className="card-header-custom">
          <h4>Filters</h4>
        </div>
        <Row className="g-3">
          <Col md={3}>
            <Form.Label className="form-label-custom">Staff Member</Form.Label>
            <SearchableSelect
              value={filters.staffId}
              onChange={(e) => handleFilterChange('staffId', e.target.value)}
              options={[{ id: '', name: 'All Staff' }, ...staffList]}
              placeholder="All Staff"
              searchPlaceholder="Search staff..."
              getOptionLabel={(staff) => staff.id === '' ? 'All Staff' : formatStaffNameString(staff)}
              getOptionValue={(staff) => staff.user_id || staff.id || ''}
              className="form-control-custom"
            />
          </Col>
          <Col md={3}>
            <Form.Label className="form-label-custom">Status</Form.Label>
            <Form.Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-control-custom"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Label className="form-label-custom">Date From</Form.Label>
            <Form.Control
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="form-control-custom"
            />
          </Col>
          <Col md={3}>
            <Form.Label className="form-label-custom">Date To</Form.Label>
            <Form.Control
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="form-control-custom"
            />
          </Col>
        </Row>
        <div className="mt-3">
          <Button variant="primary" onClick={handleApplyFilters} className="me-2">
            Apply Filters
          </Button>
          <Button variant="outline-secondary" onClick={() => {
            setFilters({ staffId: '', status: '', dateFrom: '', dateTo: '' });
            setTimeout(() => fetchLeaveRequests(), 100);
          }}>
            Reset
          </Button>
        </div>
      </Card>

      <Card className="custom-card mb-4">
        <Row>
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>
                <Search size={18} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search leave requests..."
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
                <th>Staff</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Status</th>
                <th>Reason</th>
                {canApprove && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedLeaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={canApprove ? 8 : 7} className="text-center py-4 text-muted">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                paginatedLeaveRequests.map((request) => {
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
                        <Badge bg={
                          request.status === 'approved' ? 'success' :
                          request.status === 'pending' ? 'warning' :
                          request.status === 'rejected' ? 'danger' : 'secondary'
                        }>
                          {request.status || 'N/A'}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-truncate-2" style={{ maxWidth: '200px' }}>
                          {request.reason || 'N/A'}
                        </span>
                      </td>
                      {canApprove && (
                        <td>
                          {request.status === 'pending' && (
                            <div className="d-flex gap-2">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApprove(request.id)}
                              >
                                <CheckCircle size={16} />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleReject(request.id)}
                              >
                                <XCircle size={16} />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
        {filteredLeaveRequests.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredLeaveRequests.length}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </Card>
    </div>
  );
}

