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
const KioskCheckIn = lazy(() => import('./pages/KioskCheckIn'));
const KioskResult = lazy(() => import('./pages/KioskResult'));
const ClinicQueue = lazy(() => import('./pages/ClinicQueue'));
const AppointmentDetail = lazy(() => import('./pages/AppointmentDetail'));
const Reception = lazy(() => import('./pages/Reception'));
const QueueStations = lazy(() => import('./pages/QueueStations'));
const PatientJourneyDetail = lazy(() => import('./pages/PatientJourneyDetail'));
const EncounterWorkflow = lazy(() => import('./pages/EncounterWorkflow'));

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
                  <Route path="/kiosk/check-in" element={<KioskCheckIn />} />
                  <Route path="/kiosk/check-in/result" element={<KioskResult />} />
                  <Route path="/display/queue" element={<ClinicQueue board />} />
                  <Route path="/queue-display/:locationId" element={<ClinicQueue board />} />
                  <Route path="/queue-display/station/:stationId" element={<ClinicQueue board />} />
                  <Route path="/app" element={<AppShell />}>
                    <Route index element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="appointments" element={<Appointments />} />
                    <Route path="appointments/:appointmentId" element={<AppointmentDetail />} />
                    <Route path="appointments/:appointmentId/consultation" element={<AppointmentDetail consultation />} />
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
                    <Route path="workflows" element={<WorkflowTemplates />} />
                    <Route path="workflows/templates/new" element={<WorkflowTemplates />} />
                    <Route path="workflows/templates/:id" element={<WorkflowTemplateEditor />} />
                    <Route path="workflows/templates/:templateId/versions/:versionId" element={<WorkflowTemplateEditor />} />
                    <Route path="workflows/instances/:id" element={<WorkflowInstancePage />} />
                    <Route path="workflows/instances/:id/edit" element={<WorkflowInstancePage />} />
                    <Route path="encounters/:encounterId/workflow" element={<EncounterWorkflow />} />
                    <Route path="patient-journey/:encounterId" element={<PatientJourneyDetail />} />
                    <Route path="work-queue" element={<WorkQueue />} />
                    <Route path="audit" element={<AuditViewer />} />
                    <Route path="integrations" element={<Integrations />} />
                    <Route path="reception/qr-check-in" element={<KioskCheckIn reception />} />
                    <Route path="reception" element={<Reception />} />
                    <Route path="reception/queue" element={<ClinicQueue />} />
                    <Route path="queue" element={<ClinicQueue />} />
                    <Route path="queue/stations" element={<QueueStations />} />
                    <Route path="clinic-queue" element={<ClinicQueue />} />
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
