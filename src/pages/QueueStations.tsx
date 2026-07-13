import { Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { queueRepository } from '../domain/repositories';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
const { Title, Text } = Typography;
export default function QueueStations() { const tickets=useStore(queueRepository); const stations=Array.from(new Set(tickets.map(t=>t.serviceStation))); return <div><Text type="secondary">CẤU HÌNH VẬN HÀNH</Text><Title level={3}>Các trạm phục vụ</Title><Row gutter={[16,16]}>{stations.map((station,i)=>{const rows=tickets.filter(t=>t.serviceStation===station);return <Col xs={24} md={12} lg={8} key={station}><Link to={`/queue-display/station/${encodeURIComponent(station)}`} target="_blank"><Card hoverable title={station} extra={<Tag color="green">Đang hoạt động</Tag>}><Statistic title="Đang chờ" value={rows.filter(t=>t.status==='waiting').length}/><Text>{Array.from(new Set(rows.map(t=>t.room).filter(Boolean))).join(', ') || 'Chưa gán phòng'} · Trạm {i+1}</Text></Card></Link></Col>})}</Row>{!stations.length&&<ProfessionalEmpty title="Chưa có trạm phục vụ" description="Trạm sẽ xuất hiện sau khi bệnh nhân được phân vào hàng đợi." primaryLabel="Mở hàng đợi" primaryHref="/app/queue"/>}</div>; }
