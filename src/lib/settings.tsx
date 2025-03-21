import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { UserSettings, SettingsContextType } from './types';

const DEFAULT_SETTINGS: UserSettings = {
  leadScoring: {
    minEmployeeCount: 100,
    minAnnualRevenue: 1000000,
  },
  notifications: {
    emailEnabled: true,
    scoreAlerts: true,
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to load from local storage for immediate display
      const cachedSettings = localStorage.getItem('userSettings');
      if (cachedSettings) {
        setSettings(JSON.parse(cachedSettings));
      }

      // Then load from database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        const loadedSettings = { ...DEFAULT_SETTINGS, ...data.settings };
        setSettings(loadedSettings);
        localStorage.setItem('userSettings', JSON.stringify(loadedSettings));
      } else {
        // If no settings exist, create default settings
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert([{ 
            user_id: user.id,
            settings: DEFAULT_SETTINGS
          }]);

        if (insertError) throw insertError;

        setSettings(DEFAULT_SETTINGS);
        localStorage.setItem('userSettings', JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
      // Fallback to default settings on error
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updatedSettings = { ...settings, ...newSettings };

      // First try to update existing settings
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ 
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // If no row was updated, insert new settings
      if (updateError) {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert([{
            user_id: user.id,
            settings: updatedSettings,
            updated_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }

      setSettings(updatedSettings);
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to save settings');
      throw err;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, error, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}