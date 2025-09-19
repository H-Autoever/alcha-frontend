import PWABadge from './PWABadge.tsx';
import { vehicleData } from './mocks/vehicleData.ts';
import { Bell } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { items } from './mocks/alertHistory.ts';
import { Notification } from './types/Notification.ts';
type VehicleState = 'driving' | 'parked';

function App() {
  // TODO: SSE 데이터로 교체 예정. 현재는 정적 표시
  const [recentOpen, setRecentOpen] = useState(false);
  const navigate = useNavigate();

  const recent = useMemo<Notification[]>(() => items.slice(0, 2), []);
  const vehicle: {
    state: VehicleState;
    vehicle_type: string;
    speed: number;
    ignitionOn: boolean;
    fuelPercent: number;
    isEV: boolean;
    wheel: null | { FL: number; FR: number; RL: number; RR: number };
  } = {
    state:
      vehicleData.ignition && vehicleData.gear.gear === 'D'
        ? 'driving'
        : 'parked',
    vehicle_type: vehicleData.vehicle_type,
    speed: vehicleData.speed,
    ignitionOn: vehicleData.ignition,
    fuelPercent: vehicleData.fuel_percent,
    isEV: vehicleData.is_ev,
    wheel: null,
  };

  return (
    <div className='max-w-xl mx-auto p-10'>
      <header className='mb-3 flex items-center justify-between px-2'>
        <h1 className='text-xl font-bold text-h-blue'>
          {vehicle.vehicle_type}
        </h1>
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
                {recent.map(r => (
                  <div key={r.id} className='mb-2'>
                    <div className='font-semibold text-gray-900'>{r.title}</div>
                    <div className='text-sm text-slate-600'>{r.message}</div>
                  </div>
                ))}
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
      {/* 주행중 정보 */}
      <section className='relative rounded-2xl border p-4 border-h-sand bg-h-light-blue'>
        <div className='flex items-center justify-between gap-50'>
          <div
            className='absolute left-3 top-3 flex items-center gap-2'
            aria-label={vehicle.state ? 'ignition on' : 'ignition off'}
          >
            <div
              className={`h-3 w-3 rounded-full ${vehicle.state === 'driving' ? 'bg-h-green' : 'bg-h-red'}`}
            />
            <span className='text-sm text-slate-500 inline-block'>
              {vehicle.state === 'driving' ? '주행 중' : '주차 중'}
            </span>
          </div>
        </div>

        <div className='absolute right-3 top-2 font-semibold'>
          {vehicle.speed} km/h
        </div>

        <div className='absolute bottom-2 right-3 flex items-center gap-1.5'>
          {vehicle.isEV ? (
            <div className='relative h-[18px] w-10 rounded border-2 border-h-black'>
              <div className='absolute -right-1 top-[4px] h-[10px] w-1 rounded bg-h-black' />
              <div
                className='h-full rounded-sm bg-green-500'
                style={{ width: vehicle.fuelPercent + '%' }}
              />
            </div>
          ) : (
            <div>⛽</div>
          )}
          <span className='font-semibold'>{vehicle.fuelPercent}%</span>
        </div>

        <div className='flex items-center justify-center py-6'>
          <img
            src='/alcha_logo.svg'
            alt='vehicle'
            className='w-4/5 max-w-[380px]'
          />
        </div>

        {vehicle.wheel && (
          <div className='grid grid-cols-2 gap-2 text-xs text-h-grey'>
            <div>FL: {vehicle.wheel.FL}km/h</div>
            <div className='text-right'>FR: {vehicle.wheel.FR}km/h</div>
            <div>RL: {vehicle.wheel.RL}km/h</div>
            <div className='text-right'>RR: {vehicle.wheel.RR}km/h</div>
          </div>
        )}
      </section>

      {/* 정적인 정보들 */}
      <section className='mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2'>
        {[
          ['위치', '서울 강남구'],
          ['RPM', vehicle.state === 'driving' ? '2400' : '0'],
          ['기어 위치', vehicle.state === 'driving' ? 'D' : 'P'],
          ['스로틀', vehicle.state === 'driving' ? '18%' : '0%'],
          ['기어 단수', vehicle.state === 'driving' ? '3' : '-'],
          ['엔진 온도', vehicle.state === 'driving' ? '88℃' : '—'],
          ['냉각수 온도', vehicle.state === 'driving' ? '82℃' : '—'],
          ['실내 온도', '22℃'],
          ['실외 온도', '11℃'],
          ['배터리 전압', '12.6V'],
          ['타이어 압력', 'F 36 / R 34 psi'],
          ['차량 방향', 'NE'],
          ['주차 브레이크', vehicle.state === 'driving' ? '해제' : '체결'],
          ['차문/트렁크', '모두 닫힘'],
          ['경고등', '정상'],
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
