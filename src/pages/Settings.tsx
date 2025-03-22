import React, { useState } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useSettings } from '../lib/settings';
import type { UserSettings, LeadScoringSettings } from '../lib/types';

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
      const { smePoints, revenueRanges, employeeRanges, aiReadinessPoints, qualificationThreshold } = settingsToValidate.leadScoring;
      
      if (smePoints < 0 || smePoints > 25) {
        errors.smePoints = 'SME points must be between 0 and 25';
      }

      if (qualificationThreshold < 0 || qualificationThreshold > 100) {
        errors.qualificationThreshold = 'Qualification threshold must be between 0 and 100';
      }

      // Validate revenue ranges
      revenueRanges.forEach((range, index) => {
        if (range.min < 0 || range.max < range.min) {
          errors[`revenueRange${index}`] = 'Invalid revenue range';
        }
        if (range.points < 0 || range.points > 25) {
          errors[`revenuePoints${index}`] = 'Revenue points must be between 0 and 25';
        }
      });

      // Validate employee ranges
      employeeRanges.forEach((range, index) => {
        if (range.min < 0 || range.max < range.min) {
          errors[`employeeRange${index}`] = 'Invalid employee range';
        }
        if (range.points < 0 || range.points > 25) {
          errors[`employeePoints${index}`] = 'Employee points must be between 0 and 25';
        }
      });

      // Validate AI readiness points
      const aiPoints = Object.values(aiReadinessPoints);
      if (aiPoints.some(points => points < 0 || points > 25)) {
        errors.aiReadinessPoints = 'AI readiness points must be between 0 and 25';
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
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Scoring Settings</h2>
            
            {/* SME Points */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SME Points (max 25)
              </label>
              <input
                type="number"
                value={currentSettings.leadScoring.smePoints}
                onChange={(e) => handleChange('leadScoring', 'smePoints', parseInt(e.target.value))}
                min="0"
                max="25"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {validationErrors.smePoints && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.smePoints}</p>
              )}
            </div>

            {/* Revenue Ranges */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revenue Ranges
              </label>
              {currentSettings.leadScoring.revenueRanges.map((range, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500">Min Revenue</label>
                    <input
                      type="number"
                      value={range.min}
                      onChange={(e) => {
                        const newRanges = [...currentSettings.leadScoring.revenueRanges];
                        newRanges[index] = { ...range, min: parseInt(e.target.value) };
                        handleChange('leadScoring', 'revenueRanges', newRanges);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Max Revenue</label>
                    <input
                      type="number"
                      value={range.max}
                      onChange={(e) => {
                        const newRanges = [...currentSettings.leadScoring.revenueRanges];
                        newRanges[index] = { ...range, max: parseInt(e.target.value) };
                        handleChange('leadScoring', 'revenueRanges', newRanges);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Points (max 25)</label>
                    <input
                      type="number"
                      value={range.points}
                      onChange={(e) => {
                        const newRanges = [...currentSettings.leadScoring.revenueRanges];
                        newRanges[index] = { ...range, points: parseInt(e.target.value) };
                        handleChange('leadScoring', 'revenueRanges', newRanges);
                      }}
                      min="0"
                      max="25"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Employee Ranges */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Count Ranges
              </label>
              {currentSettings.leadScoring.employeeRanges.map((range, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500">Min Employees</label>
                    <input
                      type="number"
                      value={range.min}
                      onChange={(e) => {
                        const newRanges = [...currentSettings.leadScoring.employeeRanges];
                        newRanges[index] = { ...range, min: parseInt(e.target.value) };
                        handleChange('leadScoring', 'employeeRanges', newRanges);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Max Employees</label>
                    <input
                      type="number"
                      value={range.max}
                      onChange={(e) => {
                        const newRanges = [...currentSettings.leadScoring.employeeRanges];
                        newRanges[index] = { ...range, max: parseInt(e.target.value) };
                        handleChange('leadScoring', 'employeeRanges', newRanges);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Points (max 25)</label>
                    <input
                      type="number"
                      value={range.points}
                      onChange={(e) => {
                        const newRanges = [...currentSettings.leadScoring.employeeRanges];
                        newRanges[index] = { ...range, points: parseInt(e.target.value) };
                        handleChange('leadScoring', 'employeeRanges', newRanges);
                      }}
                      min="0"
                      max="25"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* AI Readiness Points */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Readiness Points (max 25 each)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">AI Competent</label>
                  <input
                    type="number"
                    value={currentSettings.leadScoring.aiReadinessPoints.competent}
                    onChange={(e) => {
                      const newPoints = {
                        ...currentSettings.leadScoring.aiReadinessPoints,
                        competent: parseInt(e.target.value)
                      };
                      handleChange('leadScoring', 'aiReadinessPoints', newPoints);
                    }}
                    min="0"
                    max="25"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">AI Ready</label>
                  <input
                    type="number"
                    value={currentSettings.leadScoring.aiReadinessPoints.ready}
                    onChange={(e) => {
                      const newPoints = {
                        ...currentSettings.leadScoring.aiReadinessPoints,
                        ready: parseInt(e.target.value)
                      };
                      handleChange('leadScoring', 'aiReadinessPoints', newPoints);
                    }}
                    min="0"
                    max="25"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">AI Aware</label>
                  <input
                    type="number"
                    value={currentSettings.leadScoring.aiReadinessPoints.aware}
                    onChange={(e) => {
                      const newPoints = {
                        ...currentSettings.leadScoring.aiReadinessPoints,
                        aware: parseInt(e.target.value)
                      };
                      handleChange('leadScoring', 'aiReadinessPoints', newPoints);
                    }}
                    min="0"
                    max="25"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">AI Unaware</label>
                  <input
                    type="number"
                    value={currentSettings.leadScoring.aiReadinessPoints.unaware}
                    onChange={(e) => {
                      const newPoints = {
                        ...currentSettings.leadScoring.aiReadinessPoints,
                        unaware: parseInt(e.target.value)
                      };
                      handleChange('leadScoring', 'aiReadinessPoints', newPoints);
                    }}
                    min="0"
                    max="25"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Response Time Multipliers */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Time Multipliers
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">Within 24h</label>
                  <input
                    type="number"
                    value={currentSettings.leadScoring.responseTimeMultipliers.within24h}
                    onChange={(e) => {
                      const newMultipliers = {
                        ...currentSettings.leadScoring.responseTimeMultipliers,
                        within24h: parseFloat(e.target.value)
                      };
                      handleChange('leadScoring', 'responseTimeMultipliers', newMultipliers);
                    }}
                    step="0.1"
                    min="1.0"
                    max="2.0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Within 48h</label>
                  <input
                    type="number"
                    value={currentSettings.leadScoring.responseTimeMultipliers.within48h}
                    onChange={(e) => {
                      const newMultipliers = {
                        ...currentSettings.leadScoring.responseTimeMultipliers,
                        within48h: parseFloat(e.target.value)
                      };
                      handleChange('leadScoring', 'responseTimeMultipliers', newMultipliers);
                    }}
                    step="0.1"
                    min="1.0"
                    max="2.0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Within 72h</label>
                  <input
                    type="number"
                    value={currentSettings.leadScoring.responseTimeMultipliers.within72h}
                    onChange={(e) => {
                      const newMultipliers = {
                        ...currentSettings.leadScoring.responseTimeMultipliers,
                        within72h: parseFloat(e.target.value)
                      };
                      handleChange('leadScoring', 'responseTimeMultipliers', newMultipliers);
                    }}
                    step="0.1"
                    min="1.0"
                    max="2.0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Qualification Threshold */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Qualification Threshold
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={currentSettings.leadScoring.qualificationThreshold}
                  onChange={(e) => handleChange('leadScoring', 'qualificationThreshold', parseInt(e.target.value))}
                  min="0"
                  max="100"
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-gray-400 mt-2" />
                  <p className="ml-2 text-sm text-gray-500 mt-1">
                    Leads with scores above this threshold will be automatically marked as qualified
                  </p>
                </div>
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
              {currentSettings.notifications.scoreAlerts && (
                <div className="ml-6">
                  <label className="block text-sm text-gray-700">
                    Score threshold for alerts
                  </label>
                  <input
                    type="number"
                    value={currentSettings.notifications.scoreThreshold}
                    onChange={(e) => handleChange('notifications', 'scoreThreshold', parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              )}
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