export interface RealtimeData {
  vehicle_id: string;
  vehicle_speed: number; // 차량 속도
  engine_rpm: number; // 엔진 회전수(RPM)
  engine_status_ignition: string; // 시동 상태
  throttle_position: number; // 스로틀
  gear_position_mode: string; // 기어 단수
  gear_position_current_gear: number; // 기어 위치
  engine_temp: number; // 엔진 온도
  coolant_temp: number; // 냉각수 온도
}

export interface PeriodicData {
  vehicle_id: string;
  location_latitude: number; // 위도
  location_longitude: number; // 경도
  location_altitude: number; // 고도
  temperature_cabin: number; // 실내 온도
  temperature_ambient: number; // 실외 온도
  battery_voltage: number; // 배터리 전압
  tpms_front_left: number; // 타이어 공기압
  tpms_front_right: number;
  tpms_rear_left: number;
  tpms_rear_right: number;
  fuel_level: number; // 연료 잔량
}

export interface AlertData {
  vehicle_id: string;
  timestamp: string;
  alertType: string;
  message: string;
}
