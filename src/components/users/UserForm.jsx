import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import api from '../../services/api';
import toast from 'react-hot-toast';
import SearchableSelect from '../common/SearchableSelect';
import { ROLE_OPTIONS } from '../../utils/roles';

export default function UserForm({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    fullName: '',
    role: 'staff',
    department: '',
    empFname: '',
    empDeptt: '',
    empJob: '',
    empGrade: '',
    empCell1: '',
    empCell2: '',
    empCnic: '',
    empNo: '',
    empGender: '',
    empMarried: '',
    shiftDays: '6',
    shiftTime: 'day',
    shiftStartTime: '09:00',
    shiftEndTime: '17:00',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [grades, setGrades] = useState([]);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        username: user.username || '',
        password: '',
        fullName: user.full_name || '',
        role: user.role || 'staff',
        department: user.department || '',
        empFname: user.emp_fname || '',
        empDeptt: user.emp_deptt || '',
        empJob: user.emp_job || '',
        empGrade: user.emp_grade || '',
        empCell1: user.emp_cell1 || '',
        empCell2: user.emp_cell2 || '',
        empCnic: user.emp_cnic || '',
        empNo: user.emp_no || '',
        empGender: user.emp_gender || '',
        empMarried: user.emp_married || '',
        shiftDays: user.shiftDays || '6',
        shiftTime: user.shiftTime || 'day',
        shiftStartTime: user.shiftStartTime || '09:00',
        shiftEndTime: user.shiftEndTime || '17:00',
        isActive: user.is_active !== false,
      });
    }
    fetchDropdownOptions();
  }, [user]);

  const fetchDropdownOptions = async () => {
    try {
      const [deptRes, jobsRes, gradesRes] = await Promise.all([
        api.get('/departments'),
        api.get('/dropdown-options/jobs'),
        api.get('/dropdown-options/grades')
      ]);
      setDepartments(deptRes.data.data || []);
      setJobs(jobsRes.data.data || []);
      setGrades(gradesRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch dropdown options:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...formData };
      if (!user && !payload.password) {
        toast.error('Password is required for new users');
        setLoading(false);
        return;
      }
      if (user && !payload.password) {
        delete payload.password;
      }

      if (user) {
        await api.put(`/users/${user.user_id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', payload);
        toast.success('User created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={true} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{user ? 'Edit User' : 'Create New User'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Email *</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Username *</Form.Label>
                <Form.Control
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">
                  {user ? 'New Password (leave blank to keep current)' : 'Password *'}
                </Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!user}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Full Name</Form.Label>
                <Form.Control
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Role *</Form.Label>
                <SearchableSelect
                  value={formData.role}
                  onChange={(e) => handleChange({ target: { name: 'role', value: e.target.value } })}
                  options={ROLE_OPTIONS}
                  placeholder="Select Role"
                  searchPlaceholder="Search roles..."
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  required
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Department</Form.Label>
                <SearchableSelect
                  value={formData.empDeptt}
                  onChange={(e) => handleChange({ target: { name: 'empDeptt', value: e.target.value } })}
                  options={departments}
                  placeholder="Select Department"
                  searchPlaceholder="Search departments..."
                  getOptionLabel={(dept) => dept.label}
                  getOptionValue={(dept) => dept.label}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Employee Number</Form.Label>
                <Form.Control
                  type="text"
                  name="empNo"
                  value={formData.empNo}
                  onChange={handleChange}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">CNIC</Form.Label>
                <Form.Control
                  type="text"
                  name="empCnic"
                  value={formData.empCnic}
                  onChange={handleChange}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Job</Form.Label>
                <SearchableSelect
                  value={formData.empJob}
                  onChange={(e) => handleChange({ target: { name: 'empJob', value: e.target.value } })}
                  options={jobs}
                  placeholder="Select Job"
                  searchPlaceholder="Search jobs..."
                  getOptionLabel={(job) => job.label}
                  getOptionValue={(job) => job.label}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Grade</Form.Label>
                <SearchableSelect
                  value={formData.empGrade}
                  onChange={(e) => handleChange({ target: { name: 'empGrade', value: e.target.value } })}
                  options={grades}
                  placeholder="Select Grade"
                  searchPlaceholder="Search grades..."
                  getOptionLabel={(grade) => grade.label}
                  getOptionValue={(grade) => grade.label}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Gender</Form.Label>
                <SearchableSelect
                  value={formData.empGender}
                  onChange={(e) => handleChange({ target: { name: 'empGender', value: e.target.value } })}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' }
                  ]}
                  placeholder="Select Gender"
                  searchPlaceholder="Search gender..."
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Marital Status</Form.Label>
                <SearchableSelect
                  value={formData.empMarried}
                  onChange={(e) => handleChange({ target: { name: 'empMarried', value: e.target.value } })}
                  options={[
                    { value: 'Single', label: 'Single' },
                    { value: 'Married', label: 'Married' }
                  ]}
                  placeholder="Select Status"
                  searchPlaceholder="Search status..."
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Cell Phone 1</Form.Label>
                <Form.Control
                  type="text"
                  name="empCell1"
                  value={formData.empCell1}
                  onChange={handleChange}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Cell Phone 2</Form.Label>
                <Form.Control
                  type="text"
                  name="empCell2"
                  value={formData.empCell2}
                  onChange={handleChange}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Shift Days</Form.Label>
                <SearchableSelect
                  value={formData.shiftDays}
                  onChange={(e) => handleChange({ target: { name: 'shiftDays', value: e.target.value } })}
                  options={[
                    { value: '5', label: '5 Days' },
                    { value: '6', label: '6 Days' }
                  ]}
                  placeholder="Select Shift Days"
                  searchPlaceholder="Search..."
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Shift Time</Form.Label>
                <SearchableSelect
                  value={formData.shiftTime}
                  onChange={(e) => handleChange({ target: { name: 'shiftTime', value: e.target.value } })}
                  options={[
                    { value: 'day', label: 'Day' },
                    { value: 'night', label: 'Night' },
                    { value: 'custom', label: 'Custom' }
                  ]}
                  placeholder="Select Shift Time"
                  searchPlaceholder="Search..."
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            {formData.shiftTime === 'custom' && (
              <>
                <Col md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Start Time</Form.Label>
                    <Form.Control
                      type="time"
                      name="shiftStartTime"
                      value={formData.shiftStartTime}
                      onChange={handleChange}
                      className="form-control-custom"
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">End Time</Form.Label>
                    <Form.Control
                      type="time"
                      name="shiftEndTime"
                      value={formData.shiftEndTime}
                      onChange={handleChange}
                      className="form-control-custom"
                    />
                  </Form.Group>
                </Col>
              </>
            )}
          </Row>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              name="isActive"
              label="Active"
              checked={formData.isActive}
              onChange={handleChange}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : user ? 'Update' : 'Create'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

