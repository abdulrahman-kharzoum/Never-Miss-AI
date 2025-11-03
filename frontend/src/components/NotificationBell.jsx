import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { PLAN_WEBHOOK, STUDY_GUIDE_WEBHOOK, UNIVERSITY_GUIDE_WEBHOOK } from '../utils/api';

const BellIcon = ({ count, onClick, theme }) => (
  <button
    onClick={onClick}
    title="Notifications"
    className={`relative p-2 rounded-full transition-all duration-200 ${theme === 'dark' ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-800 hover:shadow-lg'}`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z" />
    </svg>
    {count > 0 && (
      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
        {count}
      </span>
    )}
  </button>
);

const NotificationBell = ({ theme = 'light' }) => {
  const { history, clearHistory } = useNotification();
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(false);

  // Compute unread count for file-processing notifications only.
  // Use a sessionStorage timestamp so once the user opens the bell, counts reset for this session.
  const lastOpenedKey = 'bell_last_opened_at_file_processing';
  const lastOpened = parseInt(sessionStorage.getItem(lastOpenedKey) || '0', 10);

  const unreadCount = history.filter(h => {
    if (!h || h.source !== 'file_processing') return false;
    const ts = h.timestamp ? new Date(h.timestamp).getTime() : 0;
    return ts > lastOpened;
  }).length;

  const toggle = () => {
    setOpen(o => {
      const newOpen = !o;
      if (newOpen) {
        try { sessionStorage.setItem(lastOpenedKey, Date.now().toString()); } catch (e) { /* ignore */ }
      }
      return newOpen;
    });
  };

  // Play a short ring animation when unreadCount changes from 0 -> >0
  useEffect(() => {
    if (unreadCount > 0) {
      setRing(true);
      const t = setTimeout(() => setRing(false), 1400);
      return () => clearTimeout(t);
    }
  }, [unreadCount]);

  return (
    <div style={{ position: 'relative' }}>
      <div className={ring ? 'bell-ring inline-block' : 'inline-block'}>
        <BellIcon count={unreadCount} onClick={toggle} theme={theme} />
      </div>

      {open && (
        <div className={`z-50 mt-2 right-0 w-96 rounded-lg shadow-2xl ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`} style={{ position: 'absolute', top: '40px', right: 0 }}>
          <div className="p-3 border-b flex items-center justify-between">
            <div className="font-semibold">Notifications</div>
            <div className="flex items-center gap-2">
              <button onClick={() => { clearHistory(); }} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
              <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
            </div>
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {history.length === 0 && (
              <div className="p-4 text-sm text-gray-500">No notifications yet.</div>
            )}
            {history.map((item) => (
              <div key={item.id} className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`} onClick={() => {
                // If the notification had an onClick handler, call it. If it's a completed file with redirectUrl, open a new tab.
                if (item.onClick) {
                  try { item.onClick(item.data); } catch (e) { console.error(e); }
                } else if ((item.data && item.data.status === 'completed') || item.type === 'completed' || item.type === 'success') {
                  try {
                    // Determine webhook: prefer explicit webhook in payload, then map by tab/source or message heuristics
                    const determineWebhook = () => {
                      try {
                        if (item.data?.webhook) return item.data.webhook;
                        if (item.data?.webhook_url) return item.data.webhook_url;
                        const maybe = (v) => (v || '').toString().toLowerCase();
                        const tab = maybe(item.data?.tab);
                        const source = maybe(item.data?.source);
                        if (tab.includes('study') || source.includes('study')) return STUDY_GUIDE_WEBHOOK;
                        if (tab.includes('university') || source.includes('university')) return UNIVERSITY_GUIDE_WEBHOOK;
                        if (tab.includes('plan') || tab.includes('day') || source.includes('plan')) return PLAN_WEBHOOK;
                        if (item.message && /study guide/i.test(item.message)) return STUDY_GUIDE_WEBHOOK;
                        if (item.message && /university/i.test(item.message)) return UNIVERSITY_GUIDE_WEBHOOK;
                        if (item.message && /plan your day|plan/i.test(item.message)) return PLAN_WEBHOOK;
                      } catch (e) { /* ignore */ }
                      return PLAN_WEBHOOK;
                    };

                    const webhook = determineWebhook();
                    localStorage.setItem('chatWebhookUrl', webhook);
                    try {
                      const newWin = window.open(`/chat?webhook=${encodeURIComponent(webhook)}`, '_blank');
                      if (!newWin) {
                        window.location.href = `/chat?webhook=${encodeURIComponent(webhook)}`;
                      }
                    } catch (e) {
                      window.location.href = `/chat?webhook=${encodeURIComponent(webhook)}`;
                    }
                  } catch (e) {
                    console.error('Failed to open chat window', e);
                  }
                }
              }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.message}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</div>
                  </div>
                  <div className="ml-3 text-xs font-semibold">
                    <span className={`px-2 py-1 rounded-full ${item.type === 'completed' || item.type === 'success' ? 'bg-green-100 text-green-700' : item.type === 'pending' || item.type === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {item.data?.status || item.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
