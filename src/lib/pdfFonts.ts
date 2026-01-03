// PDF Font Configuration for react-pdf/renderer
// Arabic font support using Amiri font from public/fonts/

import { Font } from '@react-pdf/renderer';

// Default font fallback
let currentFont = 'Helvetica';

// Track registered fonts
const registeredFonts = new Set<string>();
// Track font registration promises to avoid duplicate registrations
const fontRegistrationPromises = new Map<string, Promise<void>>();

// Export function to get current font
export const getAmiriFont = () => currentFont;
export const AMIRI_FONT = 'Amiri'; // Constant for use in StyleSheet
export const ARIAL_FONT = 'Arial'; // Constant for use in StyleSheet

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

// Register Amiri font for Arabic text support
export const registerAmiriFont = async (): Promise<void> => {
  if (registeredFonts.has('Amiri')) return;

  // If registration is already in progress, wait for it
  if (fontRegistrationPromises.has('Amiri')) {
    return fontRegistrationPromises.get('Amiri')!;
  }

  const registrationPromise = (async () => {
    try {
      // Load fonts from public/fonts/Amiri/ directory
      const regularResponse = await fetch('/fonts/Amiri/Amiri-Regular.ttf');
      const boldResponse = await fetch('/fonts/Amiri/Amiri-Bold.ttf');
      
      if (!regularResponse.ok || !boldResponse.ok) {
        throw new Error('Amiri font files not found in public/fonts/Amiri/');
      }
      
      const regularFontBuffer = await regularResponse.arrayBuffer();
      const boldFontBuffer = await boldResponse.arrayBuffer();
      
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

      registeredFonts.add('Amiri');
      console.log('Amiri font registered successfully');
    } catch (error) {
      console.error('Failed to register Amiri font:', error);
      console.warn('Using default Helvetica font. Make sure Amiri font files are in public/fonts/Amiri/');
      throw error;
    } finally {
      fontRegistrationPromises.delete('Amiri');
    }
  })();

  fontRegistrationPromises.set('Amiri', registrationPromise);
  return registrationPromise;
};

// Register Arial font
export const registerArialFont = async (): Promise<void> => {
  if (registeredFonts.has('Arial')) return;

  // If registration is already in progress, wait for it
  if (fontRegistrationPromises.has('Arial')) {
    return fontRegistrationPromises.get('Arial')!;
  }

  const registrationPromise = (async () => {
    try {
      // Load font from public/fonts/arial/ directory
      const arialResponse = await fetch('/fonts/arial/ARIAL.TTF');
      
      if (!arialResponse.ok) {
        throw new Error('Arial font file not found in public/fonts/arial/');
      }
      
      const arialFontBuffer = await arialResponse.arrayBuffer();
      const arialBase64 = arrayBufferToBase64(arialFontBuffer);
      
      // Register font using base64 data URL
      Font.register({
        family: 'Arial',
        fonts: [
          { src: `data:font/truetype;base64,${arialBase64}` },
          { src: `data:font/truetype;base64,${arialBase64}`, fontWeight: 'bold' },
        ],
      });

      registeredFonts.add('Arial');
      console.log('Arial font registered successfully');
    } catch (error) {
      console.error('Failed to register Arial font:', error);
      console.warn('Arial font file not found in public/fonts/arial/');
      throw error;
    } finally {
      fontRegistrationPromises.delete('Arial');
    }
  })();

  fontRegistrationPromises.set('Arial', registrationPromise);
  return registrationPromise;
};

// Register font based on font family name
export const registerFont = async (fontFamily: string): Promise<void> => {
  switch (fontFamily) {
    case 'Amiri':
      await registerAmiriFont();
      // Small delay to ensure font is fully registered
      await new Promise(resolve => setTimeout(resolve, 50));
      break;
    case 'Arial':
      await registerArialFont();
      // Small delay to ensure font is fully registered
      await new Promise(resolve => setTimeout(resolve, 50));
      break;
    // Helvetica, Times-Roman, and Courier are built-in fonts, no registration needed
    default:
      console.log(`Using built-in font: ${fontFamily}`);
  }
};

// Pre-register all custom fonts on page load to avoid delays
export const preRegisterAllFonts = async (): Promise<void> => {
  try {
    await Promise.all([
      registerAmiriFont().catch(() => {}), // Don't fail if one font fails
      registerArialFont().catch(() => {}),
    ]);
  } catch (error) {
    console.warn('Some fonts failed to pre-register:', error);
  }
};

// Pre-register all fonts on page load (for browser environment)
if (typeof window !== 'undefined') {
  // Use a small delay to ensure DOM is ready
  setTimeout(() => {
    preRegisterAllFonts();
  }, 100);
}

