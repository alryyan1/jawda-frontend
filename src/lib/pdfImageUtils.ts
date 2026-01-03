import { BACKEND_URL } from "../services/api";

/**
 * Convert image URL to base64 data URL for PDF rendering
 * @param url - Image URL
 * @returns Promise<string> - Base64 data URL
 */
export const imageUrlToBase64 = async (url: string): Promise<string> => {
  try {
    const fullUrl = url.startsWith("http")
      ? url
      : `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
    const response = await fetch(fullUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return url; // Fallback to original URL
  }
};

/**
 * Process PDF settings to convert image URLs to base64
 * @param settings - PDF settings object
 * @returns Promise<PdfSetting> - Settings with base64 image URLs
 */
export const processPdfSettingsImages = async (settings: any): Promise<any> => {
  const processed = { ...settings };

  if (settings.logo_base64) {
    processed.logo_url = settings.logo_base64;
  } else if (settings.logo_url) {
    try {
      processed.logo_url = await imageUrlToBase64(settings.logo_url);
    } catch (error) {
      console.error("Error processing logo url:", error);
    }
  } else if (settings.logo_path) {
    try {
      // If no URL but path exists, try to process path allowing it to be relative
      const processedPath = await imageUrlToBase64(settings.logo_path);
      processed.logo_path = processedPath;
      // Also set URL just in case components prefer it
      processed.logo_url = processedPath;
    } catch (error) {
      console.error("Error processing logo path:", error);
    }
  }

  if (settings.header_image_base64) {
    processed.header_image_url = settings.header_image_base64;
  } else if (settings.header_image_url) {
    try {
      processed.header_image_url = await imageUrlToBase64(
        settings.header_image_url
      );
    } catch (error) {
      console.error("Error processing header image url:", error);
    }
  } else if (settings.header_image_path) {
    try {
      const processedPath = await imageUrlToBase64(settings.header_image_path);
      processed.header_image_path = processedPath;
      processed.header_image_url = processedPath;
    } catch (error) {
      console.error("Error processing header image path:", error);
    }
  }

  return processed;
};


