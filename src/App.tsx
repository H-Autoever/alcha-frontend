import PWABadge from './PWABadge.tsx';
import { Bell } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Vehicle3D from './components/Vehicle3D.tsx';
import useSSEData, { AlertData } from './hooks/useSSEConntect.ts';

function App() {
  const [recentOpen, setRecentOpen] = useState(false);
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);

  const { periodicData, realtimeData, alertData, status } = useSSEData(
    '1',
    true
  );

  useEffect(() => {
    if (periodicData && realtimeData) {
      const newVehicle = {
        state:
          realtimeData.engine_status_ignition === 'ON' &&
          (realtimeData.gear_position_mode === 'D' ||
            realtimeData.gear_position_mode === 'N')
            ? 'driving'
            : 'parked',
        vehicle_id: periodicData.vehicle_id,
        vehicle_speed: realtimeData.vehicle_speed,
        engine_rpm: realtimeData.engine_rpm,
        ignitionOn: realtimeData.engine_status_ignition === 'ON',
        gear_position_mode: realtimeData.gear_position_mode,
        fuel_level: periodicData.fuel_level,
        isEV: !!realtimeData.ev_battery_voltage,
        ev_battery_current: realtimeData.ev_battery_current,
        tpms: {
          FL: periodicData.tpms_front_left,
          FR: periodicData.tpms_front_right,
          RL: periodicData.tpms_rear_left,
          RR: periodicData.tpms_rear_right,
        },
        location_latitude: periodicData.location_latitude,
        location_longitude: periodicData.location_longitude,
        temperature_cabin: periodicData.temperature_cabin,
        temperature_ambient: periodicData.temperature_ambient,
        battery_voltage: periodicData.battery_voltage,
        throttle_position: realtimeData.throttle_position,
        gear_position_current_gear: realtimeData.gear_position_current_gear,
        engine_temp: realtimeData.engine_temp,
        coolant_temp: realtimeData.coolant_temp,
      };
      setVehicle(newVehicle);
    }
  }, [periodicData, realtimeData]);

  const recent = useMemo<AlertData[]>(
    () => (alertData ? alertData.slice(0, 2) : []),
    [alertData]
  );

  if (!vehicle) {
    return <div className='max-w-xl mx-auto p-10'>Loading...</div>;
  }

  return (
    <div className='max-w-xl mx-auto p-10'>
      <header className='mb-3 flex items-center justify-between px-2'>
        <h1 className='text-xl font-bold text-h-blue'>{vehicle.vehicle_id}</h1>
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
                  recent.map(r => (
                    <div key={r.id} className='mb-2'>
                      <div className='font-semibold text-gray-900'>
                        {r.title}
                      </div>
                      <div className='text-sm text-slate-600'>{r.message}</div>
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
          ['타이어 압력', `F ${vehicle.tpms.FL} / R ${vehicle.tpms.RL} kPa`],
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
      <PWABadge />
    </div>
  );
}

export default App;
