import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useVehicle } from '@/contexts/VehicleContext.tsx';
import { Notification } from '@/types/Notification';

const apiURL = import.meta.env.VITE_API_SERVER_URL;

function NotificationsPage() {
  const navigate = useNavigate();
  const { vehicleId } = useVehicle();
  const [history, setHistory] = useState<Notification[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiURL) {
      setHistory([]);
      setHistoryError('API 서버 URL이 설정되지 않았습니다.');
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchHistory = async () => {
      setIsHistoryLoading(true);
      setHistoryError(null);
      setHistory([]);
      try {
        const response = await fetch(
          `${apiURL}/api/vehicles/${encodeURIComponent(vehicleId)}/alerts`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch alert history (${response.status})`
          );
        }
        const data = (await response.json()) as Notification[];
        if (!cancelled) {
          setHistory(data);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Failed to fetch alert history', error);
        if (!cancelled) {
          setHistoryError(
            error instanceof Error ? error.message : '알림 히스토리 조회 실패'
          );
        }
      } finally {
        if (!cancelled) {
          setIsHistoryLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [vehicleId, apiURL]);

  return (
    <div className='max-w-xl mx-auto'>
      {/* Header */}
      <header className='fixed inset-x-0 top-0 bg-h-blue shadow-sm flex items-center px-2 py-4'>
        <button
          className='text-h-white hover:bg-white/10 rounded-lg px-2 py-1'
          onClick={() => navigate('/')}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className='flex-1 pr-9 text-lg text-h-white font-bold text-center'>
          전체 알림
        </h2>
      </header>

      {/* Content */}
      <main className='mx-auto max-w-xl px-4 pt-20 pb-10'>
        {isHistoryLoading && history.length === 0 && (
          <div className='mb-4 text-center text-sm text-slate-500'>
            알림을 불러오는 중입니다...
          </div>
        )}
        {historyError && (
          <div className='mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600'>
            알림 히스토리를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        )}
        {history.length === 0 && !isHistoryLoading && !historyError ? (
          <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500'>
            저장된 알림이 없습니다.
          </div>
        ) : (
          <ul className='space-y-3'>
            {history.map(n => (
              <li
                key={`${n.vehicle_id}-${n.timestamp}`}
                className='flex flex-col gap-1 p-3 rounded-xl border border-h-sand bg-h-white shadow-sm'
              >
                <div className='flex justify-between items-center'>
                  <strong className='text-gray-900'>{n.alertType}</strong>
                </div>
                <div className='text-sm text-gray-700'>{n.message}</div>
                <div className='text-xs text-h-grey'>
                  {new Date(n.timestamp).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default NotificationsPage;
