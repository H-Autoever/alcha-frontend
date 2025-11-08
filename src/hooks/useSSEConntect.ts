import { useEffect, useRef, useState } from 'react';
import { getAlertLabel } from '../constants/alerts';
import type {
  AlertData,
  PeriodicData,
  RealtimeData,
} from '../types/VehicleData';

interface SSEState {
  periodicData: PeriodicData | null;
  realtimeData: RealtimeData | null;
  alerts: AlertData[];
  status:
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'degraded'
    | 'error'
    | 'closed';
  issue: ConnectionIssue | null;
  recoveryAttempts: number;
  error: Event | null;
}

type ConnectionIssueType = 'client-offline' | 'server-error' | 'stale';

interface ConnectionIssue {
  type: ConnectionIssueType;
  message: string;
}

const REALTIME_EXPECTED_INTERVAL_MS = 1000; // 실시간 데이터 수신 주기 (1초)
const PERIODIC_EXPECTED_INTERVAL_MS = 10000; // 주기적 데이터 수신 주기 (10초)
const GRACE_MS = 2000; // 허용 지연 시간
const REALTIME_DEGRADE_MS = REALTIME_EXPECTED_INTERVAL_MS + GRACE_MS; // 실시간 데이터 지연 감지 기준
const PERIODIC_DEGRADE_MS = PERIODIC_EXPECTED_INTERVAL_MS + GRACE_MS; // 주기적 데이터 지연 감지 기준

const DEGRADE_RECONNECT_DELAY_MS = 5000; // 지연 상태에서 재연결 시도 대기 시간
const MAX_STALE_RECONNECT_ATTEMPTS = 3; // 최대 지연 재연결 시도 횟수
const SERVER_RETRY_DELAY_MS = 500; // 서버 오류 재연결 대기 시간
const DATA_RETRY_DELAY_MS = 200;
const CONNECTION_MESSAGES = {
  offline:
    '네트워크 연결이 끊겼습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
  server: '서버 응답이 없어 연결을 재시도합니다.',
  stale: {
    notice: '실시간 데이터 수신이 지연되고 있습니다.',
    retry: (attempt: number) =>
      `실시간 데이터 지연으로 연결을 재시도합니다. (시도 ${attempt}/${MAX_STALE_RECONNECT_ATTEMPTS})`,
    terminal:
      '실시간 데이터가 복구되지 않아 연결을 종료했습니다. 잠시 후 다시 시도해 주세요.',
  },
} as const;

