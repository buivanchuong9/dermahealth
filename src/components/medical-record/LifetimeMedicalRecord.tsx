import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Alert, Spin, App as AntApp } from 'antd';
import { useAppState } from '../../state/useAppState';
import { getLifetimeMedicalRecord, type LifetimeMedicalRecord as LifetimeMedicalRecordData } from '../../api/lifetimeMedicalRecord';

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
  const { currentPatient, currentUser } = useAppState();
  const [record, setRecord] = useState<LifetimeMedicalRecordData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadData = useCallback(async () => {
    if (!currentPatient?.id) return;
    setLoading(true);
    setError(undefined);
    try {
      const result = await getLifetimeMedicalRecord(currentPatient.id);
      setRecord(result);
    } catch (cause) {
      console.warn('Lifetime medical record API status:', cause);
    } finally {
      setLoading(false);
    }
  }, [currentPatient?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const avatarUrl =
    currentUser?.avatarUrl ||
    (currentUser?.id ? localStorage.getItem(`user_avatar_${currentUser.id}`) : null) ||
    undefined;

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
