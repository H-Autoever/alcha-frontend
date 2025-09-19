import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { items as alertItems } from '../mocks/alertHistory';
import { Notification } from '../types/Notification';

function NotificationsPage() {
  const navigate = useNavigate();

  const items = useMemo<Notification[]>(() => alertItems, []);

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
        <ul className='space-y-3'>
          {items.map(n => (
            <li
              key={n.id}
              className='flex flex-col gap-1 p-3 rounded-xl border border-h-sand bg-h-white shadow-sm'
            >
              <div className='flex justify-between items-center'>
                <strong className='text-gray-900'>{n.title}</strong>
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    n.level === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : n.level === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {n.level}
                </span>
              </div>
              <div className='text-sm text-gray-700'>{n.message}</div>
              <div className='text-xs text-h-grey'>
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default NotificationsPage;
