import { Tabs } from 'antd';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';
import { LatestLabResultsCard } from './LatestLabResultsCard';
import { LesionGalleryCard } from './LesionGalleryCard';
import { RecentPrescriptionsCard } from './RecentPrescriptionsCard';
import { TreatmentRegimenCard } from './TreatmentRegimenCard';
import { TreatmentTimelineCard } from './TreatmentTimelineCard';

interface ClinicalDetailsTabsCardProps {
  record?: LifetimeMedicalRecord;
}

export function ClinicalDetailsTabsCard({ record }: ClinicalDetailsTabsCardProps) {
  return (
    <Tabs
      defaultActiveKey="timeline"
      items={[
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
          key: 'documents',
          label: 'Tài liệu',
          children: <LesionGalleryCard record={record} />,
        },
      ]}
    />
  );
}
