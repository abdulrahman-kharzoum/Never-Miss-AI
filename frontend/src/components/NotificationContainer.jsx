import React from 'react';
import { useNotification } from '../context/NotificationContext';
import Notification from './Notification';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  // Floating notifications (transient) slide in from the right and are pointer-events enabled
  return (
    <div className="fixed top-6 right-6 z-50 pointer-events-none">
      <div className="flex flex-col items-end space-y-3 max-w-sm pointer-events-auto">
        {notifications.map((notif) => (
          <Notification
            key={notif.id}
            id={notif.id}
            message={notif.message}
            type={notif.type}
            duration={notif.duration}
            onClick={notif.onClick}
            data={notif.data}
            removeNotification={removeNotification}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationContainer;
