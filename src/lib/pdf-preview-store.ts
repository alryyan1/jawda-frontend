// Helper functions to manage PDF preview visibility state in localStorage

const PDF_PREVIEW_VISIBLE_KEY: string = 'pdfPreviewVisible';

export const getPdfPreviewVisibleState = (): boolean => {
  try {
    const storedValue: string | null = localStorage.getItem(PDF_PREVIEW_VISIBLE_KEY);
    // Default to true (visible) if not set
    return storedValue === null ? true : storedValue === 'true';
  } catch {
    return true; // Default to visible if localStorage is not available
  }
};

export const setPdfPreviewVisibleState = (visible: boolean): void => {
  try {
    localStorage.setItem(PDF_PREVIEW_VISIBLE_KEY, String(visible));
  } catch {
    // Silently fail if localStorage is not available
  }
};

