import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type VehicleContextValue = {
  vehicleId: string;
  setVehicleId: (vehicleId: string) => void;
};

const VehicleContext = createContext<VehicleContextValue | null>(null);

export function VehicleProvider({
  children,
  initialVehicleId = 'ABC1234',
}: PropsWithChildren<{ initialVehicleId?: string }>) {
  const [vehicleId, setVehicleIdState] = useState(initialVehicleId);

  const setVehicleId = useCallback((nextVehicleId: string) => {
    setVehicleIdState(prev => (prev === nextVehicleId ? prev : nextVehicleId));
  }, []);

  const value = useMemo(
    () => ({
      vehicleId,
      setVehicleId,
    }),
    [vehicleId, setVehicleId]
  );

  return (
    <VehicleContext.Provider value={value}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicle() {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicle must be used within a VehicleProvider');
  }
  return context;
}
