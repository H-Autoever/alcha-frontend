import { Notification } from '@/types/Notification';

export const items: Notification[] = [
  {
    id: '1',
    createdAt: new Date().toISOString(),
    title: '엔진 점검 필요',
    message: '엔진 온도가 일시적으로 높았습니다.',
    level: 'warning',
  },
  {
    id: '2',
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    title: '타이어 압력 낮음',
    message: 'FL 타이어 압력이 기준치보다 낮습니다.',
    level: 'critical',
  },
  {
    id: '3',
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    title: '배터리 전압 낮음',
    message: '12.1V로 낮아졌습니다.',
    level: 'warning',
  },
  {
    id: '4',
    createdAt: new Date(Date.now() - 1800_000).toISOString(),
    title: '문 미닫힘',
    message: '좌측 뒷문이 완전히 닫히지 않았습니다.',
    level: 'info',
  },
];
