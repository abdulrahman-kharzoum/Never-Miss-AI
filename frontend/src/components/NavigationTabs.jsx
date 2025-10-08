import React from 'react';

const NavigationTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'chat', label: 'Chat', icon: '💬', color: 'from-blue-600 to-blue-700' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'from-cyan-600 to-cyan-700' },
    { id: 'settings', label: 'Settings', icon: '⚙️', color: 'from-teal-600 to-teal-700' }
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex justify-around items-center h-16 max-w-7xl mx-auto px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center px-6 py-2 rounded-xl transition-all duration-300 ${
              activeTab === tab.id
                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg scale-105`
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-2xl mb-1">{tab.icon}</span>
            <span className="text-xs font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NavigationTabs;