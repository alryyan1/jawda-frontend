// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import type { HttpBackendOptions } from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Define your namespaces
// It's good practice to have a 'common' namespace for shared translations (like "Save", "Cancel", "Error")
// And then module-specific namespaces.
export const namespaces = ['common', 'login', 'dashboard', 'doctors', 'navigation', 'userMenu','clinic','permissions','companies'] as const;
export type Namespace = typeof namespaces[number];


i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init<HttpBackendOptions>({ // Specify HttpBackendOptions for type safety with loadPath
    lng: 'ar', // Optional: set a default language if LanguageDetector is not used or fails
    fallbackLng: 'ar', // Fallback language if a translation is missing
    
    // Define namespaces you want to load by default.
    // 'common' is a good candidate to load globally.
    // Other namespaces can be loaded on demand by components.
    ns: ['common', 'navigation', 'userMenu','login','clinic','permissions','companies'], // Namespaces to load initially
    defaultNS: 'common', // Default namespace to use if not specified in t() function

    debug: import.meta.env.DEV, // Enable debug output in development
    
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },

    backend: {
      // Path to load translations
      // {{lng}} will be replaced with the current language (e.g., 'en')
      // {{ns}} will be replaced with the namespace (e.g., 'common', 'login')
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // React-i18next specific options
    react: {
      useSuspense: true, // Recommended for new projects, allows Suspense for translations
      // wait: true, // Deprecated in favor of useSuspense
    }
  });
// Function to set document direction and lang
  const setDocumentDirection = (lng: string | undefined) => {
    const htmlTag = document.documentElement;
    if (lng) {
      htmlTag.lang = lng;
      if (i18n.dir(lng) === 'rtl') {
        htmlTag.dir = 'rtl';
      } else {
        htmlTag.dir = 'ltr';
      }
    }
  };

  // Set initial direction
  setDocumentDirection(i18n.language);

  // Listen for language changes to update direction
  i18n.on('languageChanged', (lng) => {
    setDocumentDirection(lng);
  });
export default i18n;