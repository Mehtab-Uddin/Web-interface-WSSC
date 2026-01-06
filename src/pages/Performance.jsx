import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Badge, Form, Row, Col, Button, Spinner, InputGroup } from 'react-bootstrap';
import { Search } from 'lucide-react';
import SearchableSelect from '../components/common/SearchableSelect';
import TablePagination from '../components/common/TablePagination';
import { formatDate, formatStaffName, formatStaffNameString } from '../utils/format.jsx';

export default function Performance() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    staffId: '',
    supervisorId: '',
    date: ''
  });
  const [staffList, setStaffList] = useState([]);
  const [supervisorList, setSupervisorList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchPerformance();
    fetchStaff();
    fetchSupervisors();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/users/staff');
      setStaffList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const response = await api.get('/users/supervisors');
      setSupervisorList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch supervisors:', error);
    }
  };

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.staffId) params.append('staffId', filters.staffId);
      if (filters.supervisorId) params.append('supervisorId', filters.supervisorId);
      if (filters.date) params.append('date', filters.date);

      const response = await api.get(`/performance?${params.toString()}`);
      setReviews(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load performance reviews');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredReviews = reviews.filter((review) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(review.staff_name || '').toLowerCase().includes(searchLower) ||
      String(review.supervisor_name || '').toLowerCase().includes(searchLower) ||
      String(review.location_name || '').toLowerCase().includes(searchLower) ||
      String(review.category || '').toLowerCase().includes(searchLower) ||
      String(review.description || '').toLowerCase().includes(searchLower) ||
      String(review.status || '').toLowerCase().includes(searchLower) ||
      formatDate(review.date).toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

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
      <h1 className="mb-4 fw-bold">Performance Reviews</h1>

      <Card className="custom-card mb-4">
        <div className="card-header-custom">
          <h4>Filters</h4>
        </div>
        <Row className="g-3">
          <Col md={4}>
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
          <Col md={4}>
            <Form.Label className="form-label-custom">Supervisor</Form.Label>
            <SearchableSelect
              value={filters.supervisorId}
              onChange={(e) => handleFilterChange('supervisorId', e.target.value)}
              options={[{ id: '', name: 'All Supervisors' }, ...supervisorList]}
              placeholder="All Supervisors"
              searchPlaceholder="Search supervisors..."
              getOptionLabel={(sup) => sup.name || 'All Supervisors'}
              getOptionValue={(sup) => sup.user_id || sup.id || ''}
              className="form-control-custom"
            />
          </Col>
          <Col md={4}>
            <Form.Label className="form-label-custom">Date</Form.Label>
            <Form.Control
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="form-control-custom"
            />
          </Col>
        </Row>
        <div className="mt-3">
          <Button variant="primary" onClick={fetchPerformance} className="me-2">
            Apply Filters
          </Button>
          <Button variant="outline-secondary" onClick={() => {
            setFilters({ staffId: '', supervisorId: '', date: '' });
            setTimeout(() => fetchPerformance(), 100);
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
                placeholder="Search performance reviews..."
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
                <th>Supervisor</th>
                <th>Location</th>
                <th>Category</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No performance reviews found
                  </td>
                </tr>
              ) : (
                paginatedReviews.map((review) => (
                  <tr key={review.id}>
                    <td>{formatDate(review.date)}</td>
                    <td className="fw-semibold">{formatStaffName(review)}</td>
                    <td>{review.supervisor_name || 'N/A'}</td>
                    <td>{review.location_name || 'N/A'}</td>
                    <td>
                      <Badge bg="info">{review.category || 'N/A'}</Badge>
                    </td>
                    <td>
                      <Badge bg={
                        review.status === 'completed' ? 'success' :
                        review.status === 'pending' ? 'warning' : 'secondary'
                      }>
                        {review.status || 'N/A'}
                      </Badge>
                    </td>
                    <td>
                      <span className="text-truncate-2" style={{ maxWidth: '300px' }}>
                        {review.description || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        {filteredReviews.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredReviews.length}
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

