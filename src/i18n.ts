// src/i18n.ts - Temporary i18n configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Simple fallback configuration to prevent errors
i18n
  .use(initReactI18next)
  .init({
    lng: 'ar',
    fallbackLng: 'ar',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      ar: {
        translation: {
          // Basic fallback translations
          loading: 'جار التحميل...',
          error: 'حدث خطأ',
          success: 'تم بنجاح',
          cancel: 'إلغاء',
          save: 'حفظ',
          delete: 'حذف',
          edit: 'تعديل',
          add: 'إضافة',
          search: 'بحث',
          previous: 'السابق',
          next: 'التالي',
          done: 'تم',
          close: 'إغلاق',
          confirm: 'تأكيد',
          yes: 'نعم',
          no: 'لا',
          // Add more basic translations as needed
        }
      }
    }
  });

export default i18n;
