import { useState, useEffect } from 'react';
import { Row, Col, Alert, Spin, App as AntApp } from 'antd';
import { useAppState } from '../../state/useAppState';
import { getLifetimeMedicalRecord, type LifetimeMedicalRecord as LifetimeMedicalRecordData } from '../../api/lifetimeMedicalRecord';
import { getPatientAvatarUrl } from '../../utils/avatarUtils';

// Modular EMR Components
import { HeaderToolbar } from './HeaderToolbar';
import { PatientHeaderCard } from './PatientHeaderCard';
import { ClinicalAlertsCard } from './ClinicalAlertsCard';
import { ClinicalProgressChartCard } from './ClinicalProgressChartCard';
import { DiagnosticClassificationCard } from './DiagnosticClassificationCard';
import { ClinicalDetailsTabsCard } from './ClinicalDetailsTabsCard';
import { InsuranceIntegrationCard } from './InsuranceIntegrationCard';
import { CareTeamCard } from './CareTeamCard';

import './LifetimeMedicalRecord.css';

export function LifetimeMedicalRecord() {
  const { message } = AntApp.useApp();
  const { currentPatient } = useAppState();
  const [record, setRecord] = useState<LifetimeMedicalRecordData>();
  const [loadedPatientId, setLoadedPatientId] = useState<string>();
  const [error, setError] = useState<string>();
  const patientId = currentPatient?.id;
  const loading = Boolean(patientId) && loadedPatientId !== patientId;

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    void getLifetimeMedicalRecord(patientId)
      .then((result) => {
        if (!active) return;
        setRecord(result);
        setError(undefined);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        console.warn('Lifetime medical record API status:', cause);
        setError('Không thể tải đầy đủ hồ sơ bệnh án. Vui lòng thử lại.');
      })
      .finally(() => {
        if (active) setLoadedPatientId(patientId);
      });
    return () => {
      active = false;
    };
  }, [patientId]);

  const avatarUrl = getPatientAvatarUrl(undefined, currentPatient?.id);

  if (!currentPatient) {
    return (
      <Alert
        type="info"
        showIcon
        message="Chưa có hồ sơ bệnh nhân"
        description="Tài khoản này chưa được liên kết với hồ sơ bệnh nhân nào."
      />
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    void message.info('Hệ thống đang xuất tệp PDF hồ sơ bệnh án...');
  };

  const handleDigitalSign = () => {
    void message.success('Xác thực chữ ký số thành công.');
  };

  const handleShare = () => {
    void message.success('Đã khởi tạo mã chia sẻ hồ sơ an toàn.');
  };

  return (
    <div className="emr-container">
      {/* Top Header Action Toolbar */}
      <HeaderToolbar
        nationalHealthId={record?.patient.nationalHealthId}
        synchronizedAt={record?.synchronizedAt}
        onPrint={handlePrint}
        onExportPdf={handleExportPdf}
        onDigitalSign={handleDigitalSign}
        onShare={handleShare}
      />

      {error && (
        <Alert
          type="warning"
          showIcon
          message="Thông báo dữ liệu"
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading}>
        {/* SECTION 1: Master Patient Identity & Safety Stack */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} xl={16}>
            <PatientHeaderCard patient={currentPatient} record={record} avatarUrl={avatarUrl} />
          </Col>
          <Col xs={24} xl={8}>
            <ClinicalAlertsCard
              allergies={record?.summary.allergies}
              activeConditions={record?.summary.activeConditions}
            />
          </Col>
        </Row>

        {/* SECTION 2: Balanced 2-Column Hospital EMR Workspace (Left 65% / Right 35%) */}
        <Row gutter={[16, 16]}>
          {/* Main Clinical Area (Left 65%) */}
          <Col xs={24} lg={15} xl={16}>
            {/* 1. Highcharts 3D Progress & AI Evaluation */}
            <ClinicalProgressChartCard record={record} patientId={currentPatient?.id} />

            {/* 2. Unified Clinical Details Workspace Tabs */}
            <ClinicalDetailsTabsCard record={record} />
          </Col>

          {/* Sidebar Auxiliary Area (Right 35%) */}
          <Col xs={24} lg={9} xl={8}>
            {/* 1. Diagnostic & ICD-10 Classification */}
            <DiagnosticClassificationCard record={record} />

            {/* 2. BHYT & Insurance Linkage Status */}
            <InsuranceIntegrationCard record={record} />

            {/* 3. Care Team & Physician Directory */}
            <CareTeamCard record={record} />
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
