import React from 'react';
import {
  CheckCircle2,
  Clock,
  Wrench,
  Archive,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

export const StatusBadge = ({ status }) => {
  switch (status) {
    case 'Available':
      return (
        <span className="badge badge-available">
          <CheckCircle2 size={12} />
          Available
        </span>
      );
    case 'Assigned':
      return (
        <span className="badge badge-assigned">
          <Clock size={12} />
          Assigned
        </span>
      );
    case 'In Repair':
      return (
        <span className="badge badge-in-repair">
          <Wrench size={12} />
          In Repair
        </span>
      );
    case 'Retired':
      return (
        <span className="badge badge-retired">
          <Archive size={12} />
          Retired
        </span>
      );
    case 'Lost':
      return (
        <span className="badge badge-lost">
          <AlertTriangle size={12} />
          Lost
        </span>
      );
    default:
      return (
        <span className="badge badge-retired">
          <HelpCircle size={12} />
          {status}
        </span>
      );
  }
};
