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
import type { UserRole } from './domain/core/role';

const STAFF_QUEUE_ROLES: UserRole[] = ['doctor', 'nurse', 'receptionist', 'lab_technician', 'imaging_technician', 'pharmacist', 'care_coordinator', 'medical_administrator', 'super_administrator'];
const QUEUE_CONTROL_ROLES: UserRole[] = ['doctor', 'nurse', 'receptionist', 'medical_administrator', 'super_administrator'];
const RECEPTION_ROLES: UserRole[] = ['receptionist', 'medical_administrator', 'super_administrator'];
const WORKFLOW_DESIGN_ROLES: UserRole[] = ['clinical_process_designer', 'medical_administrator', 'super_administrator'];
const SCHEDULE_MANAGE_ROLES: UserRole[] = ['doctor', 'medical_administrator', 'super_administrator'];
const ALL_ROLES: UserRole[] = ['super_administrator', 'patient', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'imaging_technician', 'pharmacist', 'care_coordinator', 'customer_care_employee', 'medical_administrator', 'system_administrator', 'clinical_process_designer'];

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
const OwnerOperations = lazy(() => import('./pages/OwnerOperations'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const PractitionerSchedule = lazy(() => import('./pages/PractitionerSchedule'));
const PatientClinicalWorkspace = lazy(() => import('./pages/PatientClinicalWorkspace'));

export default function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={viVN} renderEmpty={(componentName) => <GlobalEmpty componentName={componentName} />}>
      <AntApp>
        <GlobalErrorListener />
        <AppErrorBoundary>
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
                <Route
                  path="/app"
                  element={
                    <AppStateProvider>
                      <AppShell />
                    </AppStateProvider>
                  }
                >
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<RoleProtectedRoute allowed={ALL_ROLES} permissions={['module.dashboard.view']} featureName="Tổng quan"><Dashboard /></RoleProtectedRoute>} />
                  <Route path="appointments" element={<RoleProtectedRoute allowed={['patient', 'receptionist', 'super_administrator']} permissions={['module.appointments.access']} featureName="Lịch hẹn"><Appointments /></RoleProtectedRoute>} />
                  <Route path="appointments/:appointmentId" element={<RoleProtectedRoute allowed={['patient', 'receptionist', 'super_administrator']} permissions={['module.appointments.access']} featureName="Chi tiết lịch hẹn"><AppointmentDetail /></RoleProtectedRoute>} />
                  <Route path="appointments/:appointmentId/consultation" element={<RoleProtectedRoute allowed={['patient', 'receptionist', 'doctor']} featureName="Chuẩn bị lượt khám"><AppointmentDetail consultation /></RoleProtectedRoute>} />
                  <Route path="ai-analysis" element={<RoleProtectedRoute allowed={['patient']} permissions={['module.ai_analysis.access']} featureName="Phân tích AI"><AIAnalysis /></RoleProtectedRoute>} />
                  <Route path="doctor-review" element={<RoleProtectedRoute allowed={['doctor']} permissions={['module.doctor_review.access']} featureName="Xem xét và chẩn đoán"><DoctorReview /></RoleProtectedRoute>} />
                  <Route path="journey" element={<RoleProtectedRoute allowed={ALL_ROLES} permissions={['module.journey.access']} featureName="Tiến trình khám bệnh"><Journey /></RoleProtectedRoute>} />
                  <Route path="records" element={<RoleProtectedRoute allowed={ALL_ROLES} permissions={['module.records.access']} featureName="Bệnh án trọn đời"><Records /></RoleProtectedRoute>} />
                  <Route path="patients/:patientId/clinical-workspace" element={<RoleProtectedRoute allowed={ALL_ROLES} permissions={['module.records.access']} featureName="Bàn làm việc lâm sàng"><PatientClinicalWorkspace /></RoleProtectedRoute>} />
                  <Route path="profile" element={<RoleProtectedRoute allowed={['patient']} permissions={['module.profile.access']} featureName="Hồ sơ bệnh nhân"><Profile /></RoleProtectedRoute>} />
                  <Route path="prescriptions" element={<RoleProtectedRoute allowed={['patient']} permissions={['module.prescriptions.access']} featureName="Đơn thuốc"><Prescriptions /></RoleProtectedRoute>} />
                  <Route path="progress" element={<RoleProtectedRoute allowed={['patient']} permissions={['module.progress.access']} featureName="Theo dõi tiến triển"><Progress /></RoleProtectedRoute>} />
                  <Route path="care" element={<RoleProtectedRoute allowed={['patient', 'care_coordinator', 'customer_care_employee', 'medical_administrator', 'super_administrator']} permissions={['module.care.access']} featureName="Chăm sóc sau khám"><Care /></RoleProtectedRoute>} />
                  <Route path="reports" element={<RoleProtectedRoute allowed={['patient']} permissions={['module.reports.access']} featureName="Báo cáo"><Reports /></RoleProtectedRoute>} />
                  <Route path="workflows/templates" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} permissions={['module.workflow_design.access']} featureName="Thiết kế quy trình"><WorkflowTemplates /></RoleProtectedRoute>} />
                  <Route path="workflows" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} featureName="Thiết kế quy trình"><WorkflowTemplates /></RoleProtectedRoute>} />
                  <Route path="workflows/templates/new" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} featureName="Tạo quy trình"><WorkflowTemplates /></RoleProtectedRoute>} />
                  <Route path="workflows/templates/:id" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} featureName="Chỉnh sửa quy trình"><WorkflowTemplateEditor /></RoleProtectedRoute>} />
                  <Route path="workflows/templates/:templateId/versions/:versionId" element={<RoleProtectedRoute allowed={WORKFLOW_DESIGN_ROLES} featureName="Phiên bản quy trình"><WorkflowTemplateEditor /></RoleProtectedRoute>} />
                  <Route path="workflows/instances/:id" element={<RoleProtectedRoute allowed={STAFF_QUEUE_ROLES} featureName="Quy trình đang chạy"><WorkflowInstancePage /></RoleProtectedRoute>} />
                  <Route path="workflows/instances/:id/edit" element={<RoleProtectedRoute allowed={STAFF_QUEUE_ROLES} featureName="Điều hành quy trình"><WorkflowInstancePage /></RoleProtectedRoute>} />
                  <Route path="encounters/:encounterId/workflow" element={<RoleProtectedRoute allowed={STAFF_QUEUE_ROLES} featureName="Quy trình lượt khám"><EncounterWorkflow /></RoleProtectedRoute>} />
                  <Route path="patient-journey/:encounterId" element={<PatientJourneyDetail />} />
                  <Route path="work-queue" element={<RoleProtectedRoute allowed={STAFF_QUEUE_ROLES} permissions={['module.work_queue.access']} featureName="Hàng đợi công việc"><WorkQueue /></RoleProtectedRoute>} />
                  <Route path="audit" element={<RoleProtectedRoute allowed={['medical_administrator', 'system_administrator', 'super_administrator']} permissions={['module.audit.access']} featureName="Nhật ký kiểm toán"><AuditViewer /></RoleProtectedRoute>} />
                  <Route path="integrations" element={<RoleProtectedRoute allowed={['medical_administrator', 'system_administrator', 'super_administrator']} permissions={['module.integrations.access']} featureName="Tình trạng tích hợp"><Integrations /></RoleProtectedRoute>} />
                  <Route path="owner" element={<RoleProtectedRoute allowed={['super_administrator']} permissions={['module.owner.access']} featureName="Owner Control Center"><OwnerOperations /></RoleProtectedRoute>} />
                  <Route path="staff" element={<RoleProtectedRoute allowed={['super_administrator', 'medical_administrator']} permissions={['module.staff.access']} featureName="Quản lý nhân sự"><StaffManagement /></RoleProtectedRoute>} />
                  <Route path="practitioner-schedule" element={<RoleProtectedRoute allowed={SCHEDULE_MANAGE_ROLES} permissions={['module.practitioner_schedule.access']} featureName="Lịch làm việc bác sĩ"><PractitionerSchedule /></RoleProtectedRoute>} />
                  <Route path="reception/qr-check-in" element={<RoleProtectedRoute allowed={RECEPTION_ROLES} permissions={['module.checkin.access']} featureName="Check-in QR tại lễ tân"><KioskCheckIn reception /></RoleProtectedRoute>} />
                  <Route path="reception" element={<RoleProtectedRoute allowed={RECEPTION_ROLES} permissions={['module.reception.access']} featureName="Trung tâm lễ tân"><Reception /></RoleProtectedRoute>} />
                  <Route path="reception/queue" element={<RoleProtectedRoute allowed={RECEPTION_ROLES} featureName="Hàng đợi lễ tân"><ClinicQueue /></RoleProtectedRoute>} />
                  <Route path="queue" element={<RoleProtectedRoute allowed={QUEUE_CONTROL_ROLES} featureName="Điều phối hàng đợi"><ClinicQueue /></RoleProtectedRoute>} />
                  <Route path="queue/stations" element={<RoleProtectedRoute allowed={QUEUE_CONTROL_ROLES} featureName="Trạm phục vụ"><QueueStations /></RoleProtectedRoute>} />
                  <Route path="clinic-queue" element={<RoleProtectedRoute allowed={QUEUE_CONTROL_ROLES} permissions={['module.queue.access']} featureName="Điều phối hàng đợi"><ClinicQueue /></RoleProtectedRoute>} />
                  <Route path="settings" element={<RoleProtectedRoute allowed={ALL_ROLES} permissions={['module.settings.access']} featureName="Cài đặt"><SettingsPage /></RoleProtectedRoute>} />
                  <Route path="support" element={<RoleProtectedRoute allowed={ALL_ROLES} permissions={['module.support.access']} featureName="Hỗ trợ"><Support /></RoleProtectedRoute>} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppErrorBoundary>
      </AntApp>
    </ConfigProvider>
  );
}
