import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout, Drawer, Grid } from 'antd';
import Sidebar, { SidebarContent } from './Sidebar';
import TopHeader from './TopHeader';
import { ContentLoadingFallback } from './RouteFallback';

export default function AppShell() {
  // `screens.lg` is `undefined` until the first `matchMedia` measurement
  // resolves; comparing with `=== false` (rather than `!screens.lg`) means
  // we default to the desktop layout during that first tick instead of
  // flashing the mobile drawer-hidden sidebar on a desktop viewport.
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <Layout className="app-shell">
      {isMobile ? (
        <Drawer
          placement="left"
          width={260}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          closable={false}
          styles={{ body: { padding: 0 }, content: { background: '#0f2f4d' } }}
        >
          <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
        </Drawer>
      ) : (
        <Sidebar />
      )}
      <Layout className="app-shell__main">
        <TopHeader onOpenMobileNav={isMobile ? () => setMobileNavOpen(true) : undefined} />
        <Layout.Content className="app-content">
          <Suspense fallback={<ContentLoadingFallback />}>
            <Outlet />
          </Suspense>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
