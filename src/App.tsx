import PWABadge from './PWABadge.tsx';
import { AlertTriangle, Bell, Loader2 } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Vehicle3D from './components/Vehicle3D.tsx';
import { VehicleState } from './types/VehicleState.ts';
import { useVehicle } from '@/contexts/VehicleContext.tsx';
import { useSSE } from '@/contexts/SSEContext.tsx';
import SSEStatusToast from '@/components/SSEStatusToast.tsx';

function App() {
  const [recentOpen, setRecentOpen] = useState(false);
  const navigate = useNavigate();
  const { vehicleId: currentVehicleId, setVehicleId } = useVehicle();
  const { periodicData, realtimeData, alerts, status, issue } = useSSE();
  const [inputVehicleID, setInputVehicleID] = useState(currentVehicleId);
  const [connectedVehicleID, setConnectedVehicleID] =
    useState(currentVehicleId);
  const [vehicle, setVehicle] = useState<VehicleState | null>(null);
  const vehicleSpeedRef = useRef(0);

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
        // 시동과 기어 상태로 주행중/주차중 판단
        const vehicleState = (
          ignitionOn && isDrivingGear ? 'driving' : 'parked'
        ) as 'driving' | 'parked';

        // 💡 둘 중 하나라도 데이터가 들어오면 기본 vehicle 객체 생성
        const initialVehicle = {
          state: vehicleState,
          vehicle_id:
            periodicData?.vehicle_id || realtimeData?.vehicle_id || 'GRANDEUR',
          vehicle_speed: realtimeData?.vehicle_speed || 0,
          engine_rpm: realtimeData?.engine_rpm || 0,
          ignitionOn: realtimeData?.engine_status_ignition === 'ON' || false,
          gear_position_mode: realtimeData?.gear_position_mode || 'P',
          fuel_level: periodicData?.fuel_level || 0,
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
        };
        vehicleSpeedRef.current = initialVehicle.vehicle_speed;
        setVehicle(initialVehicle);
      }
    }
    // vehicle 상태가 이미 존재하는 경우
    else if (vehicle) {
      // 💡 새로운 데이터로 필요한 속성만 업데이트
      setVehicle(prevVehicle => {
        if (!prevVehicle) return null;
        if (!periodicData && !realtimeData) {
          return prevVehicle;
        }

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
        }

        // 주차중/주행중 업데이트
        const isDrivingGear =
          updatedVehicle.gear_position_mode === 'D' ||
          updatedVehicle.gear_position_mode === 'N';
        updatedVehicle.state =
          updatedVehicle.ignitionOn && isDrivingGear ? 'driving' : 'parked';

        vehicleSpeedRef.current = updatedVehicle.vehicle_speed;

        return updatedVehicle;
      });
    } else {
      console.log('조회할 수 없는 vehicleId 입니다.', connectedVehicleID);
    }
  }, [periodicData, realtimeData, connectedVehicleID]);

  useEffect(() => {
    if (status === 'error' && issue?.type === 'client-offline') {
      setVehicle(null);
      vehicleSpeedRef.current = 0;
    }
  }, [status, issue]);

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

  // 최근 알림 2개
  const recent = useMemo(() => alerts.slice(0, 2), [alerts]);

  // 차량 ID 변경
  const changeVehicleID = () => {
    setVehicle(null);
    vehicleSpeedRef.current = 0;
    setConnectedVehicleID(inputVehicleID);
  };

  return (
    <div className='max-w-xl mx-auto p-10'>
      <SSEStatusToast />
      <header className='mb-3 flex items-center justify-between px-2'>
        {/* 테스트 끝나면 vehicle_id 입력 받는 기능 삭제하면서 대신 띄울 차량 식별 데이터 (차종 데이터가 들어온다면 차종) */}
        {/* <h1 className='text-xl font-bold text-h-blue'>
          {vehicle?.vehicle_id}
        </h1> */}
        <div className='flex gap-2 items-center'>
          <label htmlFor='vehicleID' className='text-h-blue font-semibold'>
            차량 ID
          </label>
          <input
            id='vehicleID'
            type='text'
            value={inputVehicleID}
            onChange={e => setInputVehicleID(e.target.value)}
            placeholder='차량 아이디를 입력하세요'
            className='border-1 p-2 rounded-sm max-w-[40%]'
          />
          <button
            className='bg-h-blue rounded-sm text-h-white p-2'
            onClick={changeVehicleID}
          >
            연결
          </button>
        </div>
        <div className='relative'>
          <button
            aria-label='notifications'
            onClick={() => setRecentOpen(v => !v)}
            className='flex items-center'
          >
            <Bell size={25} fill='var(--color-h-blue)' />
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
                  <div className='text-sm text-center text-slate-500 p-1'>
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
        <div className='flex min-h-[320px] flex-col items-center justify-center gap-4 text-center text-gray-500 whitespace-pre-line'>
          {status === 'error' ? (
            <AlertTriangle className='h-10 w-10 text-amber-500' aria-hidden />
          ) : (
            <Loader2
              className='h-10 w-10 animate-spin text-h-blue'
              aria-hidden
            />
          )}
          <p>
            {status === 'connecting'
              ? `SSE에 연결 중... (${connectedVehicleID})`
              : status === 'error'
                ? '연결이 종료되었습니다. \n 잠시 후 다시 시도해 주세요.'
                : issue
                  ? issue.message
                  : '데이터를 기다리는 중...'}
          </p>
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
            <div className='absolute bottom-2 right-3'>
              <span className='font-semibold'>⛽ {vehicle.fuel_level}%</span>
            </div>
            <div className='flex items-center justify-center py-6'>
              <Vehicle3D mode={vehicle.state} speedRef={vehicleSpeedRef} />
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
          <section className='mt-4 space-y-2'>
            {/* 위치 / 시동 */}
            <div className='flex gap-2'>
              <div className='rounded-xl border p-3 border-h-sand bg-h-white flex-1'>
                <div className='mb-2 text-sm text-h-grey'>위치</div>
                <div className='font-semibold text-slate-900'>
                  서울특별시 금천구 가산동
                </div>
              </div>
              <div className='rounded-xl border p-3 border-h-sand bg-h-white min-w-25'>
                <div className='mb-2 text-sm text-h-grey text-center'>시동</div>
                <div className='font-semibold text-slate-900 text-center'>
                  {vehicle.ignitionOn ? 'ON' : 'OFF'}
                </div>
              </div>
            </div>
            {/* 기어 위치 / 단수 */}
            <div className='flex gap-2'>
              <div className='rounded-xl border p-3 border-h-sand bg-h-white flex-1'>
                <div className='mb-2 text-sm text-h-grey'>기어 위치</div>
                <div className='font-semibold text-slate-900'>
                  {renderGearIndicator(vehicle.gear_position_mode)}
                </div>
              </div>
              <div className='rounded-xl border p-3 border-h-sand bg-h-white min-w-25'>
                <div className='mb-2 text-sm text-h-grey text-center'>
                  기어 단수
                </div>
                <div className='font-semibold text-slate-900 text-center'>
                  {vehicle.gear_position_current_gear}
                </div>
              </div>
            </div>
            {/* RPM / 스로틀 / 배터리 전압 */}
            <div className='flex justify-between gap-2'>
              {[
                { label: 'RPM', value: `${vehicle.engine_rpm}` },
                {
                  label: '스로틀',
                  value: `${vehicle.throttle_position}%`,
                },
                {
                  label: '배터리 전압',
                  value: `${vehicle.battery_voltage} V`,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className='rounded-xl border p-3 border-h-sand bg-h-white flex-1'
                >
                  <div className='mb-2 text-sm text-h-grey text-center'>
                    {label}
                  </div>
                  <div className='font-semibold text-slate-900 text-center'>
                    {value}
                  </div>
                </div>
              ))}
            </div>
            {/* 엔진/냉각수 온도 */}
            <div className='flex justify-between gap-2'>
              {[
                { label: '엔진 온도', value: `${vehicle.engine_temp}℃` },
                { label: '냉각수 온도', value: `${vehicle.coolant_temp}℃` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className='rounded-xl border p-3 border-h-sand bg-h-white flex-1'
                >
                  <div className='mb-2 text-sm text-h-grey'>{label}</div>
                  <div className='font-semibold text-slate-900'>{value}</div>
                </div>
              ))}
            </div>
            {/* 실내외 온도 */}
            <div className='flex justify-between gap-2'>
              {[
                { label: '실내 온도', value: `${vehicle.temperature_cabin}℃` },
                {
                  label: '실외 온도',
                  value: `${vehicle.temperature_ambient}℃`,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className='rounded-xl border p-3 border-h-sand bg-h-white flex-1'
                >
                  <div className='mb-2 text-sm text-h-grey'>{label}</div>
                  <div className='font-semibold text-slate-900'>{value}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <PWABadge />
    </div>
  );
}

export default App;

const renderGearIndicator = (gear: string) => {
  const gearOrder = ['P', 'R', 'N', 'D'] as const;
  const normalized = (gear || 'P').trim().toUpperCase();

  return (
    <div className='flex items-center gap-2'>
      {gearOrder.map(mode => {
        const isActive =
          normalized === mode || normalized.startsWith(mode.toUpperCase());
        return (
          <span
            key={mode}
            className={`min-w-[32px] rounded-md border px-2 py-1 text-center text-sm font-semibold ${
              isActive
                ? 'border-h-blue bg-h-blue text-white'
                : 'border-slate-200 bg-slate-100 text-slate-400'
            }`}
          >
            {mode}
          </span>
        );
      })}
    </div>
  );
};
