import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type RecentNotification = {
  id: string
  title: string
  message: string
}

function FloatingNotifications() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const recent: RecentNotification[] = [
    { id: 'n1', title: '배터리 전압 낮음', message: '12.1V로 낮아졌습니다.' },
    { id: 'n2', title: '문 미닫힘', message: '좌측 뒷문이 완전히 닫히지 않았습니다.' },
  ]

  return (
    <>
      <button
        aria-label="notifications"
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', right: 16, bottom: 16,
          width: 56, height: 56, borderRadius: 28,
          background: '#002c5f', color: 'white', border: 'none',
          boxShadow: '0 10px 20px rgba(0,0,0,.15)'
        }}
      >
        ?
      </button>

      {open && (
        <div style={{
          position: 'fixed', right: 16, bottom: 84, width: 300,
          background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
          boxShadow: '0 10px 30px rgba(0,0,0,.2)', overflow: 'hidden'
        }}>
          <div style={{ background: '#002c5f', color: 'white', padding: '10px 12px', fontWeight: 600 }}>최근 알림</div>
          <div style={{ padding: 12 }}>
            {recent.map((r) => (
              <div key={r.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{r.title}</div>
                <div style={{ fontSize: 14, color: '#334155' }}>{r.message}</div>
              </div>
            ))}
            <button
              onClick={() => { setOpen(false); navigate('/notifications') }}
              style={{
                width: '100%', marginTop: 8, borderRadius: 8, border: '1px solid #cbd5e1',
                padding: '8px 12px', background: '#f1f5f9'
              }}
            >전체 알림 보러가기</button>
          </div>
        </div>
      )}
    </>
  )
}

export default FloatingNotifications


