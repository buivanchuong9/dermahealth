import { useEffect, useRef } from 'react';
import { auditService } from '../../domain/services/auditService';
import { userRepository } from '../../domain/repositories';
import { useFriendlyError } from './useFriendlyError';

/** Covers failures outside React rendering (event handlers, timers and rejected
 * promises). Render failures remain the responsibility of AppErrorBoundary. */
export function GlobalErrorListener() {
  const showError = useFriendlyError();
  const showing = useRef(false);

  useEffect(() => {
    const report = (reason: unknown) => {
      if (showing.current) return;
      showing.current = true;
      const error = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : 'Lỗi không xác định');
      try {
        const actor = userRepository.getAll()[0];
        if (actor) auditService.log({ actorId: actor.id, action: 'UNHANDLED_CLIENT_ERROR', entityType: 'Application', entityId: 'client', reason: error.message, sourceModule: 'GlobalErrorListener', severity: 'critical' });
      } catch { /* giao diện lỗi không được phụ thuộc vào audit */ }
      const instance = showError('Hệ thống chưa thể hoàn tất thao tác này. Vui lòng thử lại sau ít phút.');
      window.setTimeout(() => { showing.current = false; }, 800);
      return instance;
    };
    const onError = (event: ErrorEvent) => { event.preventDefault(); report(event.error ?? event.message); };
    const onRejection = (event: PromiseRejectionEvent) => { event.preventDefault(); report(event.reason); };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection); };
  }, [showError]);

  return null;
}
