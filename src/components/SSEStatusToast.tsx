import { useEffect, useRef, useState } from 'react';
import { useSSE } from '@/contexts/SSEContext.tsx';

type ToastTone = 'info' | 'warning' | 'error';

interface ToastState {
  message: string;
  tone: ToastTone;
}

const AUTO_DISMISS_MS = 1000;

const toneStyles: Record<ToastTone, string> = {
  info: 'bg-slate-900/90 text-white border-slate-700',
  warning: 'bg-amber-100 text-amber-900 border-amber-300',
  error: 'bg-red-100 text-red-900 border-red-300',
};

const SSEStatusToast = () => {
  const { status, issue, recoveryAttempts } = useSSE();
  const [toast, setToast] = useState<ToastState | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const previousStatusRef = useRef(status);
  const previousAttemptRef = useRef(recoveryAttempts);
  const previousIssueRef = useRef(issue?.type ?? null);

  const isStaleIssue = (type: string | undefined | null) => type === 'stale';

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const showToast = (message: string, tone: ToastTone) => {
    clearHideTimeout();
    setToast({ message, tone });
    hideTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      hideTimeoutRef.current = null;
    }, AUTO_DISMISS_MS);
  };

  useEffect(() => {
    const currentIssueType = issue?.type ?? null;
    const wasDegraded =
      previousStatusRef.current === 'degraded' &&
      isStaleIssue(previousIssueRef.current);
    const isDegradedNow =
      status === 'degraded' &&
      isStaleIssue(currentIssueType) &&
      recoveryAttempts === 0;

    if (isDegradedNow && !wasDegraded) {
      if (issue) {
        showToast(issue.message, 'warning');
      }
    } else if (
      status === 'reconnecting' &&
      isStaleIssue(currentIssueType) &&
      recoveryAttempts > previousAttemptRef.current
    ) {
      if (issue) {
        showToast(issue.message, 'info');
      }
    } else if (status === 'error') {
      if (previousStatusRef.current !== 'error') {
        showToast(issue?.message ?? 'SSE 연결이 종료되었습니다.', 'error');
      }
    }

    previousStatusRef.current = status;
    previousAttemptRef.current = recoveryAttempts;
    previousIssueRef.current = currentIssueType;
  }, [status, issue, recoveryAttempts]);

  useEffect(
    () => () => {
      clearHideTimeout();
    },
    []
  );

  if (!toast) {
    return null;
  }

  return (
    <div className='fixed right-4 bottom-4 z-50 flex max-w-xs flex-col gap-2'>
      <div
        className={`rounded-xl border px-4 py-3 text-sm shadow-lg transition ${toneStyles[toast.tone]}`}
        role='status'
      >
        <p className='font-semibold'>실시간 연결 상태</p>
        <p className='mt-1 leading-relaxed'>{toast.message}</p>
      </div>
    </div>
  );
};

export default SSEStatusToast;
