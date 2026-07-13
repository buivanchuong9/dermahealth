import { Navigate, useLocation } from 'react-router-dom';
import type { QueueTicket } from '../domain/core/entities';
import { QueueResult } from './KioskCheckIn';
export default function KioskResult() { const ticket = (useLocation().state as { ticket?: QueueTicket } | null)?.ticket; return ticket ? <div style={{ maxWidth: 720, margin: '30px auto', padding: 16 }}><QueueResult ticket={ticket}/></div> : <Navigate to="/kiosk/check-in" replace/>; }
