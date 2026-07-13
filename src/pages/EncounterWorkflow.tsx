import { Button, Result } from 'antd';
import { Navigate, useParams } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { encounterRepository } from '../domain/repositories';
export default function EncounterWorkflow() { const {encounterId}=useParams(); const encounter=useStore(encounterRepository).find(e=>e.id===encounterId); if(!encounter)return <Result status="404" title="Không tìm thấy lượt khám"/>; if(encounter.workflowInstanceId)return <Navigate to={`/app/workflows/instances/${encounter.workflowInstanceId}`} replace/>; return <Result status="info" title="Chưa có quy trình được kích hoạt" subTitle="Bác sĩ cần phê duyệt kế hoạch lâm sàng và chọn mẫu quy trình trước khi kích hoạt." extra={<Button href="/app/doctor-review">Đến trang bác sĩ xem xét</Button>}/>; }
