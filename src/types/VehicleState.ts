export type VehicleState = {
  vehicle_id: string;
  ignitionOn: boolean;
  state: 'driving' | 'parked';
  vehicle_speed: number;
  tpms: {
    FL: number;
    FR: number;
    RL: number;
    RR: number;
  };
  fuel_level: number;
  location_latitude: number;
  location_longitude: number;
  engine_rpm: number;
  throttle_position: number;
  gear_position_mode: string;
  gear_position_current_gear: number;
  temperature_cabin: number;
  temperature_ambient: number;
  battery_voltage: number;
  engine_temp: number;
  coolant_temp: number;
};
