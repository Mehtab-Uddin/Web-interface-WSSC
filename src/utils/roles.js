export const ROLE = {
  STAFF: 'staff',
  SUPERVISOR: 'supervisor',
  SUB_ENGINEER: 'sub_engineer',
  MANAGER: 'manager',
  GENERAL_MANAGER: 'general_manager',
  ADMIN_ASSISTANT: 'admin_assistant',
  CEO: 'ceo',
  SUPER_ADMIN: 'super_admin',
};

const ROLE_ORDER = {
  'staff': 0,
  'supervisor': 1,
  'sub_engineer': 1,
  'manager': 2,
  'general_manager': 3,
  'admin_assistant': 2.5,
  'ceo': 4,
  'super_admin': 5,
};

const ROLE_LABELS = {
  staff: 'Staff',
  supervisor: 'Supervisor',
  sub_engineer: 'Sub Engineer',
  manager: 'Manager',
  general_manager: 'General Manager',
  admin_assistant: 'Admin Assistant',
  ceo: 'Chief Executive Officer',
  super_admin: 'Super Admin',
};

export const normalizeRole = (role) => {
  if (typeof role !== 'string') return null;
  return role.trim().toLowerCase();
};

export const isAtLeastRole = (role, minimumRole) => {
  const normalized = normalizeRole(role);
  const normalizedMinimum = normalizeRole(minimumRole);
  if (!normalized || !normalizedMinimum) return false;
  const currentOrder = ROLE_ORDER[normalized];
  const minimumOrder = ROLE_ORDER[normalizedMinimum];
  if (typeof currentOrder !== 'number' || typeof minimumOrder !== 'number') return false;
  return currentOrder >= minimumOrder;
};

export const hasFullControl = (role) => isAtLeastRole(role, ROLE.CEO);
export const hasExecutivePrivileges = (role) => isAtLeastRole(role, ROLE.GENERAL_MANAGER);
export const hasManagementPrivileges = (role) => isAtLeastRole(role, ROLE.MANAGER);

export const getRoleLabel = (role) => {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || 'Unknown';
};

export const ROLE_OPTIONS = Object.values(ROLE).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

// Check if user can access web interface
export const canAccessWebInterface = (role) => {
  const normalized = normalizeRole(role);
  return ['super_admin', 'ceo', 'general_manager'].includes(normalized);
};

// Get role badge color
export const getRoleBadgeColor = (role) => {
  const normalized = normalizeRole(role);
  const colors = {
    super_admin: 'danger',
    ceo: 'warning',
    general_manager: 'info',
    manager: 'primary',
    supervisor: 'success',
    sub_engineer: 'success',
    staff: 'secondary',
    admin_assistant: 'dark',
  };
  return colors[normalized] || 'secondary';
};

