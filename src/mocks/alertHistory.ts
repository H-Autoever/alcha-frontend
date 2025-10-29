import { Notification } from '@/types/Notification';

export const items: Notification[] = [
  {
    vehicle_id: '1',
    timestamp: new Date().toISOString(),
    alertType: '엔진 점검 필요',
    message: '엔진 온도가 일시적으로 높았습니다.',
  },
  {
    vehicle_id: '2',
    timestamp: new Date(Date.now() - 3600_000).toISOString(),
    alertType: '타이어 압력 낮음',
    message: 'FL 타이어 압력이 기준치보다 낮습니다.',
  },
  {
    vehicle_id: '3',
    timestamp: new Date(Date.now() - 7200_000).toISOString(),
    alertType: '배터리 전압 낮음',
    message: '12.1V로 낮아졌습니다.',
  },
  {
    vehicle_id: '4',
    timestamp: new Date(Date.now() - 1800_000).toISOString(),
    alertType: '문 미닫힘',
    message: '좌측 뒷문이 완전히 닫히지 않았습니다.',
  },
];
