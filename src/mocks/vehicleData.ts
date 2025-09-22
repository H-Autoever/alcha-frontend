interface Gear {
  gear: 'P' | 'R' | 'N' | 'D';
  gear_number?: 1 | 2 | 3 | 4 | 5 | 6;
}

interface VehicleData {
  vehicle_id: string;
  vehicle_type: string;
  ignition: boolean;
  speed: number;
  fuel_percent: number;
  is_ev: boolean;
  wheel_speeds: {
    FL: number;
    FR: number;
    RL: number;
    RR: number;
  };
  gear: Gear;
  parking_brake: boolean;
}

export const vehicleData: VehicleData = {
  vehicle_id: '1',
  vehicle_type: 'Tesla',
  ignition: true,
  speed: 200,
  fuel_percent: 50,
  is_ev: false,
  wheel_speeds: {
    FL: 100,
    FR: 100,
    RL: 100,
    RR: 100,
  },
  gear: { gear: 'P' },
  parking_brake: false,
};
