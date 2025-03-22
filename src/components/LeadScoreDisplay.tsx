import React from 'react';
import { PieChart } from 'lucide-react';

interface LeadScoreDisplayProps {
  scoreBreakdown: {
    smeScore: number;
    revenueScore: number;
    employeeScore: number;
    aiReadinessScore: number;
    responseTimeMultiplier: number;
    total: number;
  };
}

export default function LeadScoreDisplay({ scoreBreakdown }: LeadScoreDisplayProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <PieChart className="h-5 w-5 mr-2 text-indigo-600" />
        Lead Score Breakdown
      </h3>
      <div className="space-y-4">
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-sm font-medium text-gray-700">SME Status</span>
            </div>
            <div className="text-sm font-semibold text-indigo-600">{scoreBreakdown.smeScore}/25</div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
            <div
              style={{ width: `${(scoreBreakdown.smeScore / 25) * 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-300 ease-in-out"
            />
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-sm font-medium text-gray-700">Annual Revenue</span>
            </div>
            <div className="text-sm font-semibold text-indigo-600">{scoreBreakdown.revenueScore}/25</div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
            <div
              style={{ width: `${(scoreBreakdown.revenueScore / 25) * 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-300 ease-in-out"
            />
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-sm font-medium text-gray-700">Employee Count</span>
            </div>
            <div className="text-sm font-semibold text-indigo-600">{scoreBreakdown.employeeScore}/25</div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
            <div
              style={{ width: `${(scoreBreakdown.employeeScore / 25) * 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-300 ease-in-out"
            />
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-sm font-medium text-gray-700">AI Readiness</span>
            </div>
            <div className="text-sm font-semibold text-indigo-600">{scoreBreakdown.aiReadinessScore}/25</div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
            <div
              style={{ width: `${(scoreBreakdown.aiReadinessScore / 25) * 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-300 ease-in-out"
            />
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-sm font-medium text-gray-700">Response Time Multiplier</span>
            </div>
            <div className="text-sm font-semibold text-indigo-600">×{scoreBreakdown.responseTimeMultiplier.toFixed(1)}</div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
            <div
              style={{ width: `${((scoreBreakdown.responseTimeMultiplier - 1) / 0.3) * 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-300 ease-in-out"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Total Score</span>
            <div className="flex items-center">
              <div className="text-2xl font-bold text-indigo-600">{scoreBreakdown.total}</div>
              <div className="text-sm text-gray-500 ml-1">/100</div>
            </div>
          </div>
          <div className="mt-2 overflow-hidden h-3 text-xs flex rounded-full bg-gray-100">
            <div
              style={{ width: `${scoreBreakdown.total}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 ease-in-out"
            />
          </div>
        </div>
      </div>
    </div>
  );
}