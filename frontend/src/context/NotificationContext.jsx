import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabaseClient';

const NotificationContext = createContext();

export const NotificationProvider = ({ children, user }) => {
  // active notifications are the transient ones that show on screen
  const [activeNotifications, setActiveNotifications] = useState([]);
  // history keeps all notifications received during this session for the bell panel
  const [history, setHistory] = useState([]);

  const addNotification = useCallback((message, type = 'info', duration = 10000, onClick = null, data = {}) => {
    const id = uuidv4();
    const newNotification = {
      id,
      message,
      type,
      duration,
      onClick,
      data,
      timestamp: new Date(),
    };

    // add to active (transient) list
    setActiveNotifications((prev) => [...prev, newNotification]);
    // add to history for bell panel
    setHistory((prev) => [newNotification, ...prev]);

    // auto-remove from active after duration but keep in history
    if (duration > 0) {
      setTimeout(() => {
        setActiveNotifications((prev) => prev.filter((notif) => notif.id !== id));
      }, duration);
    }

    return id;
  }, []);

  // Subscribe to Supabase realtime notifications for this user (if backend inserts to `notifications` table)
  useEffect(() => {
    let channel;

    try {
      channel = supabase
        .channel('public:notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          const newRow = payload.new;

          // Get current user ID from user prop or fallback to localStorage
          const currentUserId = user?.uid || (() => {
            try { return localStorage.getItem('userId'); } catch (e) { return null; }
          })();

          // If the notification is targeted at a specific user, ignore others
          if (newRow.user_id && currentUserId && newRow.user_id !== currentUserId) return;

          const id = newRow.id || uuidv4();
          const incoming = {
            id,
            message: newRow.message,
            type: newRow.status || 'info',
            duration: 10000,
            onClick: () => {
              if (newRow.data?.redirectUrl) {
                window.open(newRow.data.redirectUrl, '_blank');
              }
            },
            data: newRow.data || {},
            timestamp: newRow.created_at || new Date().toISOString(),
          };

          // Add to active notifications and history
          setActiveNotifications((prev) => [...prev, incoming]);
          setHistory((prev) => [incoming, ...prev]);
        })
        .subscribe();
    } catch (err) {
      console.warn('Supabase realtime subscription failed', err);
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, [user?.uid]);

  const removeNotification = useCallback((id) => {
    setActiveNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setActiveNotifications([]);
    setHistory([]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications: activeNotifications,
        history,
        addNotification,
        removeNotification,
        clearAllNotifications,
        clearHistory,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
