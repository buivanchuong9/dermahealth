import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import AIAnalysis from './pages/AIAnalysis';
import Records from './pages/Records';
import Profile from './pages/Profile';
import Prescriptions from './pages/Prescriptions';
import Progress from './pages/Progress';
import Care from './pages/Care';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import Support from './pages/Support';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="ai-analysis" element={<AIAnalysis />} />
          <Route path="records" element={<Records />} />
          <Route path="profile" element={<Profile />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="progress" element={<Progress />} />
          <Route path="care" element={<Care />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="support" element={<Support />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
