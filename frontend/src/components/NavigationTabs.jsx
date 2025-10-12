import React from 'react';

const NavigationTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'chat', label: 'Chat', icon: '💬', gradient: 'from-blue-600 via-blue-700 to-blue-800' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊', gradient: 'from-cyan-600 via-cyan-700 to-cyan-800' },
    { id: 'settings', label: 'Settings', icon: '⚙️', gradient: 'from-teal-600 via-teal-700 to-teal-800' }
  ];

  return (
    <div className="bg-gradient-to-r from-gray-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex justify-around items-center h-20 max-w-7xl mx-auto px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center justify-center px-8 py-3 rounded-2xl transition-all duration-500 transform ${
              activeTab === tab.id
                ? `bg-gradient-to-r ${tab.gradient} text-white shadow-2xl scale-110 animate-glow-tab`
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800 hover:scale-105'
            }`}
          >
            {activeTab === tab.id && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 opacity-30 blur-xl animate-pulse"></div>
            )}
            <span className={`text-3xl mb-1 relative z-10 ${activeTab === tab.id ? 'animate-bounce-slow' : ''}`}>
              {tab.icon}
            </span>
            <span className="text-sm font-bold relative z-10">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 rounded-full animate-pulse"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NavigationTabs;