import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Patient } from '@/types/patients';
import type { DoctorShift } from '@/types/doctors';

export interface ClinicSelectionRequest {
  // Consumer should provide a handler to receive the selected patient+visit
  onSelect: (patient: Patient, visitId: number, doctorShift?: DoctorShift) => void;
}

interface ClinicSelectionContextValue {
  currentRequest: ClinicSelectionRequest | null;
  requestSelection: (req: ClinicSelectionRequest | null) => void;
}

const ClinicSelectionContext = createContext<ClinicSelectionContextValue | undefined>(undefined);

export const ClinicSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRequest, setCurrentRequest] = useState<ClinicSelectionRequest | null>(null);

  const requestSelection = useCallback((req: ClinicSelectionRequest | null) => {
    setCurrentRequest(req);
  }, []);

  const value = useMemo(() => ({ currentRequest, requestSelection }), [currentRequest, requestSelection]);

  return (
    <ClinicSelectionContext.Provider value={value}>
      {children}
    </ClinicSelectionContext.Provider>
  );
};

export const useClinicSelection = (): ClinicSelectionContextValue => {
  const ctx = useContext(ClinicSelectionContext);
  if (!ctx) throw new Error('useClinicSelection must be used within ClinicSelectionProvider');
  return ctx;
};


