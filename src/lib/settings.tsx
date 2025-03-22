import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { UserSettings, LeadScoringSettings, SettingsContextType } from './types';

const DEFAULT_LEAD_SCORING: LeadScoringSettings = {
  smePoints: 25,
  revenueRanges: [
    { min: 10000000, max: 20000000, points: 25 },
    { min: 8000000, max: 9999999, points: 19 },
    { min: 20000001, max: 25000000, points: 15 }
  ],
  employeeRanges: [
    { min: 10, max: 50, points: 25 },
    { min: 5, max: 9, points: 19 },
    { min: 51, max: 60, points: 15 }
  ],
  aiReadinessPoints: {
    competent: 25,
    ready: 20,
    aware: 15,
    unaware: 5
  },
  responseTimeMultipliers: {
    within24h: 1.3,
    within48h: 1.2,
    within72h: 1.1
  },
  qualificationThreshold: 70
};

const DEFAULT_SETTINGS: UserSettings = {
  leadScoring: DEFAULT_LEAD_SCORING,
  notifications: {
    emailEnabled: true,
    scoreAlerts: true,
    scoreThreshold: 70
  }
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
        const parsed = JSON.parse(cachedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
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
        const loadedSettings = {
          ...DEFAULT_SETTINGS,
          ...data.settings,
          leadScoring: {
            ...DEFAULT_SETTINGS.leadScoring,
            ...(data.settings.leadScoring || {})
          },
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...(data.settings.notifications || {})
          }
        };
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

      const updatedSettings = {
        ...settings,
        ...newSettings,
        leadScoring: {
          ...settings.leadScoring,
          ...(newSettings.leadScoring || {})
        },
        notifications: {
          ...settings.notifications,
          ...(newSettings.notifications || {})
        }
      };

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