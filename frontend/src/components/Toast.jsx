import React, { useEffect } from 'react';
import { IconCheck, IconAlertCircle } from './Icons';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <aside aria-label="Notification" className={`toast-notification toast-${type}`}>
      <div className="toast-icon">
        {type === 'success' ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
      </div>
      <span className="toast-text">{message}</span>
    </aside>
  );
}
