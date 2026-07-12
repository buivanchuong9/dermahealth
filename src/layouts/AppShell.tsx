import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopHeader />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
