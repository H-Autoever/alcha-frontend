import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSSEConnect, {
  AlertData,
} from '@/hooks/useSSEConntect.ts';
import { useVehicle } from './VehicleContext.tsx';

type SSEContextValue = {
  periodicData: ReturnType<typeof useSSEConnect>['periodicData'];
  realtimeData: ReturnType<typeof useSSEConnect>['realtimeData'];
  alerts: AlertData[];
  status: ReturnType<typeof useSSEConnect>['status'];
  issue: ReturnType<typeof useSSEConnect>['issue'];
  recoveryAttempts: ReturnType<typeof useSSEConnect>['recoveryAttempts'];
  error: ReturnType<typeof useSSEConnect>['error'];
};

const SSEContext = createContext<SSEContextValue | null>(null);

const initialValue: SSEContextValue = {
  periodicData: null,
  realtimeData: null,
  alerts: [],
  status: 'connecting',
  issue: null,
  recoveryAttempts: 0,
  error: null,
};

export function SSEProvider({ children }: PropsWithChildren) {
  const { vehicleId } = useVehicle();

  const [state, setState] = useState<SSEContextValue>(initialValue);
  const resetRef = useRef(vehicleId);

  const sseState = useSSEConnect(vehicleId);

  const resetState = useCallback(() => {
    setState(initialValue);
  }, []);

  useEffect(() => {
    if (resetRef.current !== vehicleId) {
      resetRef.current = vehicleId;
      resetState();
    }
  }, [vehicleId, resetState]);

  useEffect(() => {
    setState({
      periodicData: sseState.periodicData,
      realtimeData: sseState.realtimeData,
      alerts: sseState.alerts,
      status: sseState.status,
      issue: sseState.issue,
      recoveryAttempts: sseState.recoveryAttempts,
      error: sseState.error,
    });
  }, [
    sseState.periodicData,
    sseState.realtimeData,
    sseState.alerts,
    sseState.status,
    sseState.issue,
    sseState.recoveryAttempts,
    sseState.error,
  ]);

  const value = useMemo(() => state, [state]);

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE must be used within an SSEProvider');
  }
  return context;
}
