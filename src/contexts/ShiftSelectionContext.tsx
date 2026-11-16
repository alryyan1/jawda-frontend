import React, { createContext, useContext, useMemo, useState } from "react";
import type { Shift } from "@/types/shifts";

interface ShiftSelectionContextValue {
  selectedShift: Shift | null;
  setSelectedShift: (shift: Shift | null) => void;
}

const ShiftSelectionContext = createContext<ShiftSelectionContextValue | undefined>(undefined);

export const ShiftSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const value = useMemo(() => ({ selectedShift, setSelectedShift }), [selectedShift]);

  return (
    <ShiftSelectionContext.Provider value={value}>
      {children}
    </ShiftSelectionContext.Provider>
  );
};

export const useShiftSelection = (): ShiftSelectionContextValue => {
  const ctx = useContext(ShiftSelectionContext);
  if (!ctx) throw new Error("useShiftSelection must be used within ShiftSelectionProvider");
  return ctx;
};
