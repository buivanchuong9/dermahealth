import { lazy, Suspense } from 'react';
import { Skeleton, Tabs } from 'antd';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';
import { LatestLabResultsCard } from './LatestLabResultsCard';
import { LesionGalleryCard } from './LesionGalleryCard';
import { PatientIntroductionCard } from './PatientIntroductionCard';
import { RecentPrescriptionsCard } from './RecentPrescriptionsCard';
import { TreatmentRegimenCard } from './TreatmentRegimenCard';
import { TreatmentTimelineCard } from './TreatmentTimelineCard';

const DermaTimeline = lazy(() =>
  import('./DermaTimeline').then((module) => ({
    default: module.DermaTimeline,
  })),
);

interface ClinicalDetailsTabsCardProps {
  record?: LifetimeMedicalRecord;
  patientId: string;
  user: { id: string; name: string; role: string };
  onRecordUpdated?: () => void;
}

export function ClinicalDetailsTabsCard({ record, patientId, user, onRecordUpdated }: ClinicalDetailsTabsCardProps) {
  return (
    <Tabs
      defaultActiveKey="intro"
      items={[
        {
          key: 'intro',
          label: 'Giới thiệu về tôi',
          children: (
            <PatientIntroductionCard
              record={record}
              patientId={patientId}
              onRecordUpdated={onRecordUpdated}
            />
          ),
        },
        {
          key: 'timeline',
          label: 'Dòng thời gian',
          children: <TreatmentTimelineCard record={record} />,
        },
        {
          key: 'treatment',
          label: 'Điều trị & thuốc',
          children: (
            <>
              <TreatmentRegimenCard record={record} />
              <RecentPrescriptionsCard record={record} />
            </>
          ),
        },
        {
          key: 'results',
          label: 'Cận lâm sàng',
          children: <LatestLabResultsCard record={record} />,
        },
        {
          key: 'derma-timeline',
          label: 'Tiến triển tổn thương',
          children: (
            <Suspense fallback={<Skeleton active paragraph={{ rows: 8 }} />}>
              <DermaTimeline patientId={patientId} user={user} />
            </Suspense>
          ),
        },
        {
          key: 'documents',
          label: 'Tài liệu',
          children: <LesionGalleryCard record={record} />,
        },
      ]}
    />
  );
}
