import { Row, Col, Card } from 'react-bootstrap';
import StatsCard from './StatsCard';
import { Users, Clock, Calendar, CheckCircle } from 'lucide-react';

export default function DashboardStats({ stats, user }) {
  if (!stats) return null;

  const { basic, byRoleDept } = stats;

  return (
    <div className="fade-in">
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-4">
          <StatsCard
            title="Total Staff"
            value={basic?.totalStaff || 0}
            icon={Users}
            color="blue"
          />
        </Col>
        <Col md={3} sm={6} className="mb-4">
          <StatsCard
            title="Supervisors"
            value={basic?.supervisorCount || 0}
            icon={Users}
            color="green"
          />
        </Col>
        <Col md={3} sm={6} className="mb-4">
          <StatsCard
            title="Sub Engineers"
            value={basic?.subEngineerCount || 0}
            icon={Users}
            color="purple"
          />
        </Col>
        <Col md={3} sm={6} className="mb-4">
          <StatsCard
            title="Pending Leave Requests"
            value={basic?.pendingLeaveRequestsCount || 0}
            icon={Calendar}
            color="orange"
          />
        </Col>
      </Row>

      {byRoleDept && (
        <Row>
          <Col md={6} className="mb-4">
            <Card className="custom-card">
              <div className="card-header-custom">
                <h4>Users by Role</h4>
              </div>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th className="text-end">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byRoleDept.byRole?.map((item) => (
                      <tr key={item.role}>
                        <td>
                          <span className="text-capitalize">
                            {item.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-end fw-bold">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Col>

          <Col md={6} className="mb-4">
            <Card className="custom-card">
              <div className="card-header-custom">
                <h4>Users by Department</h4>
              </div>
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th className="text-end">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byRoleDept.byDepartment?.map((item) => (
                      <tr key={item.department}>
                        <td>{item.department || 'Unassigned'}</td>
                        <td className="text-end fw-bold">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

