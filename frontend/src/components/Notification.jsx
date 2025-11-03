import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { PLAN_WEBHOOK, STUDY_GUIDE_WEBHOOK, UNIVERSITY_GUIDE_WEBHOOK } from '../utils/api';

const Notification = ({ id, message, type, duration, onClick, data, removeNotification }) => {
  const { theme } = useTheme();
  const notificationRef = useRef(null);

  const baseClasses = "p-4 mb-3 rounded-lg shadow-lg flex items-center justify-between transition-all duration-500 ease-in-out transform pointer-events-auto";
  const themeClasses = theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-800';
  const typeClasses = {
    info: 'border-l-4 border-blue-500',
    success: 'border-l-4 border-green-500',
    warning: 'border-l-4 border-yellow-500',
    error: 'border-l-4 border-red-500',
  }[type];

  const handleClick = () => {
    // If this notification has a redirectUrl and is completed, open the chat interface in a new tab
    try {
      // Notifications coming from Supabase may set status in data or in the `type` field.
      if (data && (data.status === 'completed' || type === 'completed' || type === 'success')) {
        // Determine webhook: prefer explicit webhook in payload, then map by tab/source, then heuristics, then fallback
        const determineWebhook = () => {
          try {
            if (data.webhook) return data.webhook;
            if (data.webhook_url) return data.webhook_url;
            const maybe = (v) => (v || '').toString().toLowerCase();
            const tab = maybe(data.tab);
            const source = maybe(data.source);
            if (tab.includes('study') || source.includes('study')) return STUDY_GUIDE_WEBHOOK;
            if (tab.includes('university') || source.includes('university')) return UNIVERSITY_GUIDE_WEBHOOK;
            if (tab.includes('plan') || tab.includes('day') || source.includes('plan')) return PLAN_WEBHOOK;
            // Fallback to some heuristics on the message text
            if (message && /study guide/i.test(message)) return STUDY_GUIDE_WEBHOOK;
            if (message && /university/i.test(message)) return UNIVERSITY_GUIDE_WEBHOOK;
            if (message && /plan your day|plan/i.test(message)) return PLAN_WEBHOOK;
          } catch (e) {
            // ignore
          }
          return PLAN_WEBHOOK; // default
        };

        const webhook = determineWebhook();
        try { localStorage.setItem('chatWebhookUrl', webhook); } catch (e) { /* ignore */ }
        try {
          const newWin = window.open(`/chat?webhook=${encodeURIComponent(webhook)}`, '_blank');
          // Popup blocked if newWin is null
          if (!newWin) {
            // Fallback: navigate in same tab
            window.location.href = `/chat?webhook=${encodeURIComponent(webhook)}`;
          }
        } catch (e) {
          // As a final fallback, navigate same tab
          window.location.href = `/chat?webhook=${encodeURIComponent(webhook)}`;
        }
        removeNotification(id);
        return;
      }
    } catch (e) {
      console.warn('Failed to open chat from notification', e);
    }

    if (onClick) {
      onClick(data);
    }
    removeNotification(id);
  };

  useEffect(() => {
    const el = notificationRef.current;
    let exitTimer;
    if (el) {
      // Entrance animation via CSS class
      el.classList.add('notif-enter');

      // Auto-remove after duration with exit animation
      if (duration > 0) {
        exitTimer = setTimeout(() => {
          el.classList.remove('notif-enter');
          el.classList.add('notif-exit');
          // remove after animation completes
          setTimeout(() => removeNotification(id), 420);
        }, duration);
      }
    }

    return () => {
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [id, duration, removeNotification]);

  return (
    <div
      ref={notificationRef}
      role="status"
      aria-live="polite"
      className={`${baseClasses} ${themeClasses} ${typeClasses} ${onClick ? 'cursor-pointer hover:shadow-xl' : ''}`}
      onClick={handleClick}
      style={{ minWidth: '250px', maxWidth: '420px' }}
    >
      <p className="flex-grow text-sm">{message}</p>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering onClick of the div
          removeNotification(id);
        }}
        className={`ml-4 text-lg font-bold ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
      >
        &times;
      </button>
    </div>
  );
};

export default Notification;
