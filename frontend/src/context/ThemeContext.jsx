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
  // Initialize state from localStorage, defaulting to 'light'
  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('app-theme');
      return savedTheme || 'light';
    } catch (error) {
      return 'light';
    }
  });
  const [loading, setLoading] = useState(true);

  // Effect to fetch theme from Supabase and sync with localStorage
  useEffect(() => {
    const loadThemeFromSupabase = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_settings')
          .select('theme')
          .eq('user_id', userId)
          .single();

        if (data && data.theme) {
          setThemeState(data.theme);
          localStorage.setItem('app-theme', data.theme);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    loadThemeFromSupabase();
  }, [userId]);

  // Effect to apply theme to the document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Function to update theme in state, localStorage, and Supabase
  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);

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
        console.error('Error saving theme to Supabase:', error);
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
