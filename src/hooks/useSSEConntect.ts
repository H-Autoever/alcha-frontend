import { useState, useEffect } from 'react';

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

export interface AlertData {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  severity: string;
}

interface SSEState {
  periodicData: PeriodicData | null;
  realtimeData: RealtimeData | null;
  alertData: AlertData[] | null;
  status: 'connecting' | 'connected' | 'error' | 'closed';
  error: Event | null;
}

const useSSEConnect = (vehicleId: string) => {
  const [state, setState] = useState<SSEState>({
    periodicData: null,
    realtimeData: null,
    alertData: null,
    status: 'connecting',
    error: null,
  });

  useEffect(() => {
    const url = `http://43.203.235.211:9090/api/sse/${vehicleId}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('SSE 연결 성공!', vehicleId);
      setState(prevState => ({ ...prevState, status: 'connected' }));
    };

    eventSource.addEventListener('periodic_data', event => {
      const data = JSON.parse(event.data) as PeriodicData;
      setState(prevState => ({ ...prevState, periodicData: data }));
    });

    eventSource.addEventListener('realtime_data', event => {
      const data = JSON.parse(event.data) as RealtimeData;
      setState(prevState => ({ ...prevState, realtimeData: data }));
    });

    eventSource.addEventListener('alert_data', event => {
      const data = JSON.parse(event.data) as AlertData;
      setState(prevState => {
        const newAlertData = prevState.alertData
          ? [data, ...prevState.alertData]
          : [data];
        return { ...prevState, alertData: newAlertData.slice(0, 10) };
      });
    });

    eventSource.onerror = event => {
      console.error('SSE 연결 에러:', event);
      setState(prevState => ({ ...prevState, status: 'error', error: event }));
      eventSource.close();
    };

    return () => {
      console.log('SSE 연결 종료');
      eventSource.close();
    };
  }, [vehicleId]);

  return state;
};

export default useSSEConnect;
