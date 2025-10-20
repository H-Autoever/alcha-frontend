import PWABadge from './PWABadge.tsx';
import { Bell } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Vehicle3D from './components/Vehicle3D.tsx';
import { VehicleState } from './types/VehicleState.ts';
import { useVehicle } from '@/contexts/VehicleContext.tsx';
import { useSSE } from '@/contexts/SSEContext.tsx';

function App() {
  const [recentOpen, setRecentOpen] = useState(false);
  const navigate = useNavigate();
  const { vehicleId: currentVehicleId, setVehicleId } = useVehicle();
  const { periodicData, realtimeData, alerts, status } = useSSE();
  const [inputVehicleID, setInputVehicleID] = useState(currentVehicleId);
  const [connectedVehicleID, setConnectedVehicleID] =
    useState(currentVehicleId);
  const [vehicle, setVehicle] = useState<VehicleState | null>(null);

  useEffect(() => {
    // vehicle 상태가  null인 경우
    if (!vehicle && (periodicData || realtimeData)) {
      // 이전에 요청한 차량 id와와 현재 요청한 차량 id가 다른 경우 남아있는 vehicle 상태 초기화화
      if (
        (realtimeData && connectedVehicleID !== realtimeData.vehicle_id) ||
        (periodicData && connectedVehicleID !== periodicData.vehicle_id)
      ) {
        setVehicle(null);
      } else {
        const ignitionOn = realtimeData?.engine_status_ignition === 'ON';
        const gearMode = realtimeData?.gear_position_mode || 'P';
        const isDrivingGear = gearMode === 'D' || gearMode === 'N';
        const vehicleState = (
          ignitionOn && isDrivingGear ? 'driving' : 'parked'
        ) as 'driving' | 'parked';
        // 💡 둘 중 하나라도 데이터가 들어오면 기본 vehicle 객체 생성
        const initialVehicle = {
          state: vehicleState,
          vehicle_id:
            periodicData?.vehicle_id || realtimeData?.vehicle_id || 'N/A',
          vehicle_speed: realtimeData?.vehicle_speed || 0,
          engine_rpm: realtimeData?.engine_rpm || 0,
          ignitionOn: realtimeData?.engine_status_ignition === 'ON' || false,
          gear_position_mode: realtimeData?.gear_position_mode || 'P',
          fuel_level: periodicData?.fuel_level || 0,
          isEV: !!realtimeData?.ev_battery_voltage,
          ev_battery_current: realtimeData?.ev_battery_current || 0,
          tpms: {
            FL: periodicData?.tpms_front_left || 0,
            FR: periodicData?.tpms_front_right || 0,
            RL: periodicData?.tpms_rear_left || 0,
            RR: periodicData?.tpms_rear_right || 0,
          },
          location_latitude: periodicData?.location_latitude || 0,
          location_longitude: periodicData?.location_longitude || 0,
          temperature_cabin: periodicData?.temperature_cabin || 0,
          temperature_ambient: periodicData?.temperature_ambient || 0,
          battery_voltage: periodicData?.battery_voltage || 0,
          throttle_position: realtimeData?.throttle_position || 0,
          gear_position_current_gear:
            realtimeData?.gear_position_current_gear || 0,
          engine_temp: realtimeData?.engine_temp || 0,
          coolant_temp: realtimeData?.coolant_temp || 0,
          accelerometer_x: 0,
          accelerometer_y: 0,
          accelerometer_z: 0,
        };
        setVehicle(initialVehicle);
      }
    }
    // vehicle 상태가 이미 존재하는 경우
    else if (vehicle) {
      // 💡 새로운 데이터로 필요한 속성만 업데이트
      setVehicle(prevVehicle => {
        if (!prevVehicle) return null;

        const updatedVehicle = { ...prevVehicle };

        if (periodicData) {
          updatedVehicle.vehicle_id = periodicData.vehicle_id;
          updatedVehicle.fuel_level = periodicData.fuel_level;
          updatedVehicle.tpms = {
            FL: periodicData.tpms_front_left,
            FR: periodicData.tpms_front_right,
            RL: periodicData.tpms_rear_left,
            RR: periodicData.tpms_rear_right,
          };
          updatedVehicle.location_latitude = periodicData.location_latitude;
          updatedVehicle.location_longitude = periodicData.location_longitude;
          updatedVehicle.temperature_cabin = periodicData.temperature_cabin;
          updatedVehicle.temperature_ambient = periodicData.temperature_ambient;
          updatedVehicle.battery_voltage = periodicData.battery_voltage;
        }

        if (realtimeData) {
          updatedVehicle.vehicle_speed = realtimeData.vehicle_speed;
          updatedVehicle.engine_rpm = realtimeData.engine_rpm;
          updatedVehicle.ignitionOn =
            realtimeData.engine_status_ignition === 'ON';
          updatedVehicle.gear_position_mode = realtimeData.gear_position_mode;
          updatedVehicle.throttle_position = realtimeData.throttle_position;
          updatedVehicle.gear_position_current_gear =
            realtimeData.gear_position_current_gear;
          updatedVehicle.engine_temp = realtimeData.engine_temp;
          updatedVehicle.coolant_temp = realtimeData.coolant_temp;
          updatedVehicle.isEV = !!realtimeData.ev_battery_voltage;
          updatedVehicle.ev_battery_current = realtimeData.ev_battery_current;
        }

        // 주차중/주행중 업데이트
        const isDrivingGear =
          updatedVehicle.gear_position_mode === 'D' ||
          updatedVehicle.gear_position_mode === 'N';
        updatedVehicle.state =
          updatedVehicle.ignitionOn && isDrivingGear ? 'driving' : 'parked';

        return updatedVehicle;
      });
    } else {
      console.log('조회할 수 없는 vehicleId 입니다.', connectedVehicleID);
    }
  }, [periodicData, realtimeData, connectedVehicleID]);

  useEffect(() => {
    setVehicleId(connectedVehicleID);
  }, [connectedVehicleID, setVehicleId]);

  useEffect(() => {
    setInputVehicleID(prev =>
      prev === currentVehicleId ? prev : currentVehicleId
    );
    setConnectedVehicleID(prev =>
      prev === currentVehicleId ? prev : currentVehicleId
    );
  }, [currentVehicleId]);

  const recent = useMemo(() => alerts.slice(0, 2), [alerts]);

  const handleConnect = () => {
    setVehicle(null);
    setConnectedVehicleID(inputVehicleID);
  };

  return (
    <div className='max-w-xl mx-auto p-10'>
      <header className='mb-3 flex items-center justify-between px-2'>
        {/* 테스트 끝나면 vehicle_id 입력 받는 기능 삭제하면서 대신 띄울 차량 식별 데이터 (차종 데이터가 들어온다면 차종) */}
        {/* <h1 className='text-xl font-bold text-h-blue'>
          {vehicle?.vehicle_id || '차량 ID'}
        </h1> */}
        <div className='flex gap-2 mb-4 items-center'>
          <label htmlFor='vehicleID' className='text-h-blue font-semibold'>
            차량 아이디
          </label>
          <input
            id='vehicleID'
            type='text'
            value={inputVehicleID}
            onChange={e => setInputVehicleID(e.target.value)}
            placeholder='차량 아이디를 입력하세요'
            className='border-1 p-1 rounded-sm max-w-[40%]'
          />
          <button
            className='bg-h-blue rounded-sm text-h-white p-2'
            onClick={handleConnect}
          >
            연결
          </button>
        </div>
        <div className='relative'>
          <button
            aria-label='notifications'
            onClick={() => setRecentOpen(v => !v)}
          >
            <Bell size={20} fill='var(--color-h-blue)' />
          </button>
          {recentOpen && (
            <div className='absolute right-0 top-10 z-20 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl'>
              <div className='bg-h-blue px-3 py-2.5 font-semibold text-white'>
                최근 알림
              </div>
              <div className='p-3'>
                {recent.length > 0 ? (
                  recent.map(notification => (
                    <div
                      key={`${notification.vehicle_id}-${notification.timestamp}`}
                      className='mb-2'
                    >
                      <div className='font-semibold text-gray-900'>
                        {notification.alertType}
                      </div>
                      <div className='text-sm text-slate-600'>
                        {notification.message}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-sm text-center text-slate-500'>
                    새로운 알림이 없습니다.
                  </div>
                )}
                <button
                  onClick={() => {
                    setRecentOpen(false);
                    navigate('/notifications');
                  }}
                  className='mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 hover:bg-slate-100'
                >
                  전체 알림 보러가기
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {!vehicle ? (
        <div className='text-center text-gray-500'>
          {status === 'connecting'
            ? `SSE에 연결 중... (${connectedVehicleID})`
            : '데이터를 기다리는 중...'}
        </div>
      ) : (
        <>
          <section className='relative rounded-2xl border p-4 border-h-sand'>
            <div className='flex items-center justify-between gap-50'>
              <div
                className='absolute left-3 top-3 flex items-center gap-2'
                aria-label={
                  vehicle.state === 'driving' ? 'ignition on' : 'ignition off'
                }
              >
                <div
                  className={`h-3 w-3 rounded-full ${
                    vehicle.state === 'driving' ? 'bg-h-green' : 'bg-h-red'
                  }`}
                />
                <span className='text-sm text-slate-500 inline-block'>
                  {vehicle.state === 'driving' ? '주행 중' : '주차 중'}
                </span>
              </div>
            </div>
            <div className='absolute right-3 top-2 font-semibold'>
              {vehicle.vehicle_speed} km/h
            </div>
            <div className='absolute bottom-2 right-3 flex items-center gap-1.5'>
              {vehicle.isEV ? (
                <div className='relative h-[18px] w-10 rounded border-2 border-h-black'>
                  <div className='absolute -right-1 top-[4px] h-[10px] w-1 rounded bg-h-black' />
                  <div
                    className='h-full rounded-sm bg-green-500'
                    style={{ width: vehicle.fuel_level + '%' }}
                  />
                </div>
              ) : (
                <div>⛽</div>
              )}
              <span className='font-semibold'>{vehicle.fuel_level}%</span>
            </div>
            <div className='flex items-center justify-center py-6'>
              <Vehicle3D mode={vehicle.state} speed={vehicle.vehicle_speed} />
            </div>
            {vehicle.tpms && (
              <div className='flex flex-col ap-2 text-xs text-h-grey'>
                <div>FL: {vehicle.tpms.FL} kPa</div>
                <div>FR: {vehicle.tpms.FR} kPa</div>
                <div>RL: {vehicle.tpms.RL} kPa</div>
                <div>RR: {vehicle.tpms.RR} kPa</div>
              </div>
            )}
          </section>
          <section className='mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2'>
            {[
              [
                '위치',
                `${vehicle.location_latitude}, ${vehicle.location_longitude}`,
              ],
              [
                'RPM',
                vehicle.state === 'driving' ? `${vehicle.engine_rpm} RPM` : '0',
              ],
              ['기어 위치', vehicle.gear_position_mode],
              [
                '스로틀',
                vehicle.state === 'driving'
                  ? `${vehicle.throttle_position}%`
                  : '0%',
              ],
              [
                '기어 단수',
                vehicle.state === 'driving'
                  ? vehicle.gear_position_current_gear
                  : '-',
              ],
              [
                '엔진 온도',
                vehicle.state === 'driving' ? `${vehicle.engine_temp}℃` : '—',
              ],
              [
                '냉각수 온도',
                vehicle.state === 'driving' ? `${vehicle.coolant_temp}℃` : '—',
              ],
              ['실내 온도', `${vehicle.temperature_cabin}℃`],
              ['실외 온도', `${vehicle.temperature_ambient}℃`],
              ['배터리 전압', `${vehicle.battery_voltage}V`],
              [
                '타이어 압력',
                `F ${vehicle.tpms.FL} / R ${vehicle.tpms.RL} kPa`,
              ],
              ['연료 잔량', `${vehicle.fuel_level}%`],
            ].map(([k, v]) => (
              <div
                key={k}
                className='rounded-xl border p-3 border-h-sand bg-h-white'
              >
                <div className='text-sm text-h-grey'>{k}</div>
                <div className='font-semibold'>{v}</div>
              </div>
            ))}
          </section>
        </>
      )}
      <PWABadge />
    </div>
  );
}

export default App;
