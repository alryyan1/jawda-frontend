// PDF Font Configuration for react-pdf/renderer
// Arabic font support using Amiri font from public/fonts/

import { Font } from '@react-pdf/renderer';

// Default font fallback
let currentFont = 'Helvetica';

// Export function to get current font
export const getAmiriFont = () => currentFont;
export const AMIRI_FONT = 'Amiri'; // Constant for use in StyleSheet

// Register Amiri font for Arabic text support
let fontRegistered = false;

export const registerAmiriFont = async () => {
  if (fontRegistered) return;

  try {
    // Load fonts from public/fonts/Amiri/ directory
    const regularResponse = await fetch('/fonts/Amiri/Amiri-Regular.ttf');
    const boldResponse = await fetch('/fonts/Amiri/Amiri-Bold.ttf');
    
    if (!regularResponse.ok || !boldResponse.ok) {
      throw new Error('Amiri font files not found in public/fonts/Amiri/');
    }
    
    const regularFontBuffer = await regularResponse.arrayBuffer();
    const boldFontBuffer = await boldResponse.arrayBuffer();
    
    // Convert ArrayBuffer to base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      return btoa(binary);
    };

    const regularBase64 = arrayBufferToBase64(regularFontBuffer);
    const boldBase64 = arrayBufferToBase64(boldFontBuffer);
    
    // Register fonts using base64 data URLs
    Font.register({
      family: 'Amiri',
      fonts: [
        { src: `data:font/truetype;base64,${regularBase64}` },
        { src: `data:font/truetype;base64,${boldBase64}`, fontWeight: 'bold' },
      ],
    });

    currentFont = 'Amiri';
    fontRegistered = true;
    console.log('Amiri font registered successfully');
  } catch (error) {
    console.error('Failed to register Amiri font:', error);
    console.warn('Using default Helvetica font. Make sure Amiri font files are in public/fonts/Amiri/');
    // Keep using Helvetica as fallback
  }
};

// Auto-register font on import (for browser environment)
if (typeof window !== 'undefined') {
  registerAmiriFont();
}

