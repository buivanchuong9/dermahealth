import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FriendlyErrorPage } from '../components/feedback/FriendlyError';
import { logClientEvent } from '../api/audit';

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
    void logClientEvent({
      action: 'CLIENT_RENDER_ERROR',
      entityType: 'Application',
      reason: error.message,
      sourceModule: 'ErrorBoundary',
      severity: 'critical',
      occurredAt: new Date().toISOString(),
      newState: {
        errorName: error.name,
        stack: error.stack,
        componentStack: info.componentStack,
      },
    }).catch(() => undefined);
  }

  private reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <FriendlyErrorPage error="Ứng dụng gặp sự cố khi hiển thị trang này. Bạn có thể thử lại hoặc quay về trang tổng quan." onRetry={this.reset} />
    );
  }
}
