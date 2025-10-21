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
  status: 'connecting' | 'connected' | 'reconnecting' | 'degraded' | 'error' | 'closed';
  issue: ConnectionIssue | null;
  error: Event | null;
}

type ConnectionIssueType = 'client-offline' | 'server-error' | 'stale-periodic';

interface ConnectionIssue {
  type: ConnectionIssueType;
  message: string;
}

const PERIODIC_EXPECTED_INTERVAL_MS = 1000;
const PERIODIC_GRACE_MS = 500;
const PERIODIC_DEGRADE_MS = PERIODIC_EXPECTED_INTERVAL_MS + PERIODIC_GRACE_MS;
const PERIODIC_RECOVERY_TRIGGER_MS = 5000;
const MAX_PERIODIC_RECOVERY_ATTEMPTS = 5;
const SERVER_RETRY_DELAY_MS = 500;
const OFFLINE_RETRY_DELAY_MS = 2000;
const PERIODIC_RETRY_DELAY_MS = 200;

const apiURL = import.meta.env.VITE_API_SERVER_URL;
const useSSEConnect = (vehicleId: string) => {
  const createInitialState = (): SSEState => ({
    periodicData: null,
    realtimeData: null,
    alerts: [],
    status: 'connecting',
    issue: null,
    error: null,
  });
  const [state, setState] = useState<SSEState>(createInitialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const periodicDegradeTimeoutRef = useRef<number | null>(null);
  const periodicRecoveryTimeoutRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const periodicRecoveryAttemptRef = useRef(0);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;
    reconnectAttemptRef.current = 0;
    setState(createInitialState());

    const url = `${apiURL}/api/sse/${vehicleId}`;
    const hasNavigator =
      typeof navigator !== 'undefined' && navigator !== null && 'onLine' in navigator;

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
      if (periodicRecoveryTimeoutRef.current !== null) {
        window.clearTimeout(periodicRecoveryTimeoutRef.current);
        periodicRecoveryTimeoutRef.current = null;
      }
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

        reconnectAttemptRef.current += 1;
        connect();
      }, delayMs);
    };

    const getConnectionIssue = (isOffline: boolean): ConnectionIssue => {
      if (isOffline) {
        return {
          type: 'client-offline',
          message: '네트워크 오류로 연결이 끊겼습니다. 다시 연결을 시도합니다.',
        };
      }

      return {
        type: 'server-error',
        message: '서버 응답이 없어 연결을 재시도합니다.',
      };
    };

    const handleError = (event: Event) => {
      console.error('SSE 연결 에러:', event);
      const isOffline = hasNavigator ? !navigator.onLine : false;
      const delayMs = isOffline ? OFFLINE_RETRY_DELAY_MS : SERVER_RETRY_DELAY_MS;

      updateState(prevState => ({
        ...prevState,
        status: 'reconnecting',
        issue: getConnectionIssue(isOffline),
        error: event,
      }));

      clearPeriodicWatchdogs();
      closeEventSource();
      scheduleReconnect(delayMs);
    };

    const handlePeriodicRecovery = () => {
      if (isUnmountedRef.current) {
        return;
      }

      clearPeriodicWatchdogs();

      if (periodicRecoveryAttemptRef.current >= MAX_PERIODIC_RECOVERY_ATTEMPTS) {
        console.error('periodic_data 장기 지연으로 자동 복구 중단');
        updateState(prevState => ({
          ...prevState,
          status: 'error',
          issue: {
            type: 'stale-periodic',
            message: '주기 데이터가 장기간 전달되지 않아 연결을 종료했습니다.',
          },
        }));
        closeEventSource();
        return;
      }

      periodicRecoveryAttemptRef.current += 1;
      console.warn('periodic_data 장기 지연, 재연결 시도', {
        attempt: periodicRecoveryAttemptRef.current,
      });

      updateState(prevState => ({
        ...prevState,
        status: 'reconnecting',
        issue: {
          type: 'stale-periodic',
          message: '주기 데이터가 장시간 들어오지 않아 연결을 재시도합니다.',
        },
      }));

      closeEventSource();
      scheduleReconnect(PERIODIC_RETRY_DELAY_MS);
    };

    const connect = () => {
      closeEventSource();
      clearPeriodicWatchdogs();
      console.log('SSE 연결 시도', { vehicleId, attempt: reconnectAttemptRef.current });

      updateState(prevState => ({
        ...prevState,
        status: reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting',
        error: null,
      }));

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE 연결 성공!', vehicleId);
        reconnectAttemptRef.current = 0;
        updateState(prevState => ({
          ...prevState,
          status: 'connected',
          issue: null,
          error: null,
        }));
        startPeriodicWatchdogs();
      };

      eventSource.addEventListener('periodic_data', rawEvent => {
        try {
          const data = JSON.parse((rawEvent as MessageEvent<string>).data) as PeriodicData;
          updateState(prevState => ({
            ...prevState,
            periodicData: data,
            status: 'connected',
            issue:
              prevState.issue?.type === 'stale-periodic' ? null : prevState.issue,
          }));
          periodicRecoveryAttemptRef.current = 0;
          startPeriodicWatchdogs();
        } catch (error) {
          console.error('periodic_data 파싱 실패', error);
        }
      });

      eventSource.addEventListener('realtime_data', rawEvent => {
        try {
          const data = JSON.parse((rawEvent as MessageEvent<string>).data) as RealtimeData;
          updateState(prevState => ({ ...prevState, realtimeData: data }));
        } catch (error) {
          console.error('realtime_data 파싱 실패', error);
        }
      });

      eventSource.addEventListener('alert_data', rawEvent => {
        try {
          const raw = JSON.parse((rawEvent as MessageEvent<string>).data) as RawAlertData;
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

    const handlePeriodicDegrade = () => {
      if (isUnmountedRef.current) {
        return;
      }

      updateState(prevState => {
        if (prevState.status === 'degraded' && prevState.issue?.type === 'stale-periodic') {
          return prevState;
        }
        console.warn('periodic_data 지연 감지');
        return {
          ...prevState,
          status: 'degraded',
          issue: {
            type: 'stale-periodic',
            message: '주기 데이터 수신이 지연되고 있습니다.',
          },
        };
      });
    };

    const startPeriodicWatchdogs = () => {
      clearPeriodicWatchdogs();

      periodicDegradeTimeoutRef.current = window.setTimeout(
        handlePeriodicDegrade,
        PERIODIC_DEGRADE_MS,
      );

      periodicRecoveryTimeoutRef.current = window.setTimeout(
        handlePeriodicRecovery,
        PERIODIC_RECOVERY_TRIGGER_MS,
      );
    };

    connect();

    const handleOnline = () => {
      if (isUnmountedRef.current) {
        return;
      }

      if (!eventSourceRef.current) {
        reconnectAttemptRef.current = 0;
        connect();
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      console.log('SSE 연결 종료');
      isUnmountedRef.current = true;
      window.removeEventListener('online', handleOnline);
      clearPeriodicWatchdogs();
      clearReconnectTimeout();
      closeEventSource();
      reconnectAttemptRef.current = 0;
      periodicRecoveryAttemptRef.current = 0;
    };
  }, [vehicleId]);

  return state;
};

export default useSSEConnect;
