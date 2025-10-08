import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useTheme } from '../context/ThemeContext';

const SettingsTab = ({ user, onSignOut }) => {
  const [fireflyApiKey, setFireflyApiKey] = useState('');
  const [isSaving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.uid)
        .single();

      if (data) {
        setFireflyApiKey(data.firefly_api_key || '');
      }
    } catch (error) {
      console.log('No settings found, will create on first save');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus('');

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.uid,
          firefly_api_key: fireflyApiKey,
          theme: theme,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSaveStatus('✅ Settings saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('❌ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Appearance */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Appearance</h2>
        
        <div className="space-y-3">
          <label className="text-gray-700 dark:text-gray-300 font-medium">Theme</label>
          <div className="flex space-x-4">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all duration-300 ${
                theme === 'light'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-lg'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
              }`}
            >
              <div className="text-3xl mb-2">☀️</div>
              <div className="font-semibold">Light</div>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all duration-300 ${
                theme === 'dark'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-lg'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
              }`}
            >
              <div className="text-3xl mb-2">🌙</div>
              <div className="font-semibold">Dark</div>
            </button>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Integrations</h2>
        
        <div className="space-y-3">
          <label className="block text-gray-700 dark:text-gray-300 font-medium">Firefly API Key</label>
          <input
            type="password"
            value={fireflyApiKey}
            onChange={(e) => setFireflyApiKey(e.target.value)}
            placeholder="Enter your Firefly API key (optional)"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Used for automated meeting transcription (optional)
          </p>
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        disabled={isSaving}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold transition-all duration-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
      >
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>

      {saveStatus && (
        <div className={`text-center text-sm font-medium ${saveStatus.includes('❌') ? 'text-red-600' : 'text-green-600'}`}>
          {saveStatus}
        </div>
      )}

      {/* Account */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Account</h2>
        
        <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-16 h-16 rounded-full border-2 border-blue-600"
          />
          <div>
            <div className="font-semibold text-gray-900 dark:text-white text-lg">{user.displayName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          🚪 Sign Out
        </button>
      </section>
    </div>
  );
};

export default SettingsTab;