import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children, userId }) => {
  const [theme, setThemeState] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, [userId]);

  useEffect(() => {
    // Apply theme to document using data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Also add/remove dark class for Tailwind compatibility
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const loadTheme = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('theme')
        .eq('user_id', userId)
        .single();

      if (data && data.theme) {
        setThemeState(data.theme);
      }
    } catch (error) {
      console.log('No theme preference found, using default');
    } finally {
      setLoading(false);
    }
  };

  const setTheme = async (newTheme) => {
    setThemeState(newTheme);

    if (userId) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            theme: newTheme,
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;