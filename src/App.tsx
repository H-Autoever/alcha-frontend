import PWABadge from './PWABadge.tsx'
import FloatingNotifications from './components/FloatingNotifications.tsx'

type VehicleState = 'driving' | 'parked'

function App() {
  // TODO: SSE 데이터로 교체 예정. 현재는 정적 표시
  const vehicle: {
    state: VehicleState
    speed: number
    ignitionOn: boolean
    fuelPercent: number
    isEV: boolean
    wheel: null | { FL: number; FR: number; RL: number; RR: number }
  } = {
    state: 'parked',
    speed: 0,
    ignitionOn: false,
    fuelPercent: 72,
    isEV: true,
    wheel: null,
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="m-0 text-xl font-bold text-[#002c5f]">ALCHA</h1>
        <span className="text-sm text-slate-500">{vehicle.state === 'driving' ? '주행 중' : '주차 중'}</span>
      </header>

      <section className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div
          className={`absolute left-3 top-3 h-3 w-3 rounded-full ${vehicle.ignitionOn ? 'bg-green-600' : 'bg-red-600'}`}
          aria-label={vehicle.ignitionOn ? 'ignition on' : 'ignition off'}
        />

        <div className="absolute right-3 top-2 font-bold text-slate-900">{vehicle.speed} km/h</div>

        <div className="absolute bottom-2 right-3 flex items-center gap-1.5">
          {vehicle.isEV ? (
            <div className="relative h-[18px] w-10 rounded border-2 border-slate-900">
              <div className="absolute -right-1 top-[4px] h-[10px] w-1 rounded bg-slate-900" />
              <div className="h-full rounded-sm bg-green-500" style={{ width: vehicle.fuelPercent + '%' }} />
            </div>
          ) : (
            <div>⛽</div>
          )}
          <span className="text-sm">{vehicle.fuelPercent}%</span>
        </div>

        <div className="flex items-center justify-center py-6">
          <img src="/alcha_logo.svg" alt="vehicle" className="w-4/5 max-w-[380px]" />
        </div>

        {vehicle.wheel && (
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>FL: {vehicle.wheel.FL}km/h</div>
            <div className="text-right">FR: {vehicle.wheel.FR}km/h</div>
            <div>RL: {vehicle.wheel.RL}km/h</div>
            <div className="text-right">RR: {vehicle.wheel.RR}km/h</div>
          </div>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2">
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
          <div key={k} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="font-semibold">{v}</div>
          </div>
        ))}
      </section>

      <FloatingNotifications />
      <PWABadge />
    </div>
  )
}

export default App
