// Minimal shim to satisfy imports of i18n/react-i18next during migration
export type TFunction = (key: string, defaultValueOrOpts?: any) => string;

export const i18n = {
  dir: () => 'rtl',
  language: 'ar',
};

export function useTranslation() {
  const t: TFunction = (key: string, def?: any) => {
    if (typeof def === 'string') return def;
    return key;
  };
  return { t, i18n } as const;
}

export default i18n;

