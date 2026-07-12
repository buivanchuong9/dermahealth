import type {
  User, Patient, Appointment, MedicalEncounter, SymptomIntake, AIPreliminaryAssessment,
  DoctorReview, DoctorDiagnosis, ClinicalPlan, ClinicalOrder, ClinicalResult,
  WorkflowTemplate, WorkflowTemplateVersion, WorkflowInstance, WorkflowTask,
  ClinicalDocument, MedicalRecord, Prescription, CRMCarePlan, FollowUpActivity,
  ClinicalAlert, EncounterCreationRequest, Notification, Consent, AuditEvent,
  IntegrationConnection, IntegrationMessage,
} from './core/entities';

// One coherent, hand-written demo world. IDs are stable string literals (not
// generated) so that every page can hardcode a reference like "the active
// encounter is ENC-1001" and it stays true across reloads/resets. Entities
// created at runtime by user actions (new AI re-assessment, new escalation,
// new workflow task, ...) use `nextId()` from core/ids.ts instead.

export interface DomainWorld {
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  encounters: MedicalEncounter[];
  symptomIntakes: SymptomIntake[];
  aiAssessments: AIPreliminaryAssessment[];
  doctorReviews: DoctorReview[];
  doctorDiagnoses: DoctorDiagnosis[];
  clinicalPlans: ClinicalPlan[];
  clinicalOrders: ClinicalOrder[];
  clinicalResults: ClinicalResult[];
  workflowTemplates: WorkflowTemplate[];
  workflowTemplateVersions: WorkflowTemplateVersion[];
  workflowInstances: WorkflowInstance[];
  workflowTasks: WorkflowTask[];
  clinicalDocuments: ClinicalDocument[];
  medicalRecords: MedicalRecord[];
  prescriptions: Prescription[];
  carePlans: CRMCarePlan[];
  followUpActivities: FollowUpActivity[];
  clinicalAlerts: ClinicalAlert[];
  encounterCreationRequests: EncounterCreationRequest[];
  notifications: Notification[];
  consents: Consent[];
  auditEvents: AuditEvent[];
  integrationConnections: IntegrationConnection[];
  integrationMessages: IntegrationMessage[];
}

