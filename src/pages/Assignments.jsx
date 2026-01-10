import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Badge, Button, Spinner, Tabs, Tab, InputGroup, Form, Row, Col, Modal } from 'react-bootstrap';
import { Plus, Search, X } from 'lucide-react';
import TablePagination from '../components/common/TablePagination';
import ConfirmationModal from '../components/common/ConfirmationModal';
import SearchableSelect from '../components/common/SearchableSelect';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl, hasExecutivePrivileges, ROLE, normalizeRole, isAtLeastRole } from '../utils/roles';
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deactivateId, setDeactivateId] = useState(null);
  const [deactivateType, setDeactivateType] = useState(null);
  
  // Assignment creation state
  const [showStaffAssignmentModal, setShowStaffAssignmentModal] = useState(false);
  const [showSupervisorLocationModal, setShowSupervisorLocationModal] = useState(false);
  const [staff, setStaff] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [zones, setZones] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [generalManagers, setGeneralManagers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Staff assignment form state
  const [staffAssignmentForm, setStaffAssignmentForm] = useState({
    staffId: '',
    supervisorId: '',
    zoneId: '',
    departmentFilter: 'all'
  });
  
  // Supervisor location form state
  const [supervisorLocationForm, setSupervisorLocationForm] = useState({
    supervisorId: '',
    locationId: ''
  });
  
  // General Manager Department Assignment state
  const [gmAssignments, setGmAssignments] = useState({});
  const [showGMModal, setShowGMModal] = useState(false);
  const [savingGMs, setSavingGMs] = useState(false);
  
  // Supervisor to Manager Assignment state
  const [showSupervisorManagerModal, setShowSupervisorManagerModal] = useState(false);
  const [supervisorManagerForm, setSupervisorManagerForm] = useState({
    managerId: '',
    supervisorId: ''
  });
  const [assigningSupervisor, setAssigningSupervisor] = useState(false);
  const [expandedManagers, setExpandedManagers] = useState(new Set());
  
  // Loading states
  const [submittingStaffAssignment, setSubmittingStaffAssignment] = useState(false);
  const [submittingSupervisorLocation, setSubmittingSupervisorLocation] = useState(false);

  const role = normalizeRole(user?.role);
  const canManage = hasFullControl(role) || hasExecutivePrivileges(role);
  const isManagerOnly = role === ROLE.MANAGER;
  const isGeneralManagerOrAbove = isAtLeastRole(role, ROLE.GENERAL_MANAGER);
  const currentManagerDepartment = isManagerOnly ? (user?.department || user?.empDeptt || user?.emp_deptt || null) : null;

  useEffect(() => {
    fetchAssignments();
    if (canManage) {
      fetchRequiredData();
    }
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

  const fetchRequiredData = async () => {
    setLoadingData(true);
    try {
      const promises = [
        api.get('/users/staff'),
        api.get('/users/supervisors'),
        api.get('/locations'),
        api.get('/zones'),
        api.get('/departments')
      ];
      
      // Only fetch managers and GMs if user has appropriate permissions
      if (isGeneralManagerOrAbove) {
        promises.push(api.get('/users/managers'));
        promises.push(api.get('/users/general-managers'));
      }
      
      const results = await Promise.all(promises);
      
      setStaff(results[0].data.data || []);
      setSupervisors(results[1].data.data || []);
      setLocations(results[2].data.data || []);
      setZones(results[3].data.data || []);
      setDepartments(results[4].data.data || []);
      
      if (isGeneralManagerOrAbove) {
        setManagers(results[5].data.data || []);
        const gms = results[6].data.data || [];
        setGeneralManagers(gms);
        
        // Initialize GM assignments map
        const gmMap = {};
        departments
          .filter(dept => dept && dept.id != null && dept.isActive !== false)
          .forEach((dept) => {
            const assignedGm = gms.find((gm) => {
              const gmDepartments = Array.isArray(gm.departments) ? gm.departments : [];
              return gmDepartments.includes(dept.id);
            });
            if (assignedGm) {
              gmMap[dept.id] = String(assignedGm.user_id);
            }
          });
        setGmAssignments(gmMap);
      }
    } catch (error) {
      toast.error('Failed to load data for assignments');
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };


  const handleDeactivateClick = (id, type) => {
    setDeactivateId(id);
    setDeactivateType(type);
    setShowConfirmModal(true);
  };

  const handleDeactivate = async () => {
    if (!deactivateId || !deactivateType) return;

    try {
      if (deactivateType === 'staff') {
        await api.put(`/assignments/${deactivateId}/deactivate`);
      } else if (deactivateType === 'supervisor') {
        await api.delete(`/assignments/supervisor-locations/${deactivateId}`);
      }
      toast.success('Assignment deactivated');
      setShowConfirmModal(false);
      setDeactivateId(null);
      setDeactivateType(null);
      fetchAssignments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to deactivate assignment');
      setShowConfirmModal(false);
      setDeactivateId(null);
      setDeactivateType(null);
    }
  };

  const handleCreateStaffAssignment = async (e) => {
    e.preventDefault();
    if (!staffAssignmentForm.staffId || !staffAssignmentForm.supervisorId || !staffAssignmentForm.zoneId) {
      toast.error('Please select all required fields');
      return;
    }

    // For managers, validate that staff and supervisor belong to their department
    if (isManagerOnly && currentManagerDepartment) {
      const selectedStaff = staff.find((s) => s.user_id === staffAssignmentForm.staffId);
      const selectedSupervisor = supervisors.find((s) => s.user_id === staffAssignmentForm.supervisorId);
      
      if (selectedStaff && (selectedStaff.department || selectedStaff.emp_deptt || null) !== currentManagerDepartment) {
        toast.error('You can only assign staff from your department');
        return;
      }
      
      if (selectedSupervisor) {
        const supervisorDept = selectedSupervisor.department || selectedSupervisor.emp_deptt || null;
        if (supervisorDept !== currentManagerDepartment) {
          toast.error('You can only assign to supervisors from your department');
          return;
        }
      }
    }

    setSubmittingStaffAssignment(true);
    try {
      await api.post('/assignments', {
        staff_id: staffAssignmentForm.staffId,
        supervisor_id: staffAssignmentForm.supervisorId,
        zone_id: staffAssignmentForm.zoneId
      });
      toast.success('Staff assigned successfully');
      setShowStaffAssignmentModal(false);
      setStaffAssignmentForm({ staffId: '', supervisorId: '', zoneId: '', departmentFilter: 'all' });
      await fetchAssignments();
      await fetchRequiredData(); // Refresh to get updated assignments
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign staff');
      console.error(error);
    } finally {
      setSubmittingStaffAssignment(false);
    }
  };

  const handleCreateSupervisorLocation = async (e) => {
    e.preventDefault();
    if (!supervisorLocationForm.supervisorId || !supervisorLocationForm.locationId) {
      toast.error('Please select both supervisor and location');
      return;
    }

    // For managers, validate that supervisor belongs to their department
    if (isManagerOnly && currentManagerDepartment) {
      const selectedSupervisor = supervisors.find((s) => s.user_id === supervisorLocationForm.supervisorId);
      if (selectedSupervisor) {
        const supervisorDept = selectedSupervisor.department || selectedSupervisor.emp_deptt || null;
        if (supervisorDept !== currentManagerDepartment) {
          toast.error('You can only assign supervisors from your department');
          return;
        }
      }
    }

    setSubmittingSupervisorLocation(true);
    try {
      await api.post('/assignments/supervisor-locations', {
        supervisor_id: supervisorLocationForm.supervisorId,
        nc_location_id: supervisorLocationForm.locationId
      });
      toast.success('Supervisor assigned to location successfully');
      setShowSupervisorLocationModal(false);
      setSupervisorLocationForm({ supervisorId: '', locationId: '' });
      await fetchAssignments();
      await fetchRequiredData(); // Refresh to get updated assignments
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign supervisor to location');
      console.error(error);
    } finally {
      setSubmittingSupervisorLocation(false);
    }
  };

  const handleSaveGeneralManagerAssignments = async () => {
    setSavingGMs(true);
    try {
      const gmToDepartments = new Map();
      
      // Process all department assignments
      Object.entries(gmAssignments).forEach(([deptId, gmId]) => {
        if (!deptId) return;
        const normalizedGmId = gmId ? String(gmId) : null;
        if (normalizedGmId) {
          if (!gmToDepartments.has(normalizedGmId)) {
            gmToDepartments.set(normalizedGmId, new Set());
          }
          gmToDepartments.get(normalizedGmId).add(deptId);
        }
      });

      // Update all general managers with their correct department assignments
      await Promise.all(
        generalManagers.map(async (gm) => {
          const userId = gm.user_id || gm.id || gm.userId || gm.objectId;
          if (!userId) {
            console.warn('General manager missing user ID:', gm);
            return;
          }
          const gmIdString = String(userId);
          const desiredDeptIds = Array.from(gmToDepartments.get(gmIdString) || []);
          const currentDepartments = Array.isArray(gm.departments) ? gm.departments : [];
          
          // Normalize both arrays to strings for comparison
          const normalizedDesired = desiredDeptIds.map(d => String(d));
          const normalizedCurrent = currentDepartments.map(d => String(d));
          
          // Only update if departments have changed
          const arraysEqual = (a, b) => {
            if (a.length !== b.length) return false;
            const sortedA = [...a].sort();
            const sortedB = [...b].sort();
            return sortedA.every((value, index) => value === sortedB[index]);
          };
          
          if (!arraysEqual(normalizedDesired, normalizedCurrent)) {
            await api.put(`/users/${userId}/leadership`, { departments: desiredDeptIds });
          }
        })
      );

      toast.success('General manager departments updated successfully');
      setShowGMModal(false);
      await fetchRequiredData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update general manager departments');
      console.error(error);
    } finally {
      setSavingGMs(false);
    }
  };

  const handleAssignSupervisorToManager = async (e) => {
    e.preventDefault();
    if (!supervisorManagerForm.managerId || !supervisorManagerForm.supervisorId) {
      toast.error('Please select both manager and supervisor');
      return;
    }

    setAssigningSupervisor(true);
    try {
      const manager = managers.find((m) => m.user_id === supervisorManagerForm.managerId);
      const department = manager?.department || null;

      await api.put(`/users/${supervisorManagerForm.supervisorId}/leadership`, {
        managerId: supervisorManagerForm.managerId,
        department
      });

      toast.success('Supervisor assigned to manager successfully');
      setShowSupervisorManagerModal(false);
      setSupervisorManagerForm({ managerId: '', supervisorId: '' });
      await fetchRequiredData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign supervisor to manager');
      console.error(error);
    } finally {
      setAssigningSupervisor(false);
    }
  };

  const handleUnassignSupervisorFromManager = async (supervisorId) => {
    if (!window.confirm('Are you sure you want to remove this supervisor from their manager?')) {
      return;
    }

    try {
      await api.put(`/users/${supervisorId}/leadership`, {
        managerId: null,
        department: null
      });
      toast.success('Supervisor unassigned from manager');
      await fetchRequiredData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to unassign supervisor');
      console.error(error);
    }
  };

  // Get assigned staff IDs
  const assignedStaffIds = useMemo(() => {
    return new Set(
      (staffAssignments || [])
        .filter(a => a.is_active)
        .map((assignment) => String(assignment.staff_id))
        .filter((id) => !!id)
    );
  }, [staffAssignments]);

  // Filter staff options for assignment
  const filteredStaffOptions = useMemo(() => {
    return staff.filter((member) => {
      if (!member || member.user_id == null) return false;
      
      // For managers, only show staff from their department
      if (isManagerOnly && currentManagerDepartment) {
        const memberDept = member.department || member.emp_deptt || null;
        if (memberDept !== currentManagerDepartment) return false;
      }
      
      // Apply department filter if not "all"
      if (staffAssignmentForm.departmentFilter !== 'all' && !isManagerOnly) {
        const memberDept = member.department || member.emp_deptt || null;
        if (memberDept !== staffAssignmentForm.departmentFilter) return false;
      }
      
      // Filter out staff who are already assigned
      return !assignedStaffIds.has(String(member.user_id));
    }).map((member) => ({
      label: `${member.name || member.full_name || member.email}${member.empNo ? ` (ID: ${member.empNo})` : ''} (${member.department || member.emp_deptt || 'N/A'})`,
      value: member.user_id,
      name: member.name || member.full_name || member.email,
      empNo: member.empNo || null
    }));
  }, [staff, isManagerOnly, currentManagerDepartment, staffAssignmentForm.departmentFilter, assignedStaffIds]);

  // Filter supervisor options for staff assignment
  const filteredSupervisorOptionsForStaff = useMemo(() => {
    return supervisors.filter((supervisor) => {
      if (!supervisor || supervisor.user_id == null) return false;
      
      // For managers, only show supervisors from their department
      if (isManagerOnly && currentManagerDepartment) {
        const supervisorDept = supervisor.department || supervisor.emp_deptt || null;
        if (supervisorDept !== currentManagerDepartment) return false;
      }
      
      // Apply department filter if not "all"
      if (staffAssignmentForm.departmentFilter !== 'all' && !isManagerOnly) {
        const supervisorDept = supervisor.department || supervisor.emp_deptt || null;
        if (supervisorDept !== staffAssignmentForm.departmentFilter) return false;
      }
      
      return true;
    }).map((supervisor) => ({
      label: `${supervisor.name || supervisor.full_name || supervisor.email} (${supervisor.department || supervisor.emp_deptt || 'N/A'})`,
      value: supervisor.user_id
    }));
  }, [supervisors, isManagerOnly, currentManagerDepartment, staffAssignmentForm.departmentFilter]);

  // Filter zones for selected supervisor - only show zones from locations assigned to this supervisor
  const filteredZoneOptions = useMemo(() => {
    if (!staffAssignmentForm.supervisorId || !showStaffAssignmentModal) return [];
    
    // Get locations assigned to this supervisor
    const supervisorLocationIds = (supervisorAssignments || [])
      .filter(sl => String(sl.supervisor_id) === String(staffAssignmentForm.supervisorId))
      .map(sl => sl.nc_location_id)
      .filter(id => id != null);

    if (supervisorLocationIds.length === 0) return [];

    // Filter zones that belong to locations assigned to this supervisor
    return zones
      .filter((z) => {
        if (!z || z.id == null || z.is_active === false) return false;
        const zoneLocationId = z.location_id || z.locationId;
        // Convert to string for comparison
        return zoneLocationId && supervisorLocationIds.some(locId => String(locId) === String(zoneLocationId));
      })
      .map((z) => ({
        label: `${z.name} (${z.location_name || 'N/A'})`,
        value: z.id,
        locationName: z.location_name || ''
      }));
  }, [zones, staffAssignmentForm.supervisorId, supervisorAssignments, showStaffAssignmentModal]);

  // Filter supervisors for supervisor-location assignment
  const filteredSupervisorOptionsForLocation = useMemo(() => {
    const assignedSupervisorIds = new Set(
      (supervisorAssignments || [])
        .map((sl) => String(sl.supervisor_id))
        .filter((id) => !!id)
    );

    return supervisors.filter((supervisor) => {
      if (!supervisor || supervisor.user_id == null) return false;
      
      // For managers, only show supervisors from their department
      if (isManagerOnly && currentManagerDepartment) {
        const supervisorDept = supervisor.department || supervisor.emp_deptt || null;
        if (supervisorDept !== currentManagerDepartment) return false;
      }
      
      // Filter out supervisors who are already assigned to a location
      return !assignedSupervisorIds.has(String(supervisor.user_id));
    }).map((supervisor) => ({
      label: `${supervisor.name || supervisor.full_name || supervisor.email} (${supervisor.department || supervisor.emp_deptt || 'N/A'})`,
      value: supervisor.user_id
    }));
  }, [supervisors, supervisorAssignments, isManagerOnly, currentManagerDepartment]);

  // Filter supervisors for manager assignment (exclude already assigned)
  const filteredSupervisorOptionsForManager = useMemo(() => {
    const assignedSupervisorIds = new Set(
      supervisors
        .filter(s => s.manager_id)
        .map(s => String(s.user_id))
    );

    return supervisors.filter((supervisor) => {
      if (!supervisor || supervisor.user_id == null) return false;
      
      // Filter out supervisors that are already assigned to a manager
      if (assignedSupervisorIds.has(String(supervisor.user_id))) return false;
      
      // Filter by selected manager's department if manager is selected
      if (supervisorManagerForm.managerId) {
        const manager = managers.find(m => m.user_id === supervisorManagerForm.managerId);
        if (manager) {
          const managerDept = manager.department || null;
          const supervisorDept = supervisor.department || supervisor.emp_deptt || null;
          // Show supervisors from manager's department or unassigned
          if (supervisorDept && supervisorDept !== managerDept) return false;
        }
      }
      
      return true;
    }).map((supervisor) => ({
      label: `${supervisor.name || supervisor.full_name || supervisor.email} (${supervisor.department || supervisor.emp_deptt || 'N/A'})`,
      value: supervisor.user_id
    }));
  }, [supervisors, supervisorManagerForm.managerId, managers]);

  // Build manager hierarchy display
  const supervisorDisplayByManager = useMemo(() => {
    return managers.map((manager) => {
      const managerId = String(manager.user_id || manager.id || '');
      const managerSupervisors = supervisors.filter((supervisor) => {
        if (!supervisor || !supervisor.user_id) return false;
        const assignedManagerId = supervisor.manager_id ? String(supervisor.manager_id) : null;
        return assignedManagerId === managerId;
      });
      return { manager, supervisors: managerSupervisors };
    });
  }, [managers, supervisors]);

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

  const getDepartmentLabel = (deptId) => {
    if (!deptId) return 'Unassigned';
    const dept = departments.find(d => d.id === deptId || d.deptId === deptId);
    return dept ? dept.label : 'Unknown Department';
  };

  const departmentOptions = [
    { label: 'All Departments', value: 'all' },
    ...departments
      .filter(dept => dept && dept.isActive !== false)
      .map(dept => ({ label: dept.label, value: dept.id }))
  ];

  const locationOptions = locations
    .filter((l) => l && l.id != null)
    .map((l) => ({
      label: `${l.name}${l.code ? ` (${l.code})` : ''}`,
      value: l.id,
      code: l.code || ''
    }));

  const generalManagerOptions = generalManagers.map((gm) => ({
    label: gm.full_name || gm.name || gm.email || 'General Manager',
    value: String(gm.user_id || gm.id)
  }));

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold">Assignments Management</h1>
        {canManage && (
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant="primary"
              onClick={() => {
                setStaffAssignmentForm({ staffId: '', supervisorId: '', zoneId: '', departmentFilter: 'all' });
                setShowStaffAssignmentModal(true);
              }}
              className="btn-custom d-flex align-items-center gap-2"
            >
              <Plus size={20} />
              <span>Assign Staff</span>
            </Button>
            <Button
              variant="success"
              onClick={() => {
                setSupervisorLocationForm({ supervisorId: '', locationId: '' });
                setShowSupervisorLocationModal(true);
              }}
              className="btn-custom d-flex align-items-center gap-2"
            >
              <Plus size={20} />
              <span>Assign Supervisor to Location</span>
            </Button>
            {isGeneralManagerOrAbove && (
              <>
                <Button
                  variant="info"
                  onClick={() => {
                    setShowGMModal(true);
                    fetchRequiredData(); // Refresh to get latest GM assignments
                  }}
                  className="btn-custom d-flex align-items-center gap-2"
                >
                  <Plus size={20} />
                  <span>Manage GM Departments</span>
                </Button>
                <Button
                  variant="warning"
                  onClick={() => {
                    setSupervisorManagerForm({ managerId: '', supervisorId: '' });
                    setShowSupervisorManagerModal(true);
                  }}
                  className="btn-custom d-flex align-items-center gap-2"
                >
                  <Plus size={20} />
                  <span>Assign Supervisor to Manager</span>
                </Button>
              </>
            )}
          </div>
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
                                onClick={() => handleDeactivateClick(assignment.id, 'staff')}
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
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedSupervisorAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 3 : 2} className="text-center py-4 text-muted">
                        No supervisor assignments found
                      </td>
                    </tr>
                  ) : (
                    paginatedSupervisorAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="fw-semibold">{assignment.supervisor_name || 'N/A'}</td>
                        <td>{assignment.location_name || 'N/A'}</td>
                        {canManage && (
                          <td>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeactivateClick(assignment.id, 'supervisor')}
                            >
                              Remove
                            </Button>
                          </td>
                        )}
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

      <ConfirmationModal
        show={showConfirmModal}
        onHide={() => {
          setShowConfirmModal(false);
          setDeactivateId(null);
          setDeactivateType(null);
        }}
        onConfirm={handleDeactivate}
        message={deactivateType === 'supervisor' 
          ? 'Are you sure you want to remove this supervisor-location assignment?'
          : 'Are you sure you want to deactivate this assignment?'}
      />

      {/* Staff Assignment Modal */}
      <Modal
        show={showStaffAssignmentModal}
        onHide={() => {
          setShowStaffAssignmentModal(false);
          setStaffAssignmentForm({ staffId: '', supervisorId: '', zoneId: '', departmentFilter: 'all' });
        }}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Assign Staff</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateStaffAssignment}>
          <Modal.Body>
            {isManagerOnly && currentManagerDepartment && (
              <div className="alert alert-info mb-3">
                <strong>Department:</strong> {departments.find(d => d.id === currentManagerDepartment)?.label || currentManagerDepartment}
                <br />
                <small>You can only manage staff from your department</small>
              </div>
            )}
            
            {!isManagerOnly && (
              <Form.Group className="mb-3">
                <Form.Label>Filter by Department</Form.Label>
                <SearchableSelect
                  value={staffAssignmentForm.departmentFilter}
                  onChange={(e) => {
                    setStaffAssignmentForm(prev => ({
                      ...prev,
                      departmentFilter: e.target.value,
                      staffId: '',
                      supervisorId: '',
                      zoneId: ''
                    }));
                  }}
                  options={departmentOptions}
                  placeholder="All Departments"
                  searchPlaceholder="Search departments..."
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Staff <span className="text-danger">*</span></Form.Label>
              <SearchableSelect
                value={staffAssignmentForm.staffId}
                onChange={(e) => {
                  setStaffAssignmentForm(prev => ({ ...prev, staffId: e.target.value }));
                }}
                options={[{ label: 'Select staff', value: '' }, ...filteredStaffOptions]}
                placeholder="Select staff"
                searchPlaceholder="Search by name or employee ID..."
                getOptionLabel={(option) => option.label || option.name || ''}
                getOptionValue={(option) => option.value || ''}
                required
              />
              {filteredStaffOptions.length === 0 && (
                <Form.Text className="text-muted">
                  No available staff. All staff may already be assigned or none match the filters.
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Supervisor <span className="text-danger">*</span></Form.Label>
              <SearchableSelect
                value={staffAssignmentForm.supervisorId}
                onChange={(e) => {
                  setStaffAssignmentForm(prev => ({
                    ...prev,
                    supervisorId: e.target.value,
                    zoneId: '' // Reset zone when supervisor changes
                  }));
                }}
                options={[{ label: 'Select supervisor', value: '' }, ...filteredSupervisorOptionsForStaff]}
                placeholder="Select supervisor"
                searchPlaceholder="Search supervisors..."
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Beat (Zone) <span className="text-danger">*</span></Form.Label>
              <SearchableSelect
                value={staffAssignmentForm.zoneId}
                onChange={(e) => {
                  setStaffAssignmentForm(prev => ({ ...prev, zoneId: e.target.value }));
                }}
                options={[{ label: 'Select beat', value: '' }, ...filteredZoneOptions]}
                placeholder={staffAssignmentForm.supervisorId 
                  ? (filteredZoneOptions.length === 0 ? 'No beats available for this supervisor' : 'Select beat')
                  : 'Select supervisor first'}
                searchPlaceholder="Search beats..."
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                disabled={!staffAssignmentForm.supervisorId || filteredZoneOptions.length === 0}
                required
              />
              {staffAssignmentForm.supervisorId && filteredZoneOptions.length === 0 && (
                <Form.Text className="text-warning">
                  No beats found. Make sure the supervisor is assigned to a location and beats are created for that location.
                </Form.Text>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowStaffAssignmentModal(false);
                setStaffAssignmentForm({ staffId: '', supervisorId: '', zoneId: '', departmentFilter: 'all' });
              }}
              disabled={submittingStaffAssignment}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submittingStaffAssignment || !staffAssignmentForm.staffId || !staffAssignmentForm.supervisorId || !staffAssignmentForm.zoneId}
            >
              {submittingStaffAssignment ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Assigning...
                </>
              ) : (
                'Assign Staff'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Supervisor Location Assignment Modal */}
      <Modal
        show={showSupervisorLocationModal}
        onHide={() => {
          setShowSupervisorLocationModal(false);
          setSupervisorLocationForm({ supervisorId: '', locationId: '' });
        }}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Assign Supervisor to Location</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSupervisorLocation}>
          <Modal.Body>
            {isManagerOnly && currentManagerDepartment && (
              <div className="alert alert-info mb-3">
                <strong>Department:</strong> {departments.find(d => d.id === currentManagerDepartment)?.label || currentManagerDepartment}
                <br />
                <small>You can only assign supervisors from your department</small>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Supervisor <span className="text-danger">*</span></Form.Label>
              <SearchableSelect
                value={supervisorLocationForm.supervisorId}
                onChange={(e) => {
                  setSupervisorLocationForm(prev => ({ ...prev, supervisorId: e.target.value }));
                }}
                options={[{ label: 'Select supervisor', value: '' }, ...filteredSupervisorOptionsForLocation]}
                placeholder="Select supervisor"
                searchPlaceholder="Search supervisors..."
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                required
              />
              {filteredSupervisorOptionsForLocation.length === 0 && (
                <Form.Text className="text-muted">
                  No available supervisors. All supervisors may already be assigned to locations or none match the filters.
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Location <span className="text-danger">*</span></Form.Label>
              <SearchableSelect
                value={supervisorLocationForm.locationId}
                onChange={(e) => {
                  setSupervisorLocationForm(prev => ({ ...prev, locationId: e.target.value }));
                }}
                options={[{ label: 'Select location', value: '' }, ...locationOptions]}
                placeholder="Select location"
                searchPlaceholder="Search locations..."
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowSupervisorLocationModal(false);
                setSupervisorLocationForm({ supervisorId: '', locationId: '' });
              }}
              disabled={submittingSupervisorLocation}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              type="submit"
              disabled={submittingSupervisorLocation || !supervisorLocationForm.supervisorId || !supervisorLocationForm.locationId}
            >
              {submittingSupervisorLocation ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Assigning...
                </>
              ) : (
                'Assign Supervisor'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* General Manager Department Assignment Modal */}
      <Modal
        show={showGMModal}
        onHide={() => {
          setShowGMModal(false);
        }}
        size="lg"
        centered
        scrollable
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>General Manager Department Assignments</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {departments
            .filter(dept => dept && dept.id != null && dept.isActive !== false)
            .map((dept) => {
              const assignedGmId = gmAssignments[dept.id];
              const assignedGm = generalManagers.find(gm => String(gm.user_id) === String(assignedGmId));
              
              return (
                <Form.Group key={dept.id} className="mb-3">
                  <Form.Label>{dept.label}</Form.Label>
                  <SearchableSelect
                    value={assignedGmId || ''}
                    onChange={(e) => {
                      const newValue = e.target.value && e.target.value.trim() !== '' ? e.target.value : null;
                      setGmAssignments(prev => ({
                        ...prev,
                        [dept.id]: newValue
                      }));
                    }}
                    options={[
                      { label: 'Unassigned', value: '' },
                      ...generalManagerOptions
                    ]}
                    placeholder="Select general manager"
                    searchPlaceholder="Search general managers..."
                    getOptionLabel={(option) => option.label}
                    getOptionValue={(option) => option.value}
                  />
                  <Form.Text className="text-muted">
                    Current: {assignedGm ? (assignedGm.full_name || assignedGm.name || assignedGm.email) : 'Unassigned'}
                  </Form.Text>
                </Form.Group>
              );
            })}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowGMModal(false)}
            disabled={savingGMs}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveGeneralManagerAssignments}
            disabled={savingGMs}
          >
            {savingGMs ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              'Save General Manager Assignments'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Supervisor to Manager Assignment Modal */}
      <Modal
        show={showSupervisorManagerModal}
        onHide={() => {
          setShowSupervisorManagerModal(false);
          setSupervisorManagerForm({ managerId: '', supervisorId: '' });
        }}
        size="lg"
        centered
        scrollable
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Supervisor Hierarchy Management</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAssignSupervisorToManager}>
            <Form.Group className="mb-3">
              <Form.Label>Manager <span className="text-danger">*</span></Form.Label>
              <SearchableSelect
                value={supervisorManagerForm.managerId}
                onChange={(e) => {
                  setSupervisorManagerForm(prev => ({
                    ...prev,
                    managerId: e.target.value,
                    supervisorId: '' // Reset supervisor when manager changes
                  }));
                }}
                options={[{ label: 'Select manager', value: '' }, ...managers.map(m => ({
                  label: `${m.full_name || m.name || m.email} (${m.department || 'N/A'})`,
                  value: m.user_id
                }))]}
                placeholder="Select manager"
                searchPlaceholder="Search managers..."
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Supervisor <span className="text-danger">*</span></Form.Label>
              <SearchableSelect
                value={supervisorManagerForm.supervisorId}
                onChange={(e) => {
                  setSupervisorManagerForm(prev => ({ ...prev, supervisorId: e.target.value }));
                }}
                options={[{ label: 'Select supervisor', value: '' }, ...filteredSupervisorOptionsForManager]}
                placeholder={supervisorManagerForm.managerId ? 'Select supervisor' : 'Select manager first'}
                searchPlaceholder="Search supervisors..."
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                disabled={!supervisorManagerForm.managerId}
                required
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              disabled={assigningSupervisor || !supervisorManagerForm.managerId || !supervisorManagerForm.supervisorId}
              className="w-100 mb-4"
            >
              {assigningSupervisor ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Assigning...
                </>
              ) : (
                'Assign Supervisor'
              )}
            </Button>
          </Form>

          <hr />

          <h6 className="mb-3">Current Supervisor Hierarchy</h6>
          {supervisorDisplayByManager.length === 0 ? (
            <p className="text-muted">No managers available.</p>
          ) : (
            <div>
              {supervisorDisplayByManager
                .filter(({ manager }) => manager && manager.user_id != null)
                .map(({ manager, supervisors: managerSupervisors }) => {
                  const managerId = String(manager.user_id);
                  const isExpanded = expandedManagers.has(managerId);
                  const supervisorCount = managerSupervisors.filter(s => s && s.user_id != null).length;

                  return (
                    <Card key={managerId} className="mb-2">
                      <Card.Header
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const newExpanded = new Set(expandedManagers);
                          if (isExpanded) {
                            newExpanded.delete(managerId);
                          } else {
                            newExpanded.add(managerId);
                          }
                          setExpandedManagers(newExpanded);
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>
                              {manager.full_name || manager.name || manager.email} • {manager.department || 'Unassigned'}
                            </strong>
                          </div>
                          <div>
                            <Badge bg="info">{supervisorCount} {supervisorCount === 1 ? 'supervisor' : 'supervisors'}</Badge>
                            <span className="ms-2">{isExpanded ? '▼' : '▶'}</span>
                          </div>
                        </div>
                      </Card.Header>
                      {isExpanded && (
                        <Card.Body>
                          {managerSupervisors.length === 0 ? (
                            <p className="text-muted mb-0">No supervisors assigned</p>
                          ) : (
                            <Table size="sm" className="mb-0">
                              <tbody>
                                {managerSupervisors
                                  .filter(supervisor => supervisor && supervisor.user_id != null)
                                  .map((supervisor) => (
                                    <tr key={supervisor.user_id}>
                                      <td className="align-middle">
                                        <div>
                                          <strong>{supervisor.name || supervisor.full_name || supervisor.email}</strong>
                                          <br />
                                          <small className="text-muted">
                                            Department: {supervisor.department || supervisor.emp_deptt || 'N/A'}
                                          </small>
                                        </div>
                                      </td>
                                      <td className="text-end align-middle">
                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          onClick={() => handleUnassignSupervisorFromManager(supervisor.user_id)}
                                        >
                                          Remove
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </Table>
                          )}
                        </Card.Body>
                      )}
                    </Card>
                  );
                })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowSupervisorManagerModal(false);
              setSupervisorManagerForm({ managerId: '', supervisorId: '' });
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

