import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getPdfPreviewVisibleState, setPdfPreviewVisibleState } from '@/lib/pdf-preview-store';

interface PdfPreviewVisibilityContextType {
  isVisible: boolean;
  toggle: () => void;
}

const PdfPreviewVisibilityContext = createContext<PdfPreviewVisibilityContextType | undefined>(undefined);

export const PdfPreviewVisibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState<boolean>(getPdfPreviewVisibleState());

  // Listen for storage changes (in case it's changed in another tab/window)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pdfPreviewVisible') {
        setIsVisible(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggle = () => {
    const newState = !isVisible;
    setIsVisible(newState);
    setPdfPreviewVisibleState(newState);
  };

  return (
    <PdfPreviewVisibilityContext.Provider value={{ isVisible, toggle }}>
      {children}
    </PdfPreviewVisibilityContext.Provider>
  );
};

export const usePdfPreviewVisibility = (): PdfPreviewVisibilityContextType => {
  const context = useContext(PdfPreviewVisibilityContext);
  if (context === undefined) {
    throw new Error('usePdfPreviewVisibility must be used within a PdfPreviewVisibilityProvider');
  }
  return context;
};

