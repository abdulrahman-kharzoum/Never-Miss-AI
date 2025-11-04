import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const DashboardTab = ({ user, onSwitchToChat }) => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMessages: 0,
    textMessages: 0,
    audioMessages: 0,
    recentSessions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Get session count
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.uid)
        .order('updated_at', { ascending: false });
      
      // Get message stats
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.uid);

      if (sessions && messages) {
        setStats({
          totalSessions: sessions.length,
          totalMessages: messages.length,
          textMessages: messages.filter(m => m.message_type === 'text').length,
          audioMessages: messages.filter(m => m.message_type === 'audio').length,
          recentSessions: sessions.slice(0, 5)
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <div className="text-gray-600 dark:text-gray-300">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="💬"
          title="Total Conversations"
          value={stats.totalSessions}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          icon="✉️"
          title="Total Messages"
          value={stats.totalMessages}
          color="bg-gradient-to-br from-cyan-500 to-cyan-600"
        />
        <StatCard
          icon="📝"
          title="Text Messages"
          value={stats.textMessages}
          color="bg-gradient-to-br from-teal-500 to-teal-600"
        />
        <StatCard
          icon="🎤"
          title="Voice Messages"
          value={stats.audioMessages}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Conversations</h2>
        {stats.recentSessions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No conversations yet. Start chatting!</p>
        ) : (
          <div className="space-y-3">
            {stats.recentSessions.map(session => (
              <button
                key={session.id}
                onClick={onSwitchToChat}
                className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-600 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {session.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(session.created_at).toLocaleDateString()} • {session.message_count || 0} messages
                    </p>
                  </div>
                  <span className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => {
  return (
    <div className={`${color} p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition-all duration-300`}>
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-4xl font-bold mb-2">{value}</div>
      <div className="text-sm opacity-90">{title}</div>
    </div>
  );
};

export default DashboardTab;