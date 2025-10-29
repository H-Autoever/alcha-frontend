import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertData } from '@/hooks/useSSEConntect';

type FloatingNotificationsProps = {
  alerts?: AlertData[];
};

function FloatingNotifications({ alerts = [] }: FloatingNotificationsProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const recent = useMemo(() => alerts.slice(0, 2), [alerts]);

  return (
    <>
      <button
        aria-label='notifications'
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: '#002c5f',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 20px rgba(0,0,0,.15)',
        }}
      >
        ?
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 84,
            width: 300,
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 30px rgba(0,0,0,.2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: '#002c5f',
              color: 'white',
              padding: '10px 12px',
              fontWeight: 600,
            }}
          >
            최근 알림
          </div>
          <div style={{ padding: 12 }}>
            {recent.length > 0 ? (
              recent.map(alert => (
                <div
                  key={`${alert.vehicle_id}-${alert.timestamp}`}
                  style={{ marginBottom: 8 }}
                >
                  <div style={{ fontWeight: 600 }}>{alert.alertType}</div>
                  <div style={{ fontSize: 14, color: '#334155' }}>
                    {alert.message}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
                새로운 알림이 없습니다.
              </div>
            )}
            <button
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
              style={{
                width: '100%',
                marginTop: 8,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                padding: '8px 12px',
                background: '#f1f5f9',
              }}
            >
              전체 알림 보러가기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingNotifications;
