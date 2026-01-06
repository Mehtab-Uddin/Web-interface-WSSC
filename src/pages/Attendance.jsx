import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Badge, Form, Row, Col, Button, Spinner, InputGroup } from 'react-bootstrap';
import { Search, Eye } from 'lucide-react';
import SearchableSelect from '../components/common/SearchableSelect';
import TablePagination from '../components/common/TablePagination';
import { formatDate, formatDateTime, formatTime, formatStaffName, formatStaffNameString } from '../utils/format.jsx';

export default function Attendance() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    staffId: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    approvalStatus: ''
  });
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchAttendance();
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

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.staffId) params.append('staffId', filters.staffId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.status) params.append('status', filters.status);
      if (filters.approvalStatus) params.append('approvalStatus', filters.approvalStatus);

      const response = await api.get(`/attendance?${params.toString()}`);
      setAttendances(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load attendance records');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    fetchAttendance();
  };

  const handleResetFilters = () => {
    setFilters({
      staffId: '',
      dateFrom: '',
      dateTo: '',
      status: '',
      approvalStatus: ''
    });
    setTimeout(() => fetchAttendance(), 100);
  };

  const filteredAttendances = attendances.filter((att) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(att.staff_name || '').toLowerCase().includes(searchLower) ||
      String(att.location_name || '').toLowerCase().includes(searchLower) ||
      String(att.nc_location_name || '').toLowerCase().includes(searchLower) ||
      String(att.status || '').toLowerCase().includes(searchLower) ||
      String(att.approval_status || '').toLowerCase().includes(searchLower) ||
      formatDate(att.attendance_date || att.date).toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredAttendances.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAttendances = filteredAttendances.slice(startIndex, endIndex);

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
      <h1 className="mb-4 fw-bold">Attendance Management</h1>

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
          <Col md={2}>
            <Form.Label className="form-label-custom">Date From</Form.Label>
            <Form.Control
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="form-control-custom"
            />
          </Col>
          <Col md={2}>
            <Form.Label className="form-label-custom">Date To</Form.Label>
            <Form.Control
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="form-control-custom"
            />
          </Col>
          <Col md={2}>
            <Form.Label className="form-label-custom">Status</Form.Label>
            <Form.Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-control-custom"
            >
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Label className="form-label-custom">Approval Status</Form.Label>
            <Form.Select
              value={filters.approvalStatus}
              onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
              className="form-control-custom"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Form.Select>
          </Col>
          <Col md={1} className="d-flex align-items-end">
            <Button variant="primary" onClick={handleApplyFilters} className="w-100">
              Apply
            </Button>
          </Col>
        </Row>
        <div className="mt-3">
          <Button variant="outline-secondary" size="sm" onClick={handleResetFilters}>
            Reset Filters
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
                placeholder="Search attendance records..."
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
                <th>Staff</th>
                <th>Location</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Overtime</th>
                <th>Double Duty</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAttendances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                paginatedAttendances.map((att) => (
                  <tr key={att.id}>
                    <td>{formatDate(att.attendance_date || att.date)}</td>
                    <td className="fw-semibold">{formatStaffName(att)}</td>
                    <td>{att.location_name || att.nc_location_name || 'N/A'}</td>
                    <td>
                      {att.clock_in ? (
                        <>
                          <div>{formatTime(att.clock_in)}</div>
                          <small className="text-muted">{formatDate(att.clock_in, 'MMM dd')}</small>
                        </>
                      ) : 'N/A'}
                    </td>
                    <td>
                      {att.clock_out ? (
                        <>
                          <div>{formatTime(att.clock_out)}</div>
                          <small className="text-muted">{formatDate(att.clock_out, 'MMM dd')}</small>
                        </>
                      ) : 'N/A'}
                    </td>
                    <td>
                      <Badge bg={
                        att.status === 'present' ? 'success' :
                        att.status === 'late' ? 'warning' :
                        att.status === 'absent' ? 'danger' : 'secondary'
                      }>
                        {att.status || 'N/A'}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={
                        att.approval_status === 'approved' ? 'success' :
                        att.approval_status === 'pending' ? 'warning' :
                        att.approval_status === 'rejected' ? 'danger' : 'secondary'
                      }>
                        {att.approval_status || 'N/A'}
                      </Badge>
                    </td>
                    <td>
                      {att.overtime ? (
                        <Badge bg="info">Yes</Badge>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                    <td>
                      {att.double_duty ? (
                        <Badge bg="info">Yes</Badge>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        {filteredAttendances.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAttendances.length}
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

