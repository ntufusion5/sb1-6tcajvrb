import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { SettingsProvider } from './lib/settings';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/LeadsList';
import LeadForm from './pages/LeadForm';
import LeadDetail from './pages/LeadDetail';
import Settings from './pages/Settings';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50">
                    <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <Dashboard />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50">
                    <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <LeadsList />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads/new"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50">
                    <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <LeadForm />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads/:id"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50">
                    <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <LeadDetail />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50">
                    <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <Settings />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;