// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import type { HttpBackendOptions } from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Define your namespaces
// It's good practice to have a 'common' namespace for shared translations (like "Save", "Cancel", "Error")
// And then module-specific namespaces.
export const namespaces = [
  'common',
  'login',
  'dashboard',
  'doctors',
  'navigation',
  'userMenu',
  'clinic',
  'permissions',
  'companies',
  'services',
  'payments',
  'schedules',
  'patients',
  'reports',
  'finances',
    'analysis',
  'shifts',
  'labTests',
  'labResults',
  'labWorkflow',
  'labWorkstation',
  'labQueue',
  'labSampleCollection',
] as const;
export type Namespace = typeof namespaces[number];

// Function to preload all namespaces for a language
const preloadNamespaces = async (language: string) => {
  const promises = namespaces.map(ns =>
    fetch(`/locales/${language}/${ns}.json`)
      .then(response => response.json())
      .catch(() => ({})) // Return empty object if namespace doesn't exist
  );
  const translations = await Promise.all(promises);
  namespaces.forEach((ns, index) => {
    i18n.addResourceBundle(language, ns, translations[index], true, true);
  });
};

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init<HttpBackendOptions>({
    lng: 'ar',
    fallbackLng: 'ar',
    ns: namespaces, // Load all namespaces by default
    defaultNS: 'common',
    debug: import.meta.env.DEV,
    
    interpolation: {
      escapeValue: false,
    },

    returnObjects: true, // Enable returnObjects for nested translations

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // React-i18next specific options
    react: {
      useSuspense: true,
    },

    // Preload settings
    preload: ['ar', 'en'], // Preload both Arabic and English
    load: 'currentOnly', // Only load current language
  });

// Function to set document direction and lang
const setDocumentDirection = (lng: string | undefined) => {
  const htmlTag = document.documentElement;
  if (lng) {
    htmlTag.lang = lng;
    htmlTag.dir = i18n.dir(lng);
  }
};

// Set initial direction
setDocumentDirection(i18n.language);

// Listen for language changes to update direction
i18n.on('languageChanged', (lng) => {
  setDocumentDirection(lng);
});

// Preload all namespaces for current language
preloadNamespaces(i18n.language);

export default i18n;