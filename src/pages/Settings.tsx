import React, { useState } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../lib/settings';
import type { UserSettings } from '../lib/types';

function Settings() {
  const { settings, loading, error, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Use local settings if available, otherwise use global settings
  const currentSettings = localSettings || settings;

  const validateSettings = (settingsToValidate: Partial<UserSettings>) => {
    const errors: {[key: string]: string} = {};

    if (settingsToValidate.leadScoring) {
      const { minEmployeeCount, minAnnualRevenue } = settingsToValidate.leadScoring;
      
      if (minEmployeeCount < 0) {
        errors.minEmployeeCount = 'Employee count cannot be negative';
      }
      
      if (minAnnualRevenue < 0) {
        errors.minAnnualRevenue = 'Annual revenue cannot be negative';
      }
    }

    return errors;
  };

  const handleChange = (section: keyof UserSettings, key: string, value: any) => {
    const newSettings = {
      ...currentSettings,
      [section]: {
        ...currentSettings[section],
        [key]: value
      }
    };
    setLocalSettings(newSettings);
    setValidationErrors({});
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localSettings) return;

    const errors = validateSettings(localSettings);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    
    try {
      await updateSettings(localSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      // Error is handled by the context
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Scoring Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Employee Count
                </label>
                <input
                  type="number"
                  value={currentSettings.leadScoring.minEmployeeCount}
                  onChange={(e) => handleChange('leadScoring', 'minEmployeeCount', parseInt(e.target.value))}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    validationErrors.minEmployeeCount
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {validationErrors.minEmployeeCount && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.minEmployeeCount}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Annual Revenue
                </label>
                <input
                  type="number"
                  value={currentSettings.leadScoring.minAnnualRevenue}
                  onChange={(e) => handleChange('leadScoring', 'minAnnualRevenue', parseInt(e.target.value))}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    validationErrors.minAnnualRevenue
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {validationErrors.minAnnualRevenue && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.minAnnualRevenue}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={currentSettings.notifications.emailEnabled}
                  onChange={(e) => handleChange('notifications', 'emailEnabled', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                  Email notifications for new leads
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="scoreAlerts"
                  checked={currentSettings.notifications.scoreAlerts}
                  onChange={(e) => handleChange('notifications', 'scoreAlerts', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="scoreAlerts" className="ml-2 block text-sm text-gray-900">
                  Alerts for high-scoring leads
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !localSettings}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : saveSuccess ? (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;