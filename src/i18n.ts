// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import type { HttpBackendOptions } from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector'; // You already have this

// Define your namespaces (as before)
export const namespaces = [
  'common', 'login', 'dashboard', 'doctors', 'navigation', 'userMenu',
  'clinic', 'permissions', 'companies', 'services', 'payments', 'schedules',
  'patients', 'reports', 'finances', 'analysis', 'labTests', // Added labTests
  'labResults', // Added labResults
  'attendance', // Added attendance
  'settings',   // Added settings
  'filters',
  
  // Add other namespaces like 'review' if needed
] as const;
export type Namespace = typeof namespaces[number];

// ... (preloadNamespaces function as before) ...

i18n
  .use(HttpBackend)
  .use(LanguageDetector) // Add this BEFORE initReactI18next
  .use(initReactI18next)
  .init<HttpBackendOptions>({
    // lng: 'ar', // REMOVE this - LanguageDetector will handle initial language
    fallbackLng: 'ar', // Fallback if detector fails or language not found
    ns: namespaces,
    defaultNS: 'common',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // React-i18next specific options
    react: {
      useSuspense: true, // Keep true if you handle loading states well
    },

    // --- Language Detector Options ---
    detection: {
      // Order and look up Caches/Sources
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],

      // Keys or params to lookup language from
      lookupLocalStorage: 'i18nextLng', // This is the key we'll use in localStorage

      // Cache user language on
      caches: ['localStorage'], // Cache the language in localStorage
      // cookieMinutes: 10, // If using cookies
      // cookieDomain: 'myDomain'

      // optional htmlTag with lang attribute, the default is:
      htmlTag: document.documentElement,
    },
    // Preload settings (optional but can improve perceived performance)
    // preload: ['ar', 'en'], 
    // load: 'currentOnly',
  });

// Function to set document direction and lang
const setDocumentDirection = (lng: string | undefined) => {
  const htmlTag = document.documentElement;
  if (lng) {
    htmlTag.lang = lng;
    htmlTag.dir = i18n.dir(lng);
    // Optional: Add a class to body for global RTL/LTR styling if needed
    // document.body.classList.remove('rtl', 'ltr');
    // document.body.classList.add(i18n.dir(lng));
  }
};

// Set initial direction based on detected language
setDocumentDirection(i18n.language);

// Listen for language changes to update direction
i18n.on('languageChanged', (lng) => {
  setDocumentDirection(lng);
});

// Preload namespaces for the initially detected language (optional, but good for UX)
// You might want to call preloadNamespaces(i18n.language) here if you removed the preload array
// from init options or if you want to ensure all namespaces for the detected language are loaded ASAP.
// preloadNamespaces(i18n.language);

export default i18n;