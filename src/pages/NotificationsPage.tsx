import { useMemo } from 'react'

type NotificationItem = {
  id: string
  createdAt: string
  title: string
  message: string
  level: 'info' | 'warning' | 'critical'
}

function NotificationsPage() {
  const items = useMemo<NotificationItem[]>(() => [
    { id: '1', createdAt: new Date().toISOString(), title: '엔진 점검 필요', message: '엔진 온도가 일시적으로 높았습니다.', level: 'warning' },
    { id: '2', createdAt: new Date(Date.now() - 3600_000).toISOString(), title: '타이어 압력 낮음', message: 'FL 타이어 압력이 기준치보다 낮습니다.', level: 'critical' },
  ], [])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px' }}>
      <h2 style={{ margin: '8px 0' }}>전체 알림</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((n) => (
          <li key={n.id} style={{
            display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12,
            padding: 12, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{n.title}</strong>
              <span style={{
                fontSize: 12,
                color: '#64748b',
                background: n.level === 'critical' ? '#fee2e2' : n.level === 'warning' ? '#fef3c7' : '#e5e7eb',
                borderRadius: 999, padding: '2px 8px'
              }}>{n.level}</span>
            </div>
            <div style={{ fontSize: 14 }}>{n.message}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(n.createdAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default NotificationsPage


