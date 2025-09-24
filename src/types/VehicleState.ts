export type VehicleState = {
  state: 'driving' | 'parked';
  vehicle_id: string;
  vehicle_speed: number;
  engine_rpm: number;
  ignitionOn: boolean;
  gear_position_mode: string;
  gear_position_current_gear: number;
  fuel_level: number;
  isEV: boolean;
  ev_battery_current: number;
  tpms: {
    FL: number;
    FR: number;
    RL: number;
    RR: number;
  };
  location_latitude: number;
  location_longitude: number;
  temperature_cabin: number;
  temperature_ambient: number;
  battery_voltage: number;
  throttle_position: number;
  engine_temp: number;
  coolant_temp: number;
  accelerometer_x: number;
  accelerometer_y: number;
  accelerometer_z: number;
};
