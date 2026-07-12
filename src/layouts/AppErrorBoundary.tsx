import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Result, Button } from 'antd';
import { RotateCcw, Home } from 'lucide-react';
import { auditService } from '../domain/services/auditService';
import { userRepository } from '../domain/repositories';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Top-level render error boundary. Catches unexpected rendering errors that
 * escape a page's own try/catch (see the `guarded()` helper pattern used
 * throughout the pages for expected domain-validation rejections, which are
 * handled locally via antd Alert/message — this boundary is only a last
 * resort for genuine bugs, not for InvalidTransitionError/PermissionError). */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('AppErrorBoundary caught a render error:', error, info.componentStack);
    }
    try {
      const actor = userRepository.getAll()[0];
      if (actor) {
        auditService.log({
          actorId: actor.id,
          action: 'UNHANDLED_RENDER_ERROR',
          entityType: 'Application',
          entityId: 'root',
          reason: error.message,
          sourceModule: 'ErrorBoundary',
          severity: 'critical',
        });
      }
    } catch {
      // Auditing the crash must never itself crash the error screen.
    }
  }

  private reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--surface-page)' }}>
        <Result
          status="error"
          title="Đã xảy ra lỗi ngoài dự kiến"
          subTitle="Ứng dụng gặp sự cố khi hiển thị trang này. Bạn có thể thử lại hoặc quay về trang tổng quan. Sự cố đã được ghi nhận."
          extra={[
            <Button key="retry" type="primary" icon={<RotateCcw size={15} />} onClick={this.reset}>Thử lại</Button>,
            <Button key="home" icon={<Home size={15} />} onClick={() => { this.reset(); window.location.href = '/app/dashboard'; }}>Về trang tổng quan</Button>,
          ]}
        >
          {import.meta.env.DEV && this.state.error && (
            <pre style={{ textAlign: 'left', background: 'var(--surface-subtle)', padding: 12, borderRadius: 8, fontSize: 12, maxWidth: 640, overflow: 'auto' }}>
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          )}
        </Result>
      </div>
    );
  }
}