export function createSeedWorld(): DomainWorld {
  const users: User[] = [
    { id: 'U-0001', name: 'Nguyễn Văn A', role: 'patient' },
    { id: 'U-0002', name: 'Bs. Nguyễn Thị An', role: 'doctor', department: 'Khoa Da liễu', specialty: 'Da liễu', online: true },
    { id: 'U-0003', name: 'ĐD. Trần Thị Bích', role: 'nurse', department: 'Khoa Da liễu' },
    { id: 'U-0004', name: 'Phạm Thị Hoa', role: 'receptionist', department: 'Tiếp đón' },
    { id: 'U-0005', name: 'KTV. Lê Văn Sơn', role: 'lab_technician', department: 'Xét nghiệm' },
    { id: 'U-0006', name: 'KTV. Đỗ Thị Mai', role: 'imaging_technician', department: 'Chẩn đoán hình ảnh' },
    { id: 'U-0007', name: 'DS. Vũ Văn Long', role: 'pharmacist', department: 'Dược' },
    { id: 'U-0008', name: 'Ngô Thị Lan', role: 'care_coordinator', department: 'Điều phối chăm sóc' },
    { id: 'U-0009', name: 'Bùi Văn Tùng', role: 'customer_care_employee', department: 'Chăm sóc khách hàng' },
    { id: 'U-0010', name: 'Hoàng Thị Nga', role: 'medical_administrator', department: 'Quản trị y tế' },
    { id: 'U-0011', name: 'Trịnh Văn Đức', role: 'system_administrator', department: 'CNTT' },
    { id: 'U-0012', name: 'Đặng Thị Thu', role: 'clinical_process_designer', department: 'Thiết kế quy trình' },
    { id: 'U-0013', name: 'Bs. Trần Văn Nam', role: 'doctor', department: 'Khoa Da liễu thẩm mỹ', specialty: 'Da liễu thẩm mỹ', online: true },
  ];

  const patients: Patient[] = [
    {
      id: 'PT-1029', code: 'PT-1029', name: 'Nguyễn Văn A', primaryDoctorId: 'U-0002',
      profile: { dob: '15/03/1995', gender: 'Nam', phone: '0912 345 678', email: 'nguyenvana@gmail.com', address: 'Q. Bình Thạnh, TP.HCM', bloodType: 'O+' },
    },
  ];

  const appointments: Appointment[] = [
    { id: 'APT-1001', patientId: 'PT-1029', doctorId: 'U-0002', date: '15/09/2023', time: '10:00', mode: 'in_person', status: 'done', encounterId: 'ENC-1000' },
    { id: 'APT-1002', patientId: 'PT-1029', doctorId: 'U-0013', date: '22/10/2023', time: '14:00', mode: 'in_person', status: 'upcoming' },
    { id: 'APT-1003', patientId: 'PT-1029', doctorId: 'U-0002', date: '15/10/2023', time: '09:00', mode: 'in_person', status: 'done', encounterId: 'ENC-1001' },
  ];

  const encounters: MedicalEncounter[] = [
    {
      id: 'ENC-1000', patientId: 'PT-1029', appointmentId: 'APT-1001', type: 'standard', origin: 'appointment',
      status: 'closed', department: 'Khoa Da liễu', createdAt: '15/09/2023 10:00', updatedAt: '15/09/2023 11:10',
      currentDoctorId: 'U-0002', aiAssessmentIds: [], doctorReviewIds: [], diagnosisIds: ['DX-1000'],
      clinicalPlanId: 'PLAN-1000', clinicalOrderIds: [], medicalRecordId: 'MREC-1000',
      events: [
        { id: 'EV-1000-1', at: '15/09/2023 10:00', label: 'Đăng ký khám lần đầu', kind: 'info' },
        { id: 'EV-1000-2', at: '15/09/2023 10:40', label: 'Bác sĩ chẩn đoán Mụn trứng cá độ III', kind: 'info' },
        { id: 'EV-1000-3', at: '15/09/2023 11:10', label: 'Hồ sơ khám đã được ký', kind: 'success' },
      ],
    },
    {
      id: 'ENC-1001', patientId: 'PT-1029', appointmentId: 'APT-1003', type: 'standard', origin: 'appointment',
      status: 'in_progress', department: 'Khoa Da liễu', room: 'Phòng 204', queueNumber: 12, peopleAheadInQueue: 0,
      estimatedWaitMinutes: 0, createdAt: '15/10/2023 09:00', updatedAt: '15/10/2023 10:05', currentDoctorId: 'U-0002',
      symptomIntakeId: 'INTAKE-1001', aiAssessmentIds: ['AIA-1001'], doctorReviewIds: ['DRV-1001'],
      diagnosisIds: ['DX-1001'], clinicalPlanId: 'PLAN-1001', clinicalOrderIds: ['ORD-1001'],
      workflowInstanceId: 'WFI-1001', medicalRecordId: 'MREC-1001',
      blockingCondition: 'Chờ dược sĩ cấp phát thuốc trước khi ký hồ sơ xuất viện',
      events: [
        { id: 'EV-1001-1', at: '15/10/2023 09:00', label: 'Check-in tại quầy lễ tân', kind: 'info' },
        { id: 'EV-1001-2', at: '15/10/2023 09:15', label: 'Hoàn thành khai báo triệu chứng', kind: 'info' },
        { id: 'EV-1001-3', at: '15/10/2023 09:18', label: 'AI hoàn thành đánh giá sơ bộ (Top 3)', kind: 'info' },
        { id: 'EV-1001-4', at: '15/10/2023 09:40', label: 'Bác sĩ xác nhận chẩn đoán: Mụn trứng cá độ III', kind: 'success' },
        { id: 'EV-1001-5', at: '15/10/2023 09:45', label: 'Phác đồ điều trị đã được duyệt', kind: 'success' },
        { id: 'EV-1001-6', at: '15/10/2023 09:50', label: 'Quy trình khám Da liễu tiêu chuẩn đã kích hoạt', kind: 'info' },
        { id: 'EV-1001-7', at: '15/10/2023 10:05', label: 'Kết quả xét nghiệm máu: bình thường', kind: 'info' },
      ],
    },
    {
      id: 'ENC-1002', patientId: 'PT-1029', parentEncounterId: 'ENC-1000', type: 'follow_up', origin: 'follow_up_request',
      status: 'closed', department: 'Khoa Da liễu', createdAt: '20/10/2023 09:00', updatedAt: '20/10/2023 09:45',
      currentDoctorId: 'U-0002', aiAssessmentIds: [], doctorReviewIds: [], diagnosisIds: ['DX-1002'],
      medicalRecordId: 'MREC-1002', clinicalOrderIds: [],
      events: [
        { id: 'EV-1002-1', at: '18/10/2023 16:00', label: 'Yêu cầu tạo lượt tái khám từ CRM đã được duyệt', kind: 'info' },
        { id: 'EV-1002-2', at: '20/10/2023 09:45', label: 'Hồ sơ tái khám đã được ký', kind: 'success' },
      ],
    },
  ];

  const symptomIntakes: SymptomIntake[] = [
    {
      id: 'INTAKE-1001', encounterId: 'ENC-1001', chiefComplaint: 'Mụn viêm lan rộng vùng má và trán, xuất hiện từ 10 ngày trước',
      severity: 3, durationDays: 10, symptoms: ['pus', 'pain', 'itching'], history: ['Mụn trứng cá tái phát nhiều lần'],
      currentMedication: [], images: ['intake-photo-1.jpg'], submittedAt: '15/10/2023 09:15',
    },
  ];

  const aiAssessments: AIPreliminaryAssessment[] = [
    {
      id: 'AIA-1001', encounterId: 'ENC-1001', status: 'completed', modelVersion: 'derma-vision-2.4.0',
      inputSnapshotId: 'SNAP-INTAKE-1001', generatedAt: '15/10/2023 09:18',
      redFlag: { triggered: false, urgency: 'routine', reasons: [] }, missingDataHints: [],
      suggestedSpecialty: 'Da liễu', suggestedNextActions: ['Xét nghiệm máu loại trừ nhiễm khuẩn', 'Kê kháng sinh nếu xác nhận viêm nang lông'],
      candidateConditions: [
        { code: 'FOLL', name: 'Viêm nang lông', confidenceBand: 'high', confidenceScore: 78, rationale: 'Tổn thương có mủ, đau rát khu trú quanh nang lông.', supportingEvidence: ['Có mủ', 'Đau rát', 'Xuất hiện 10 ngày'], conflictingEvidence: ['Phân bố lan tỏa hơn là khu trú từng nang lông'] },
        { code: 'ACNE', name: 'Mụn trứng cá', confidenceBand: 'moderate', confidenceScore: 61, rationale: 'Viêm nang lông do tắc nghẽn bã nhờn, phổ biến ở vùng mặt.', supportingEvidence: ['Có mủ', 'Đau rát', 'Tiền sử mụn trứng cá tái phát'], conflictingEvidence: [] },
        { code: 'SEB', name: 'Viêm da tiết bã', confidenceBand: 'low', confidenceScore: 32, rationale: 'Da bong vảy đỏ, thường ở vùng nhiều tuyến bã.', supportingEvidence: ['Ngứa'], conflictingEvidence: ['Không ghi nhận bong vảy'] },
      ],
    },
  ];

  const doctorReviews: DoctorReview[] = [
    {
      id: 'DRV-1001', encounterId: 'ENC-1001', aiAssessmentId: 'AIA-1001', doctorId: 'U-0002', action: 'partial',
      acceptedConditionCode: 'ACNE', reviewedAt: '15/10/2023 09:38',
      rationale: 'Phân bố tổn thương lan tỏa và tiền sử tái phát điển hình cho mụn trứng cá hơn viêm nang lông khu trú do AI xếp hạng cao nhất.',
    },
  ];

  const doctorDiagnoses: DoctorDiagnosis[] = [
    { id: 'DX-1000', encounterId: 'ENC-1000', doctorId: 'U-0002', status: 'signed', conditionName: 'Mụn trứng cá độ III (Acne Vulgaris)', conditionCode: 'ACNE', isAdditionalToAI: false, recordedAt: '15/09/2023 10:40' },
    {
      id: 'DX-1001', encounterId: 'ENC-1001', doctorId: 'U-0002', status: 'confirmed', conditionName: 'Mụn trứng cá độ III (Acne Vulgaris)',
      conditionCode: 'ACNE', aiAssessmentId: 'AIA-1001', isAdditionalToAI: false,
      rationale: 'Phân bố tổn thương lan tỏa và tiền sử tái phát điển hình cho mụn trứng cá.', recordedAt: '15/10/2023 09:40',
    },
    { id: 'DX-1002', encounterId: 'ENC-1002', doctorId: 'U-0002', status: 'signed', conditionName: 'Mụn trứng cá độ I-II (đang cải thiện)', conditionCode: 'ACNE', isAdditionalToAI: false, recordedAt: '20/10/2023 09:30' },
  ];

  const clinicalPlans: ClinicalPlan[] = [
    { id: 'PLAN-1000', encounterId: 'ENC-1000', doctorId: 'U-0002', diagnosisId: 'DX-1000', summary: 'Kháng sinh Doxycycline 7 ngày + vệ sinh da', approvedAt: '15/09/2023 10:45' },
    { id: 'PLAN-1001', encounterId: 'ENC-1001', doctorId: 'U-0002', diagnosisId: 'DX-1001', summary: 'Tretinoin 0.05% + Omega-3 + kem chống nắng SPF50+, xét nghiệm máu loại trừ nhiễm khuẩn, tái khám sau 4 tuần', approvedAt: '15/10/2023 09:45' },
  ];

  const clinicalOrders: ClinicalOrder[] = [
    { id: 'ORD-1001', encounterId: 'ENC-1001', type: 'laboratory', orderedByDoctorId: 'U-0002', justification: 'Loại trừ nhiễm khuẩn toàn thân trước khi cân nhắc kháng sinh', status: 'completed', assignedRole: 'lab_technician', createdAt: '15/10/2023 09:46', resultId: 'RES-1001' },
  ];

  const clinicalResults: ClinicalResult[] = [
    { id: 'RES-1001', orderId: 'ORD-1001', summary: 'Công thức máu bình thường, CRP không tăng', abnormal: false, recordedAt: '15/10/2023 10:05', recordedBy: 'U-0005' },
  ];

  const dermStepDefs: WorkflowTemplateVersion['steps'] = [
    { code: 'VITALS', name: 'Đo sinh hiệu', description: 'Điều dưỡng đo huyết áp, nhiệt độ, mạch trước khi khám.', taskType: 'clinical', responsibleRole: 'nurse', department: 'Khoa Da liễu', mandatory: true, estimatedDurationMinutes: 10, maxWaitingMinutes: 20, skipPermission: ['doctor'], prerequisiteStepCodes: [], requiredOutput: 'Chỉ số sinh hiệu' },
    { code: 'CONSULT', name: 'Bác sĩ thăm khám', description: 'Bác sĩ xem xét AI + khai báo triệu chứng, khám lâm sàng.', taskType: 'clinical', responsibleRole: 'doctor', department: 'Khoa Da liễu', mandatory: true, estimatedDurationMinutes: 20, maxWaitingMinutes: 30, skipPermission: [], prerequisiteStepCodes: ['VITALS'], requiredOutput: 'Chẩn đoán + phác đồ' },
    { code: 'LAB_DRAW', name: 'Lấy mẫu xét nghiệm máu', description: 'Chỉ thực hiện khi bác sĩ chỉ định xét nghiệm.', taskType: 'diagnostic', responsibleRole: 'lab_technician', department: 'Xét nghiệm', mandatory: false, conditionalRule: 'Chỉ khi có clinical order loại laboratory', estimatedDurationMinutes: 10, maxWaitingMinutes: 30, skipPermission: ['doctor'], reworkRule: 'Mẫu không hợp lệ → lấy lại mẫu, tối đa 2 lần trước khi báo cáo vấn đề', escalationRule: 'Quá 30 phút chưa lấy mẫu → báo Điều phối viên chăm sóc', prerequisiteStepCodes: ['CONSULT'], requiredOutput: 'Kết quả xét nghiệm' },
    { code: 'IMAGING', name: 'Chẩn đoán hình ảnh', description: 'Chỉ thực hiện khi nghi ngờ tổn thương sâu cần siêu âm/chụp.', taskType: 'diagnostic', responsibleRole: 'imaging_technician', department: 'Chẩn đoán hình ảnh', mandatory: false, conditionalRule: 'Chỉ khi có clinical order loại imaging', estimatedDurationMinutes: 15, maxWaitingMinutes: 30, skipPermission: ['doctor'], prerequisiteStepCodes: ['CONSULT'], requiredOutput: 'Báo cáo chẩn đoán hình ảnh' },
    { code: 'PHARMACY', name: 'Cấp phát thuốc', description: 'Dược sĩ chuẩn bị và cấp phát đơn thuốc.', taskType: 'operational', responsibleRole: 'pharmacist', department: 'Dược', mandatory: true, estimatedDurationMinutes: 10, maxWaitingMinutes: 20, skipPermission: [], escalationRule: 'Quá 20 phút chưa cấp phát → báo Điều phối viên chăm sóc', prerequisiteStepCodes: ['CONSULT'], requiredOutput: 'Xác nhận cấp phát' },
    { code: 'DISCHARGE_REVIEW', name: 'Xem lại & ký hồ sơ xuất viện', description: 'Bác sĩ xem lại toàn bộ hồ sơ và ký xác nhận trước khi đóng lượt khám.', taskType: 'clinical', responsibleRole: 'doctor', department: 'Khoa Da liễu', mandatory: true, estimatedDurationMinutes: 10, maxWaitingMinutes: 15, skipPermission: [], escalationRule: 'Quá 15 phút chưa ký → báo Quản trị viên y tế', notificationRule: 'Thông báo bác sĩ ngay khi các bước phụ thuộc hoàn tất', prerequisiteStepCodes: ['LAB_DRAW', 'PHARMACY'], requiredOutput: 'Hồ sơ đã ký' },
  ];

  const workflowTemplateVersions: WorkflowTemplateVersion[] = [
    { id: 'WFV-DERM-1', templateId: 'WFT-DERM', version: 1, status: 'published', steps: dermStepDefs, createdAt: '01/08/2023', publishedAt: '05/08/2023' },
  ];

  const workflowTemplates: WorkflowTemplate[] = [
    { id: 'WFT-DERM', name: 'Quy trình khám Da liễu tiêu chuẩn', specialty: 'Da liễu', description: 'Quy trình vận hành chuẩn cho một lượt khám da liễu ngoại trú.', createdBy: 'U-0012', versionIds: ['WFV-DERM-1'], latestPublishedVersionId: 'WFV-DERM-1' },
  ];

  const workflowInstances: WorkflowInstance[] = [
    { id: 'WFI-1001', encounterId: 'ENC-1001', templateId: 'WFT-DERM', templateVersionId: 'WFV-DERM-1', status: 'active', activatedBy: 'U-0002', activatedAt: '15/10/2023 09:50', taskIds: ['TASK-1001', 'TASK-1002', 'TASK-1003', 'TASK-1004', 'TASK-1005', 'TASK-1006'] },
  ];

  const workflowTasks: WorkflowTask[] = [
    { id: 'TASK-1001', instanceId: 'WFI-1001', encounterId: 'ENC-1001', stepCode: 'VITALS', name: 'Đo sinh hiệu', responsibleRole: 'nurse', department: 'Khoa Da liễu', status: 'completed', assigneeId: 'U-0003', dependsOnStepCodes: [], slaMinutes: 20, priority: 'medium', urgency: 'routine', createdAt: '15/10/2023 09:00', startedAt: '15/10/2023 09:05', completedAt: '15/10/2023 09:14', reworkCount: 0, patientArrivalStatus: 'in_room' },
    { id: 'TASK-1002', instanceId: 'WFI-1001', encounterId: 'ENC-1001', stepCode: 'CONSULT', name: 'Bác sĩ thăm khám', responsibleRole: 'doctor', department: 'Khoa Da liễu', status: 'completed', assigneeId: 'U-0002', dependsOnStepCodes: ['VITALS'], slaMinutes: 30, priority: 'medium', urgency: 'routine', createdAt: '15/10/2023 09:14', startedAt: '15/10/2023 09:16', completedAt: '15/10/2023 09:45', reworkCount: 0, patientArrivalStatus: 'in_room' },
    { id: 'TASK-1003', instanceId: 'WFI-1001', encounterId: 'ENC-1001', stepCode: 'LAB_DRAW', name: 'Lấy mẫu xét nghiệm máu', responsibleRole: 'lab_technician', department: 'Xét nghiệm', status: 'completed', assigneeId: 'U-0005', dependsOnStepCodes: ['CONSULT'], slaMinutes: 30, priority: 'medium', urgency: 'routine', createdAt: '15/10/2023 09:45', startedAt: '15/10/2023 09:50', completedAt: '15/10/2023 10:05', reworkCount: 0, patientArrivalStatus: 'arrived' },
    { id: 'TASK-1004', instanceId: 'WFI-1001', encounterId: 'ENC-1001', stepCode: 'IMAGING', name: 'Chẩn đoán hình ảnh', responsibleRole: 'imaging_technician', department: 'Chẩn đoán hình ảnh', status: 'skipped', dependsOnStepCodes: ['CONSULT'], slaMinutes: 30, priority: 'low', urgency: 'routine', createdAt: '15/10/2023 09:45', reworkCount: 0 },
    { id: 'TASK-1005', instanceId: 'WFI-1001', encounterId: 'ENC-1001', stepCode: 'PHARMACY', name: 'Cấp phát thuốc', responsibleRole: 'pharmacist', department: 'Dược', status: 'in_progress', assigneeId: 'U-0007', dependsOnStepCodes: ['CONSULT'], slaMinutes: 20, priority: 'medium', urgency: 'routine', createdAt: '15/10/2023 09:45', startedAt: '15/10/2023 10:00', reworkCount: 0, patientArrivalStatus: 'not_arrived' },
    { id: 'TASK-1006', instanceId: 'WFI-1001', encounterId: 'ENC-1001', stepCode: 'DISCHARGE_REVIEW', name: 'Xem lại & ký hồ sơ xuất viện', responsibleRole: 'doctor', department: 'Khoa Da liễu', status: 'blocked', dependsOnStepCodes: ['LAB_DRAW', 'PHARMACY'], slaMinutes: 15, priority: 'high', urgency: 'routine', createdAt: '15/10/2023 09:45', reworkCount: 0, clinicalWarning: 'Chờ hoàn tất cấp phát thuốc trước khi ký hồ sơ' },
  ];

  const clinicalDocuments: ClinicalDocument[] = [
    { id: 'DOC-1001', encounterId: 'ENC-1001', clinicalOrderId: 'ORD-1001', type: 'lab_report', fileName: 'xet-nghiem-mau-2023-10-15.pdf', fileHash: 'sha256:mock-8f21a', version: 1, uploadedBy: 'U-0005', uploadedAt: '15/10/2023 10:05', reviewStatus: 'reviewed', signatureStatus: 'unsigned' },
  ];

  const prescriptions: Prescription[] = [
    { id: 'RX-1000', encounterId: 'ENC-1000', doctorId: 'U-0002', issuedAt: '15/09/2023 10:45', medications: [
      { id: 'MED-1', name: 'Doxycycline 100mg', dose: 'Uống sáng, 1 viên/ngày', durationDays: 7 },
      { id: 'MED-2', name: 'Nước muối sinh lý 0.9%', dose: 'Rửa mặt 2 lần/ngày', durationDays: 7 },
    ] },
    { id: 'RX-1001', encounterId: 'ENC-1001', doctorId: 'U-0002', issuedAt: '15/10/2023 09:46', medications: [
      { id: 'MED-3', name: 'Tretinoin 0.05% Cream', dose: 'Bôi tối, 1 lần/ngày', durationDays: 90 },
      { id: 'MED-4', name: 'Omega-3 1000mg', dose: 'Sau bữa ăn, 1 viên/ngày', durationDays: 30 },
      { id: 'MED-5', name: 'Kem chống nắng SPF50+', dose: 'Sáng trước khi ra ngoài', durationDays: 30 },
    ] },
  ];

  const medicalRecords: MedicalRecord[] = [
    {
      id: 'MREC-1000', encounterId: 'ENC-1000', status: 'signed', diagnosisId: 'DX-1000', prescriptionId: 'RX-1000', documentIds: [],
      signedBy: 'U-0002', signedAt: '15/09/2023 11:10', addenda: [],
      discharge: { encounterId: 'ENC-1000', instructions: ['Tránh ánh nắng trực tiếp', 'Vệ sinh da nhẹ nhàng, tránh chà xát'], followUpNeeded: true },
      followUp: { encounterId: 'ENC-1000', description: 'Tái khám đánh giá đáp ứng kháng sinh', dueInDays: 14 },
    },
    {
      id: 'MREC-1001', encounterId: 'ENC-1001', status: 'in_review', diagnosisId: 'DX-1001', prescriptionId: 'RX-1001', documentIds: ['DOC-1001'], addenda: [],
    },
    {
      id: 'MREC-1002', encounterId: 'ENC-1002', status: 'signed', diagnosisId: 'DX-1002', documentIds: [],
      signedBy: 'U-0002', signedAt: '20/10/2023 09:45', addenda: [],
      discharge: { encounterId: 'ENC-1002', instructions: ['Tiếp tục Tretinoin thêm 6 tuần'], followUpNeeded: false },
    },
  ];

  const carePlans: CRMCarePlan[] = [
    { id: 'CP-1000', patientId: 'PT-1029', encounterId: 'ENC-1000', status: 'active', createdAt: '15/09/2023 12:00' },
  ];

  const followUpActivities: FollowUpActivity[] = [
    { id: 'FUA-1', carePlanId: 'CP-1000', type: 'follow_up_appointment', title: 'Tái khám định kỳ', description: 'Khám da liễu với Bs. Trần Văn Nam.', dueDate: '22/10/2023', priority: 'high', status: 'due' },
    { id: 'FUA-2', carePlanId: 'CP-1000', type: 'lifestyle_guidance', title: 'Uống đủ 2 lít nước mỗi ngày', description: 'Hydrat hóa từ bên trong giúp da phục hồi nhanh hơn.', dueDate: 'Hàng ngày', priority: 'medium', status: 'due' },
    { id: 'FUA-3', carePlanId: 'CP-1000', type: 'follow_up_test', title: 'Kết quả xét nghiệm máu', description: 'Xét nghiệm ngày 28/09/2023 – Kết quả bình thường.', dueDate: '28/09/2023', priority: 'low', status: 'completed' },
    { id: 'FUA-4', carePlanId: 'CP-1000', type: 'patient_education', title: 'Tư vấn chế độ ăn trị mụn', description: 'Hạn chế đường, sữa, thực phẩm chế biến sẵn.', dueDate: '10/10/2023', priority: 'medium', status: 'completed' },
    { id: 'FUA-5', carePlanId: 'CP-1000', type: 'medication_reminder', title: 'Nhắc bôi Tretinoin buổi tối', description: 'Bôi 1 lần/ngày trước khi ngủ.', dueDate: 'Hàng ngày', priority: 'medium', status: 'scheduled' },
  ];

  const clinicalAlerts: ClinicalAlert[] = [
    { id: 'ALRT-1000', carePlanId: 'CP-1000', patientId: 'PT-1029', encounterId: 'ENC-1000', trigger: 'abnormal_home_monitoring', severity: 'medium', responsibleActor: 'Điều phối viên chăm sóc', responseDeadlineHours: 6, requiresLinkedEncounter: true, status: 'encounter_requested', note: 'AI phát hiện tín hiệu sớm nguy cơ tái phát vùng trán qua ảnh theo dõi.', detectedAt: '17/10/2023 08:00' },
    { id: 'ALRT-1001', carePlanId: 'CP-1000', patientId: 'PT-1029', trigger: 'medication_side_effect', severity: 'low', responsibleActor: 'Dược sĩ → Bác sĩ', responseDeadlineHours: 12, requiresLinkedEncounter: false, status: 'open', note: 'Bệnh nhân báo cáo khô da nhẹ sau khi dùng Tretinoin.', detectedAt: '19/10/2023 20:00' },
  ];

  const encounterCreationRequests: EncounterCreationRequest[] = [
    { id: 'ECR-1000', patientId: 'PT-1029', sourceAlertId: 'ALRT-1000', requestedByRole: 'care_coordinator', reason: 'Theo dõi tại nhà cho thấy dấu hiệu tái phát, cần bác sĩ đánh giá lại', status: 'approved', requestedAt: '17/10/2023 08:10', decidedBy: 'U-0010', decidedAt: '18/10/2023 16:00', createdEncounterId: 'ENC-1002' },
    { id: 'ECR-1001', patientId: 'PT-1029', requestedByRole: 'customer_care_employee', reason: 'Bệnh nhân báo cáo ngứa nhiều hơn qua khảo sát triệu chứng tuần này', status: 'requested', requestedAt: '21/10/2023 09:00' },
  ];

  const notifications: Notification[] = [
    { id: 'NOTIF-1', event: 'ai_assessment_ready', recipientId: 'U-0002', recipientRole: 'doctor', channel: 'in_app', status: 'delivered', message: 'Đánh giá sơ bộ AI đã sẵn sàng để xem xét cho BN PT-1029.', relatedPatientId: 'PT-1029', relatedEncounterId: 'ENC-1001', createdAt: '15/10/2023 09:18', deliveredAt: '15/10/2023 09:18', retryCount: 0, read: false },
    { id: 'NOTIF-2', event: 'task_assigned', recipientId: 'U-0007', recipientRole: 'pharmacist', channel: 'in_app', status: 'delivered', message: 'Bạn được phân công cấp phát thuốc cho BN PT-1029.', relatedPatientId: 'PT-1029', relatedEncounterId: 'ENC-1001', relatedWorkflowTaskId: 'TASK-1005', createdAt: '15/10/2023 09:45', deliveredAt: '15/10/2023 09:45', retryCount: 0, read: true },
    { id: 'NOTIF-3', event: 'appointment_reminder', recipientId: 'U-0001', recipientRole: 'patient', channel: 'sms', status: 'failed', message: 'Nhắc lịch khám 22/10/2023 lúc 14:00.', relatedPatientId: 'PT-1029', createdAt: '21/10/2023 08:00', failureReason: 'Không phản hồi từ nhà mạng (timeout)', retryCount: 2, read: false },
    { id: 'NOTIF-4', event: 'escalation_alert', recipientId: 'U-0008', recipientRole: 'care_coordinator', channel: 'in_app', status: 'delivered', message: 'Cảnh báo bất thường mới cần xử lý trong 6 giờ.', relatedPatientId: 'PT-1029', createdAt: '17/10/2023 08:00', deliveredAt: '17/10/2023 08:00', retryCount: 0, read: false },
    { id: 'NOTIF-5', event: 'discharge_task_blocked', recipientId: 'U-0002', recipientRole: 'doctor', channel: 'push', status: 'retrying', message: 'Tác vụ ký hồ sơ đang bị chặn do chờ cấp phát thuốc.', relatedPatientId: 'PT-1029', relatedEncounterId: 'ENC-1001', relatedWorkflowTaskId: 'TASK-1006', createdAt: '15/10/2023 10:00', retryCount: 1, read: false },
    { id: 'NOTIF-6', event: 'record_signed', recipientId: 'U-0001', recipientRole: 'patient', channel: 'email', status: 'queued', message: 'Hồ sơ khám ngày 15/09/2023 đã được bác sĩ ký xác nhận.', relatedPatientId: 'PT-1029', relatedEncounterId: 'ENC-1000', createdAt: '15/09/2023 11:11', retryCount: 0, read: false },
  ];

  const consents: Consent[] = [
    { id: 'CONSENT-1', patientId: 'PT-1029', type: 'data_processing', granted: true, grantedAt: '15/09/2023 09:50' },
    { id: 'CONSENT-2', patientId: 'PT-1029', type: 'research_data_sharing', granted: true, grantedAt: '15/09/2023 09:50' },
    { id: 'CONSENT-3', patientId: 'PT-1029', type: 'telemedicine', granted: false, grantedAt: '15/09/2023 09:50', withdrawnAt: '01/10/2023 18:20' },
  ];

  const auditEvents: AuditEvent[] = [
    { id: 'AUD-0001', at: '15/09/2023 09:50', actorId: 'U-0004', actorName: 'Phạm Thị Hoa', role: 'receptionist', action: 'IDENTITY_CREATED', entityType: 'Patient', entityId: 'PT-1029', patientId: 'PT-1029', sourceModule: 'PatientIntake', severity: 'info' },
    { id: 'AUD-0002', at: '15/10/2023 09:38', actorId: 'U-0002', actorName: 'Bs. Nguyễn Thị An', role: 'doctor', action: 'AI_ASSESSMENT_REVIEWED', entityType: 'AIPreliminaryAssessment', entityId: 'AIA-1001', previousState: 'pending', newState: 'partial', reason: 'Phân bố tổn thương điển hình mụn trứng cá hơn viêm nang lông', patientId: 'PT-1029', encounterId: 'ENC-1001', sourceModule: 'DoctorDecision', severity: 'info' },
    { id: 'AUD-0003', at: '15/10/2023 09:40', actorId: 'U-0002', actorName: 'Bs. Nguyễn Thị An', role: 'doctor', action: 'DIAGNOSIS_CONFIRMED', entityType: 'DoctorDiagnosis', entityId: 'DX-1001', newState: 'confirmed', patientId: 'PT-1029', encounterId: 'ENC-1001', sourceModule: 'DoctorDecision', severity: 'info' },
    { id: 'AUD-0004', at: '15/10/2023 09:45', actorId: 'U-0002', actorName: 'Bs. Nguyễn Thị An', role: 'doctor', action: 'CLINICAL_PLAN_APPROVED', entityType: 'ClinicalPlan', entityId: 'PLAN-1001', patientId: 'PT-1029', encounterId: 'ENC-1001', sourceModule: 'DoctorDecision', severity: 'info' },
    { id: 'AUD-0005', at: '15/10/2023 09:50', actorId: 'U-0002', actorName: 'Bs. Nguyễn Thị An', role: 'doctor', action: 'WORKFLOW_INSTANCE_ACTIVATED', entityType: 'WorkflowInstance', entityId: 'WFI-1001', patientId: 'PT-1029', encounterId: 'ENC-1001', sourceModule: 'BPM', severity: 'info' },
    { id: 'AUD-0006', at: '15/10/2023 10:00', actorId: 'U-0007', actorName: 'DS. Vũ Văn Long', role: 'pharmacist', action: 'TASK_STARTED', entityType: 'WorkflowTask', entityId: 'TASK-1005', patientId: 'PT-1029', encounterId: 'ENC-1001', sourceModule: 'BPM', severity: 'info' },
    { id: 'AUD-0007', at: '17/10/2023 08:00', actorId: 'U-0008', actorName: 'Ngô Thị Lan', role: 'care_coordinator', action: 'ESCALATION_TRIGGERED', entityType: 'ClinicalAlert', entityId: 'ALRT-1000', patientId: 'PT-1029', sourceModule: 'CRM', severity: 'warning' },
    { id: 'AUD-0008', at: '18/10/2023 16:00', actorId: 'U-0010', actorName: 'Hoàng Thị Nga', role: 'medical_administrator', action: 'ENCOUNTER_CREATION_REQUEST_APPROVED', entityType: 'EncounterCreationRequest', entityId: 'ECR-1000', newState: 'approved', patientId: 'PT-1029', sourceModule: 'CRM', severity: 'info' },
    { id: 'AUD-0009', at: '15/09/2023 11:10', actorId: 'U-0002', actorName: 'Bs. Nguyễn Thị An', role: 'doctor', action: 'MEDICAL_RECORD_SIGNED', entityType: 'MedicalRecord', entityId: 'MREC-1000', newState: 'signed', patientId: 'PT-1029', encounterId: 'ENC-1000', sourceModule: 'EMR', severity: 'info' },
    { id: 'AUD-0010', at: '20/10/2023 07:30', actorId: 'U-0011', actorName: 'Trịnh Văn Đức', role: 'system_administrator', action: 'INTEGRATION_RETRY_EXHAUSTED', entityType: 'IntegrationMessage', entityId: 'INTM-2001', reason: 'LIS không phản hồi sau 3 lần thử lại', sourceModule: 'Integration', severity: 'critical' },
  ];

  const integrationConnections: IntegrationConnection[] = [
    { id: 'INTC-APPT', name: 'Appointment Service', status: 'healthy', lastSuccessAt: '21/10/2023 09:00', pendingMessages: 0, retryCount: 0, deadLetterCount: 0 },
    { id: 'INTC-IDP', name: 'Identity Provider', status: 'healthy', lastSuccessAt: '21/10/2023 09:00', pendingMessages: 0, retryCount: 0, deadLetterCount: 0 },
    { id: 'INTC-AI', name: 'AI Inference Service', status: 'degraded', lastSuccessAt: '21/10/2023 08:40', lastFailureAt: '21/10/2023 08:55', pendingMessages: 1, retryCount: 1, deadLetterCount: 0 },
    { id: 'INTC-BPM', name: 'BPM Engine', status: 'healthy', lastSuccessAt: '21/10/2023 09:00', pendingMessages: 0, retryCount: 0, deadLetterCount: 0 },
    { id: 'INTC-EMR', name: 'EMR Service', status: 'healthy', lastSuccessAt: '21/10/2023 09:00', pendingMessages: 0, retryCount: 0, deadLetterCount: 0 },
    { id: 'INTC-CRM', name: 'CRM Service', status: 'healthy', lastSuccessAt: '21/10/2023 09:00', pendingMessages: 0, retryCount: 0, deadLetterCount: 0 },
    { id: 'INTC-LIS', name: 'Laboratory Information System', status: 'degraded', lastSuccessAt: '20/10/2023 07:00', lastFailureAt: '20/10/2023 07:30', pendingMessages: 2, retryCount: 3, deadLetterCount: 1 },
    { id: 'INTC-RIS', name: 'Radiology Information System', status: 'healthy', lastSuccessAt: '20/10/2023 07:00', pendingMessages: 0, retryCount: 0, deadLetterCount: 0 },
    { id: 'INTC-PACS', name: 'PACS', status: 'healthy', lastSuccessAt: '20/10/2023 07:00', pendingMessages: 0, retryCount: 0, deadLetterCount: 0 },
    { id: 'INTC-PHARM', name: 'Pharmacy Dispensing System', status: 'down', lastSuccessAt: '19/10/2023 15:00', lastFailureAt: '21/10/2023 08:00', pendingMessages: 3, retryCount: 5, deadLetterCount: 2 },
    { id: 'INTC-NOTIF', name: 'Notification Gateway', status: 'degraded', lastSuccessAt: '21/10/2023 08:50', lastFailureAt: '21/10/2023 08:00', pendingMessages: 1, retryCount: 2, deadLetterCount: 0 },
  ];

  const integrationMessages: IntegrationMessage[] = [
    { id: 'INTM-2001', connectionId: 'INTC-LIS', correlationId: 'ENC-1001', idempotencyKey: 'lis-ord-1001', status: 'failed', createdAt: '20/10/2023 07:00' },
    { id: 'INTM-2002', connectionId: 'INTC-PHARM', correlationId: 'ENC-1001', idempotencyKey: 'rx-1001-dispense', status: 'pending', createdAt: '21/10/2023 08:00' },
    { id: 'INTM-2003', connectionId: 'INTC-NOTIF', correlationId: 'NOTIF-3', idempotencyKey: 'sms-notif-3-retry2', status: 'duplicate_rejected', createdAt: '21/10/2023 08:05' },
    { id: 'INTM-2004', connectionId: 'INTC-AI', correlationId: 'ENC-1001', idempotencyKey: 'ai-req-enc-1001-2', status: 'pending', createdAt: '21/10/2023 08:55' },
  ];

  return {
    users, patients, appointments, encounters, symptomIntakes, aiAssessments, doctorReviews,
    doctorDiagnoses, clinicalPlans, clinicalOrders, clinicalResults, workflowTemplates,
    workflowTemplateVersions, workflowInstances, workflowTasks, clinicalDocuments, medicalRecords,
    prescriptions, carePlans, followUpActivities, clinicalAlerts, encounterCreationRequests,
    notifications, consents, auditEvents, integrationConnections, integrationMessages,
  };
}
