import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useTheme } from '../context/ThemeContext';
import './SettingsTab.css';

const SettingsTab = ({ user, onSignOut }) => {
  const [fireflyApiKey, setFireflyApiKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const actualKeyRef = React.useRef('');
  const [isSaving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.uid)
        .single();

      if (data) {
        // Keep the real key off the input field; store it in a ref and show masked input
        actualKeyRef.current = data.firefly_api_key || '';
        setHasSavedKey(!!data.firefly_api_key);
        setFireflyApiKey('');
      }
    } catch (error) {
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus('');

    try {
      // Determine which key to save: new value if user entered it, otherwise keep existing saved key
      const keyToSave = fireflyApiKey && fireflyApiKey.trim() !== '' ? fireflyApiKey.trim() : actualKeyRef.current || null;

      const payload = {
        user_id: user.uid,
        firefly_api_key: keyToSave,
        theme: theme,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      // Also send the key to the n8n webhook
      // Only send to n8n if there's a key (new or existing)
      if (keyToSave) {
        try {
          await fetch('https://n8n.zentraid.com/webhook/firefly', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.REACT_APP_N8N_API_KEY}`
            },
            body: JSON.stringify({ firefly_api_key: keyToSave, user_id: user.uid, user_email: user.email, user_name: user.displayName || '' })
          });
        } catch (n8nError) {
          console.error('Error sending data to n8n webhook:', n8nError);
          // Don't fail the save if webhook call fails; just log
        }
      }

      // If we saved a new key, update stored reference and clear input for masking
      if (fireflyApiKey && fireflyApiKey.trim() !== '') {
        actualKeyRef.current = fireflyApiKey.trim();
        setHasSavedKey(true);
        setFireflyApiKey('');
      }

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
    <div className="settings-container">
      <h1 className="settings-title">Settings</h1>

      {/* Appearance */}
      <section className="settings-section">
        <h2 className="settings-section-title">Appearance</h2>
        
        <div>
          <label className="theme-label">Theme</label>
          <div className="theme-buttons-container">
            <button
              onClick={() => setTheme('light')}
              className={`theme-button ${theme === 'light' ? 'active' : ''}`}
            >
              <div className="theme-button-emoji">☀️</div>
              <div className="theme-button-text">Light</div>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
            >
              <div className="theme-button-emoji">🌙</div>
              <div className="theme-button-text">Dark</div>
            </button>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="settings-section">
        <h2 className="settings-section-title">Integrations</h2>
        
        <div>
          <label className="input-label">Firefly API Key</label>
          <div className="input-container">
            <input
              type="password"
              value={fireflyApiKey}
              onChange={(e) => setFireflyApiKey(e.target.value)}
              placeholder={hasSavedKey ? '••••••••••••••••' : 'Enter your Firefly API key (optional)'}
              className="api-key-input"
            />
            {hasSavedKey && (
              <button
                onClick={() => {
                  // Reveal for edit by clearing input (actual key is kept in ref)
                  setFireflyApiKey('');
                }}
                className="edit-button"
              >
                Edit
              </button>
            )}
          </div>
          <p className="input-helper-text">
            Used for automated meeting transcription (optional)
          </p>
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        disabled={isSaving}
        className="save-button"
      >
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>

      {saveStatus && (
        <div className={`status-message ${saveStatus.includes('❌') ? 'error' : 'success'}`}>
          {saveStatus}
        </div>
      )}

      {/* Account */}
      <section className="settings-section">
        <h2 className="settings-section-title">Account</h2>
        
        <div className="account-info-container">
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="account-avatar"
          />
          <div className="account-details">
            <div className="account-name">{user.displayName}</div>
            <div className="account-email">{user.email}</div>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="signout-button"
        >
          🚪 Sign Out
        </button>
      </section>
    </div>
  );
};

export default SettingsTab;
