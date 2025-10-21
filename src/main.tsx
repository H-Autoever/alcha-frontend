import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import NotificationsPage from './pages/NotificationsPage.tsx';
import { VehicleProvider } from './contexts/VehicleContext.tsx';
import { SSEProvider } from './contexts/SSEContext.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/notifications',
    element: <NotificationsPage />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VehicleProvider>
      <SSEProvider>
        <RouterProvider router={router} />
      </SSEProvider>
    </VehicleProvider>
  </StrictMode>
);
