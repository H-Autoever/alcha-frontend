// useSseData.ts
import { useState, useEffect } from 'react';

// 데이터 타입 정의
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

// 상태 타입 정의
interface SSEState {
  periodicData: PeriodicData | null;
  realtimeData: RealtimeData | null;
  alertData: AlertData[] | null;
  status: 'connecting' | 'connected' | 'error' | 'closed';
  error: Event | null;
}

const useSSEConntect = (vehicleId: string, isMock: boolean = true) => {
  const [state, setState] = useState<SSEState>({
    periodicData: null,
    realtimeData: null,
    alertData: null,
    status: 'connecting',
    error: null,
  });

  useEffect(() => {
    // 💡 Mocking 모드인 경우
    if (isMock) {
      console.log('Mocking 모드로 SSE 데이터 생성 시작');
      setState(prevState => ({ ...prevState, status: 'connected' }));

      // periodic_data (10초 주기)
      const periodicInterval = setInterval(() => {
        const mockData = {
          vehicle_id: vehicleId,
          // 서울의 위도, 경도 범위(37.4~37.7, 126.7~127.2) 내에서 랜덤 값 생성
          location_latitude: 37.4 + Math.random() * 0.3,
          location_longitude: 126.7 + Math.random() * 0.5,
          location_altitude: 35.2,
          temperature_cabin: 20.0 + Math.random() * 10.0,
          temperature_ambient: 23.1,
          battery_voltage: 12.6,
          tpms_front_left: 220 + Math.random() * 20,
          tpms_front_right: 220 + Math.random() * 20,
          tpms_rear_left: 220 + Math.random() * 20,
          tpms_rear_right: 220 + Math.random() * 20,
          fuel_level: 58,
        };
        setState(prevState => ({ ...prevState, periodicData: mockData }));
      }, 10000);

      // realtime_data (1초 주기)
      const realtimeInterval = setInterval(() => {
        const mockData = {
          vehicle_id: vehicleId,
          vehicle_speed: Math.floor(Math.random() * 100),
          engine_rpm: Math.floor(Math.random() * 5000),
          engine_status_ignition: 'ON',
          throttle_position: Math.random() * 100,
          gear_position_mode: 'D',
          gear_position_current_gear: Math.floor(Math.random() * 6),
          engine_temp: 92.5 + Math.random(),
          coolant_temp: 89.7 + Math.random(),
          ev_battery_voltage: 350.0 + Math.random(),
          ev_battery_current: -45.2 + Math.random(),
          ev_battery_soc: Math.floor(Math.random() * 100),
        };
        setState(prevState => ({ ...prevState, realtimeData: mockData }));
      }, 1000);

      // alert_data (30초 주기)
      const alertInterval = setInterval(() => {
        const mockData = {
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          title: '타이어 압력 낮음',
          message: `타이어 공기압이 기준치보다 낮습니다. 확인해주세요.${Math.random()}`,
          severity: 'warning',
        };
        setState(prevState => {
          const newAlertData = prevState.alertData
            ? [mockData, ...prevState.alertData]
            : [mockData];
          return { ...prevState, alertData: newAlertData.slice(0, 10) };
        });
      }, 30000);

      return () => {
        clearInterval(periodicInterval);
        clearInterval(realtimeInterval);
        clearInterval(alertInterval);
        console.log('Mocking 데이터 생성 종료');
        setState(prevState => ({ ...prevState, status: 'closed' }));
      };
    }

    // 서버 주소는 실제 환경에 맞게 변경하세요.
    const url = `http://localhost:8080/api/sse/${vehicleId}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('SSE 연결 성공!');
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
      setState(prevState => ({ ...prevState, status: 'closed' }));
    };
  }, [vehicleId, isMock]);

  return state;
};

export default useSSEConntect;
