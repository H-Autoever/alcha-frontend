import { useEffect, useRef, useState } from 'react';
import { getAlertLabel } from '../constants/alerts';

interface PeriodicData {
  vehicle_id: string;
  location_latitude: number;
  location_longitude: number;
  location_altitude: number;
  temperature_cabin: number;
  temperature_ambient: number;
  battery_voltage: number;
  tpms_front_left: number;
  tpms_front_right: number;
  tpms_rear_left: number;
  tpms_rear_right: number;
  fuel_level: number;
}

interface RealtimeData {
  vehicle_id: string;
  vehicle_speed: number;
  engine_rpm: number;
  engine_status_ignition: string;
  throttle_position: number;
  gear_position_mode: string;
  gear_position_current_gear: number;
  engine_temp: number;
  coolant_temp: number;
  ev_battery_voltage: number;
  ev_battery_current: number;
  ev_battery_soc: number;
}

interface RawAlertData {
  vehicleId: string;
  timestamp: string;
  alertType: string;
  message: string;
}

export interface AlertData {
  vehicle_id: string;
  timestamp: string;
  alertType: string;
  message: string;
}

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

const REALTIME_EXPECTED_INTERVAL_MS = 1000;
const REALTIME_GRACE_MS = 500;
const REALTIME_DEGRADE_MS = REALTIME_EXPECTED_INTERVAL_MS + REALTIME_GRACE_MS;
const PERIODIC_EXPECTED_INTERVAL_MS = 10000;
const PERIODIC_GRACE_MS = 2000;
const PERIODIC_DEGRADE_MS = PERIODIC_EXPECTED_INTERVAL_MS + PERIODIC_GRACE_MS;
const DEGRADE_RECONNECT_DELAY_MS = 5000;
const MAX_STALE_RECONNECT_ATTEMPTS = 5;
const SERVER_RETRY_DELAY_MS = 500;
const OFFLINE_RETRY_DELAY_MS = 2000;
const DATA_RETRY_DELAY_MS = 200;
const STALE_NOTICE_MESSAGE = '실시간 데이터 수신이 지연되고 있습니다.';
const STALE_RETRY_MESSAGE = (attempt: number) =>
  `실시간 데이터 지연으로 연결을 재시도합니다. (시도 ${attempt}/${MAX_STALE_RECONNECT_ATTEMPTS})`;
const STALE_ERROR_MESSAGE =
  '실시간 데이터가 복구되지 않아 연결을 종료했습니다. 잠시 후 다시 시도해 주세요.';
const OFFLINE_ERROR_MESSAGE =
  '네트워크 연결이 끊겼습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';

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
                  message: STALE_RETRY_MESSAGE(reconnectAttemptRef.current),
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
        issue: { type: 'stale', message: STALE_NOTICE_MESSAGE },
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
          issue: { type: 'stale', message: STALE_ERROR_MESSAGE },
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
          message: STALE_RETRY_MESSAGE(reconnectAttemptRef.current),
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
          message: OFFLINE_ERROR_MESSAGE,
        };
      }

      return {
        type: 'server-error',
        message: '서버 응답이 없어 연결을 재시도합니다.',
      };
    };

    const handleClientOffline = (event?: Event) => {
      updateState(prevState => {
        if (prevState.status === 'error' && prevState.issue?.type === 'client-offline') {
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
      const isOffline = hasNavigator ? !navigator.onLine : false;
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
        try {
          const raw = JSON.parse(
            (rawEvent as MessageEvent<string>).data
          ) as RawAlertData;
          const data: AlertData = {
            vehicle_id: raw.vehicleId,
            timestamp: raw.timestamp,
            alertType: getAlertLabel(raw.alertType),
            message: raw.message,
          };

          updateState(prevState => {
            const alerts = [data, ...prevState.alerts].slice(0, 2);
            return { ...prevState, alerts };
          });
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