const apiURL = import.meta.env.VITE_API_SERVER_URL;
const useSSEConnect = (vehicleId: string) => {
  const createInitialState = (): SSEState => ({
    periodicData: null,
    realtimeData: null,
    alerts: [],
    status: 'connecting',
    issue: null,
    recoveryAttempts: 0,
    error: null,
  });
  const [state, setState] = useState<SSEState>(createInitialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const periodicDegradeTimeoutRef = useRef<number | null>(null);
  const realtimeDegradeTimeoutRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectInitiateTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const staleStateRef = useRef({ periodic: false, realtime: false });
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;
    reconnectAttemptRef.current = 0;
    staleStateRef.current = { periodic: false, realtime: false };
    setState(createInitialState());

    const url = `${apiURL}/api/sse/${vehicleId}`;

    // SSR/테스트 환경에서는 navigator가 없을 수 있으므로, 안전하게 온라인 상태를 참조하기 위한 가드.
    const hasNavigator =
      typeof navigator !== 'undefined' &&
      navigator !== null &&
      'onLine' in navigator;

    const updateState = (updater: (prevState: SSEState) => SSEState) => {
      setState(prevState => {
        if (isUnmountedRef.current) {
          return prevState;
        }
        return updater(prevState);
      });
    };

    // 주기적/실시간 데이터 감시 타이머 정리 함수
    const clearPeriodicWatchdogs = () => {
      if (periodicDegradeTimeoutRef.current !== null) {
        window.clearTimeout(periodicDegradeTimeoutRef.current);
        periodicDegradeTimeoutRef.current = null;
      }
    };

    const clearRealtimeWatchdogs = () => {
      if (realtimeDegradeTimeoutRef.current !== null) {
        window.clearTimeout(realtimeDegradeTimeoutRef.current);
        realtimeDegradeTimeoutRef.current = null;
      }
    };

    const clearAllWatchdogs = () => {
      clearPeriodicWatchdogs();
      clearRealtimeWatchdogs();
    };

    const clearReconnectInitiateTimeout = () => {
      if (reconnectInitiateTimeoutRef.current !== null) {
        window.clearTimeout(reconnectInitiateTimeoutRef.current);
        reconnectInitiateTimeoutRef.current = null;
      }
    };

    const resetStaleFlags = () => {
      staleStateRef.current = { periodic: false, realtime: false };
    };

    const hasStale = () =>
      staleStateRef.current.periodic || staleStateRef.current.realtime;

    const applyStaleness = (state: SSEState): SSEState => {
      if (!hasStale()) {
        clearReconnectInitiateTimeout();
        reconnectAttemptRef.current = 0;

        const nextStatus =
          state.status === 'error' ? state.status : 'connected';
        const nextIssue = state.issue?.type === 'stale' ? null : state.issue;

        return {
          ...state,
          status: nextStatus,
          issue: nextIssue,
          recoveryAttempts: 0,
        };
      }

      if (state.status === 'reconnecting') {
        return {
          ...state,
          issue:
            state.issue?.type === 'stale'
              ? state.issue
              : {
                  type: 'stale',
                  message: CONNECTION_MESSAGES.stale.retry(
                    reconnectAttemptRef.current
                  ),
                },
          recoveryAttempts: reconnectAttemptRef.current,
        };
      }

      if (state.status === 'error') {
        return state;
      }

      return {
        ...state,
        status: 'degraded',
        issue: { type: 'stale', message: CONNECTION_MESSAGES.stale.notice },
        recoveryAttempts: reconnectAttemptRef.current,
      };
    };

    function scheduleDegradedReconnect() {
      if (!hasStale()) {
        return;
      }

      if (reconnectInitiateTimeoutRef.current !== null) {
        return;
      }

      reconnectInitiateTimeoutRef.current = window.setTimeout(() => {
        reconnectInitiateTimeoutRef.current = null;
        if (isUnmountedRef.current || !hasStale()) {
          return;
        }
        attemptReconnect();
      }, DEGRADE_RECONNECT_DELAY_MS);
    }

    function attemptReconnect() {
      if (!hasStale()) {
        return;
      }

      if (hasNavigator && !navigator.onLine) {
        // 브라우저가 오프라인이면 재연결을 시도해도 소용 없으므로 즉시 오프라인 처리
        handleClientOffline();
        return;
      }

      if (reconnectAttemptRef.current >= MAX_STALE_RECONNECT_ATTEMPTS) {
        console.error('실시간 데이터 지연이 장기화되어 연결을 종료합니다.');
        updateState(prevState => ({
          periodicData: null,
          realtimeData: null,
          alerts: prevState.alerts,
          status: 'error',
          issue: { type: 'stale', message: CONNECTION_MESSAGES.stale.terminal },
          recoveryAttempts: reconnectAttemptRef.current,
          error: prevState.error,
        }));
        clearAllWatchdogs();
        clearReconnectTimeout();
        clearReconnectInitiateTimeout();
        resetStaleFlags();
        closeEventSource();
        return;
      }

      reconnectAttemptRef.current += 1;
      console.warn('지연 지속으로 재연결 시도', {
        attempt: reconnectAttemptRef.current,
      });

      updateState(prevState => ({
        ...prevState,
        status: 'reconnecting',
        issue: {
          type: 'stale',
          message: CONNECTION_MESSAGES.stale.retry(reconnectAttemptRef.current),
        },
        recoveryAttempts: reconnectAttemptRef.current,
        error: prevState.error,
      }));

      closeEventSource();
      scheduleReconnect(DATA_RETRY_DELAY_MS);

      scheduleDegradedReconnect();
    }

    const markStale = (type: 'periodic' | 'realtime') => {
      if (staleStateRef.current[type]) {
        return;
      }

      staleStateRef.current = { ...staleStateRef.current, [type]: true };
      console.warn(
        `${type === 'periodic' ? 'periodic_data' : 'realtime_data'} 지연 감지`
      );

      updateState(prevState => applyStaleness(prevState));
      scheduleDegradedReconnect();
    };

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const closeEventSource = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };

    const scheduleReconnect = (delayMs: number) => {
      clearReconnectTimeout();

      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectTimeoutRef.current = null;

        if (isUnmountedRef.current) {
          return;
        }

        connect();
      }, delayMs);
    };

    const getConnectionIssue = (isOffline: boolean): ConnectionIssue => {
      if (isOffline) {
        return {
          type: 'client-offline',
          message: CONNECTION_MESSAGES.offline,
        };
      }

      return {
        type: 'server-error',
        message: CONNECTION_MESSAGES.server,
      };
    };

    const handleClientOffline = (event?: Event) => {
      updateState(prevState => {
        if (
          prevState.status === 'error' &&
          prevState.issue?.type === 'client-offline'
        ) {
          return prevState;
        }

        return {
          ...prevState,
          periodicData: null,
          realtimeData: null,
          status: 'error',
          issue: getConnectionIssue(true),
          recoveryAttempts: 0,
          error: event ?? prevState.error,
        };
      });

      reconnectAttemptRef.current = 0;
      clearAllWatchdogs();
      clearReconnectTimeout();
      clearReconnectInitiateTimeout();
      resetStaleFlags();
      closeEventSource();
    };

    const handleError = (event: Event) => {
      console.error('SSE 연결 에러:', event);
      const isOffline = hasNavigator ? !navigator.onLine : false; // navigator가 있을 때만 온라인 상태로 판단
      if (isOffline) {
        handleClientOffline(event);
        return;
      }

      const delayMs = SERVER_RETRY_DELAY_MS;

      reconnectAttemptRef.current = 0;
      updateState(prevState => ({
        ...prevState,
        status: 'reconnecting',
        issue: getConnectionIssue(false),
        recoveryAttempts: 0,
        error: event,
      }));

      clearAllWatchdogs();
      clearReconnectInitiateTimeout();
      resetStaleFlags();
      closeEventSource();
      scheduleReconnect(delayMs);
    };

    const startPeriodicWatchdogs = () => {
      clearPeriodicWatchdogs();

      periodicDegradeTimeoutRef.current = window.setTimeout(
        () => markStale('periodic'),
        PERIODIC_DEGRADE_MS
      );
    };

    const startRealtimeWatchdogs = () => {
      clearRealtimeWatchdogs();

      realtimeDegradeTimeoutRef.current = window.setTimeout(
        () => markStale('realtime'),
        REALTIME_DEGRADE_MS
      );
    };

    const connect = () => {
      closeEventSource();
      clearAllWatchdogs();
      resetStaleFlags();
      console.log('SSE 연결 시도', {
        vehicleId,
        attempt: reconnectAttemptRef.current,
      });

      updateState(prevState => ({
        ...prevState,
        status: reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting',
        error: null,
      }));

      if (hasNavigator && !navigator.onLine) {
        // 연결 시도 직전에 네트워크 상태를 확인해 불필요한 EventSource 생성 방지
        console.warn('오프라인 상태로 SSE 연결을 중단합니다.');
        handleClientOffline();
        return;
      }

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE 연결 성공!', vehicleId);
        updateState(prevState => ({
          ...prevState,
          status: 'connected',
          issue: null,
          recoveryAttempts: 0,
          error: null,
        }));
        startPeriodicWatchdogs();
        startRealtimeWatchdogs();
      };

      eventSource.addEventListener('periodic_data', rawEvent => {
        console.log('periodic_data 수신', rawEvent.data);
        try {
          const data = JSON.parse(
            (rawEvent as MessageEvent<string>).data
          ) as PeriodicData;
          staleStateRef.current = { ...staleStateRef.current, periodic: false };
          updateState(prevState => {
            const nextState: SSEState = {
              ...prevState,
              periodicData: data,
              recoveryAttempts: 0,
            };
            return applyStaleness(nextState);
          });
          startPeriodicWatchdogs();
        } catch (error) {
          console.error('periodic_data 파싱 실패', error);
        }
      });

      eventSource.addEventListener('realtime_data', rawEvent => {
        console.log('realtime_data 수신', rawEvent.data);
        try {
          const data = JSON.parse(
            (rawEvent as MessageEvent<string>).data
          ) as RealtimeData;
          staleStateRef.current = { ...staleStateRef.current, realtime: false };
          updateState(prevState => {
            const nextState: SSEState = {
              ...prevState,
              realtimeData: data,
              recoveryAttempts: 0,
            };
            return applyStaleness(nextState);
          });
          startRealtimeWatchdogs();
        } catch (error) {
          console.error('realtime_data 파싱 실패', error);
        }
      });

      eventSource.addEventListener('alert_data', rawEvent => {
        console.log('alert_data 수신', rawEvent.data);
        try {
          const parsed = JSON.parse(
            (rawEvent as MessageEvent<string>).data
          ) as AlertData;
          const data: AlertData = {
            ...parsed,
            alertType: getAlertLabel(parsed.alertType),
          };

          const hadPeriodicStale = staleStateRef.current.periodic;
          const hadRealtimeStale = staleStateRef.current.realtime;
          staleStateRef.current = { periodic: false, realtime: false };

          updateState(prevState => {
            const alerts = [data, ...prevState.alerts].slice(0, 2);
            const nextState: SSEState = {
              ...prevState,
              alerts,
              recoveryAttempts: 0,
            };
            return applyStaleness(nextState);
          });

          if (hadPeriodicStale) {
            startPeriodicWatchdogs();
          }
          if (hadRealtimeStale) {
            startRealtimeWatchdogs();
          }
        } catch (error) {
          console.error('alert_data 파싱 실패', error);
        }
      });

      eventSource.onerror = handleError;
    };

    connect();

    const handleOffline = () => {
      if (isUnmountedRef.current) {
        return;
      }

      handleClientOffline();
    };

    const handleOnline = () => {
      if (isUnmountedRef.current) {
        return;
      }

      if (!eventSourceRef.current) {
        reconnectAttemptRef.current = 0;
        connect();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      console.log('SSE 연결 종료');
      isUnmountedRef.current = true;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearAllWatchdogs();
      clearReconnectTimeout();
      clearReconnectInitiateTimeout();
      closeEventSource();
      reconnectAttemptRef.current = 0;
      resetStaleFlags();
    };
  }, [vehicleId]);

  return state;
};

export default useSSEConnect;
