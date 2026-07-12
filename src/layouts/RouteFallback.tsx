import { Skeleton, Spin } from 'antd';

/** Suspense fallback for the authenticated app shell — keeps Sidebar/TopHeader
 * mounted and only skeletons the content area while a lazy-loaded route chunk
 * downloads, so route-level code splitting doesn't flash the whole screen. */
export function ContentLoadingFallback() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton active paragraph={{ rows: 2 }} title={{ width: 240 }} style={{ marginBottom: 20 }} />
      <Skeleton.Node active style={{ width: '100%', height: 120, marginBottom: 16 }} />
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  );
}

/** Suspense fallback for routes rendered outside the app shell (e.g. Login). */
export function FullPageLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--surface-page)' }}>
      <Spin size="large" />
    </div>
  );
}
