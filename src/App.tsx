import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { antdTheme } from './theme/antdTheme';
import { AppStateProvider } from './state/AppStateContext';
import { AppErrorBoundary } from './layouts/AppErrorBoundary';
import { FullPageLoadingFallback } from './layouts/RouteFallback';
import AppShell from './layouts/AppShell';
import { GlobalErrorListener } from './components/feedback/GlobalErrorListener';
import { GlobalEmpty } from './components/feedback/ProfessionalEmpty';
import { RoleProtectedRoute } from './components/feedback/AccessDenied';
import type { UserRole } from './domain/core/enums';

const STAFF_QUEUE_ROLES: UserRole[] = ['doctor', 'nurse', 'receptionist', 'lab_technician', 'imaging_technician', 'pharmacist', 'care_coordinator', 'medical_administrator'];
const QUEUE_CONTROL_ROLES: UserRole[] = ['doctor', 'nurse', 'receptionist', 'medical_administrator'];
const RECEPTION_ROLES: UserRole[] = ['receptionist', 'medical_administrator'];
const WORKFLOW_DESIGN_ROLES: UserRole[] = ['clinical_process_designer', 'medical_administrator'];

// Phân tách router cấp trang
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register')); // Đăng ký đã được tách riêng
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
    <ConfigProvider theme={antdTheme} locale={viVN} renderEmpty={(componentName) => <GlobalEmpty componentName={componentName} />}>
      <AntApp>
        <GlobalErrorListener />
        <AppErrorBoundary>
          <AppStateProvider>
            <BrowserRouter>
              <Suspense fallback={<FullPageLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/kiosk/check-in" element={<KioskCheckIn />} />
                  <Route path="/kiosk/check-in/result" element={<KioskResult />} />
                  <Route path="/display/queue" element={<ClinicQueue board />} />
                  <Route path="/queue-display/:locationId" element={<ClinicQueue board />} />
                  <Route path="/queue-display/station/:stationId" element={<ClinicQueue board />} />
                  <Route path="/app" element={<AppShell />}>
                    <Route index element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="appointments" element={<RoleProtectedRoute allowed={['patient', 'receptionist']} featureName="Lịch hẹn"><Appointments /></RoleProtectedRoute>} />
                    <Route path="appointments/:appointmentId" element={<RoleProtectedRoute allowed={['patient', 'receptionist']} featureName="Chi tiết lịch hẹn"><AppointmentDetail /></RoleProtectedRoute>} />
                    <Route path="appointments/:appointmentId/consultation" element={<RoleProtectedRoute allowed={['patient', 'receptionist', 'doctor']} featureName="Chuẩn bị lượt khám"><AppointmentDetail consultation /></RoleProtectedRoute>} />
                    <Route path="ai-analysis" element={<RoleProtectedRoute allowed={['patient']} featureName="Phân tích AI"><AIAnalysis /></RoleProtectedRoute>} />
                    <Route path="doctor-review" element={<RoleProtectedRoute allowed={['doctor']} featureName="Xem xét và chẩn đoán"><DoctorReview /></RoleProtectedRoute>} />
                    <Route path="journey" element={<Journey />} />
                    <Route path="records" element={<Records />} />
                    <Route path="profile" element={<RoleProtectedRoute allowed={['patient']} featureName="Hồ sơ bệnh nhân"><Profile /></RoleProtectedRoute>} />
                    <Route path="prescriptions" element={<RoleProtectedRoute allowed={['patient']} featureName="Đơn thuốc"><Prescriptions /></RoleProtectedRoute>} />
                    <Route path="progress" element={<RoleProtectedRoute allowed={['patient']} featureName="Theo dõi tiến triển"><Progress /></RoleProtectedRoute>} />
                    <Route path="care" element={<RoleProtectedRoute allowed={['patient', 'care_coordinator', 'customer_care_employee', 'medical_administrator']} featureName="Chăm sóc sau khám"><Care /></RoleProtectedRoute>} />
                    <Route path="reports" element={<RoleProtectedRoute allowed={['patient']} featureName="Báo cáo"><Reports /></RoleProtectedRoute>} />
                    <Route path="workflows/templates" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} featureName="Thiết kế quy trình"><WorkflowTemplates /></RoleProtectedRoute>} />
                    <Route path="workflows" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} featureName="Thiết kế quy trình"><WorkflowTemplates /></RoleProtectedRoute>} />
                    <Route path="workflows/templates/new" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} featureName="Tạo quy trình"><WorkflowTemplates /></RoleProtectedRoute>} />
                    <Route path="workflows/templates/:id" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} featureName="Chỉnh sửa quy trình"><WorkflowTemplateEditor /></RoleProtectedRoute>} />
                    <Route path="workflows/templates/:templateId/versions/:versionId" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} featureName="Phiên bản quy trình"><WorkflowTemplateEditor /></RoleProtectedRoute>} />
                    <Route path="workflows/instances/:id" element={<RoleProtectedRoute allowed={STAFF_QUEUE_ROLES} featureName="Quy trình đang chạy"><WorkflowInstancePage /></RoleProtectedRoute>} />
                    <Route path="workflows/instances/:id/edit" element={<RoleProtectedRoute allowed={STAFF_QUEUE_ROLES} featureName="Điều hành quy trình"><WorkflowInstancePage /></RoleProtectedRoute>} />
                    <Route path="encounters/:encounterId/workflow" element={<RoleProtectedRoute allowed={STAFF_QUEUE_ROLES} featureName="Quy trình lượt khám"><EncounterWorkflow /></RoleProtectedRoute>} />
                    <Route path="patient-journey/:encounterId" element={<PatientJourneyDetail />} />
                    <Route path="work-queue" element={<RoleProtectedRoute allowed={STAFF_QUEUE_ROLES} featureName="Hàng đợi công việc"><WorkQueue /></RoleProtectedRoute>} />
                    <Route path="audit" element={<RoleProtectedRoute allowed={['medical_administrator', 'system_administrator']} featureName="Nhật ký kiểm toán"><AuditViewer /></RoleProtectedRoute>} />
                    <Route path="integrations" element={<RoleProtectedRoute allowed={['medical_administrator', 'system_administrator']} featureName="Tình trạng tích hợp"><Integrations /></RoleProtectedRoute>} />
                    <Route path="reception/qr-check-in" element={<RoleProtectedRoute allowed={RECEPTION_ROLES} featureName="Check-in QR tại lễ tân"><KioskCheckIn reception /></RoleProtectedRoute>} />
                    <Route path="reception" element={<RoleProtectedRoute allowed={RECEPTION_ROLES} featureName="Trung tâm lễ tân"><Reception /></RoleProtectedRoute>} />
                    <Route path="reception/queue" element={<RoleProtectedRoute allowed={RECEPTION_ROLES} featureName="Hàng đợi lễ tân"><ClinicQueue /></RoleProtectedRoute>} />
                    <Route path="queue" element={<RoleProtectedRoute allowed={QUEUE_CONTROL_ROLES} featureName="Điều phối hàng đợi"><ClinicQueue /></RoleProtectedRoute>} />
                    <Route path="queue/stations" element={<RoleProtectedRoute allowed={QUEUE_CONTROL_ROLES} featureName="Trạm phục vụ"><QueueStations /></RoleProtectedRoute>} />
                    <Route path="clinic-queue" element={<RoleProtectedRoute allowed={QUEUE_CONTROL_ROLES} featureName="Điều phối hàng đợi"><ClinicQueue /></RoleProtectedRoute>} />
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