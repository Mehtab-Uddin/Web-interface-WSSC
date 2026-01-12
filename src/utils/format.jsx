import React from 'react';
import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'N/A';
    return format(dateObj, formatStr);
  } catch (error) {
    return 'N/A';
  }
};

export const formatDateTime = (date, formatStr = 'yyyy-MM-dd HH:mm') => {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'N/A';
    return format(dateObj, formatStr);
  } catch (error) {
    return 'N/A';
  }
};

export const formatTime = (date) => {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'N/A';
    return format(dateObj, 'HH:mm');
  } catch (error) {
    return 'N/A';
  }
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
  }).format(amount);
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const formatRole = (role) => {
  if (!role) return 'Unknown';
  return role.split('_').map(capitalize).join(' ');
};

export const formatStaffName = (staff, options = {}) => {
  const { showEmpNo = true, fallback = 'N/A' } = options;
  // Handle both object and string cases
  const name = staff?.full_name || staff?.staff_name || staff?.name || staff?.username || (typeof staff === 'string' ? staff : fallback);
  const empNo = staff?.emp_no || staff?.empNo;
  
  if (showEmpNo && empNo) {
    return (
      <span>
        {name} <span className="text-muted" style={{ fontSize: '0.9em' }}>(#{empNo})</span>
      </span>
    );
  }
  return name;
};

export const formatStaffNameString = (staff, options = {}) => {
  const { showEmpNo = true, fallback = 'N/A' } = options;
  const name = staff?.full_name || staff?.staff_name || staff?.name || staff?.username || (typeof staff === 'string' ? staff : fallback);
  const empNo = staff?.emp_no || staff?.empNo;
  
  if (showEmpNo && empNo) {
    return `${name} (#${empNo})`;
  }
  return name;
};



