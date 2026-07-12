import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { antdTheme } from './theme/antdTheme';
import { AppStateProvider } from './state/AppStateContext';
import { AppErrorBoundary } from './layouts/AppErrorBoundary';
import { FullPageLoadingFallback } from './layouts/RouteFallback';
import AppShell from './layouts/AppShell';

// Every routed page is code-split at the route level so the initial bundle
// only carries the shell (AppShell/Sidebar/TopHeader/AppState) — heavy
// libraries (Highcharts, @xyflow/react, dnd-kit) only download once a page
// that actually needs them is visited, since only those pages import them.
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Appointments = lazy(() => import('./pages/Appointments'));
const AIAnalysis = lazy(() => import('./pages/AIAnalysis'));
const DoctorReview = lazy(() => import('./pages/DoctorReview'));
const Journey = lazy(() => import('./pages/Journey'));
const Records = lazy(() => import('./pages/Records'));
const Profile = lazy(() => import('./pages/Profile'));
const Prescriptions = lazy(() => import('./pages/Prescriptions'));
const Progress = lazy(() => import('./pages/Progress'));
const Care = lazy(() => import('./pages/Care'));
const Reports = lazy(() => import('./pages/Reports'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const Support = lazy(() => import('./pages/Support'));
const WorkflowTemplates = lazy(() => import('./pages/workflows/WorkflowTemplates'));
const WorkflowTemplateEditor = lazy(() => import('./pages/workflows/WorkflowTemplateEditor'));
const WorkflowInstancePage = lazy(() => import('./pages/workflows/WorkflowInstancePage'));
const WorkQueue = lazy(() => import('./pages/WorkQueue'));
const AuditViewer = lazy(() => import('./pages/AuditViewer'));
const Integrations = lazy(() => import('./pages/Integrations'));

export default function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={viVN}>
      <AntApp>
        <AppErrorBoundary>
          <AppStateProvider>
            <BrowserRouter>
              <Suspense fallback={<FullPageLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/app" element={<AppShell />}>
                    <Route index element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="appointments" element={<Appointments />} />
                    <Route path="ai-analysis" element={<AIAnalysis />} />
                    <Route path="doctor-review" element={<DoctorReview />} />
                    <Route path="journey" element={<Journey />} />
                    <Route path="records" element={<Records />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="prescriptions" element={<Prescriptions />} />
                    <Route path="progress" element={<Progress />} />
                    <Route path="care" element={<Care />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="workflows/templates" element={<WorkflowTemplates />} />
                    <Route path="workflows/templates/:id" element={<WorkflowTemplateEditor />} />
                    <Route path="workflows/instances/:id" element={<WorkflowInstancePage />} />
                    <Route path="work-queue" element={<WorkQueue />} />
                    <Route path="audit" element={<AuditViewer />} />
                    <Route path="integrations" element={<Integrations />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="support" element={<Support />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AppStateProvider>
        </AppErrorBoundary>
      </AntApp>
    </ConfigProvider>
  );
}
