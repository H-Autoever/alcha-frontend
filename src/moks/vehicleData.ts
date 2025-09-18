interface VehicleData {
    vehicle_id: string,
    ignition: boolean,
    speed: number,
    fuel_percent: number,
    is_ev: boolean,
    wheel_speeds: {
        FL: number,
        FR: number,
        RL: number,
        RR: number,
    },
}

export const vehicleData: VehicleData = {
    vehicle_id: '1',
    ignition: true,
    speed: 100,
    fuel_percent: 50,
    is_ev: false,
    wheel_speeds: {
        FL: 100,
        FR: 100,
        RL: 100,
        RR: 100,
    },
}
