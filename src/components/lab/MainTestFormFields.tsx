// src/components/lab/MainTestFormFields.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import AddContainerDialog from './AddContainerDialog';
import type { Container, Package   } from '@/types/labTests';
import AddPackageDialog from './AddPackageDialog';

interface MainTestFormValues {
  main_test_name: string;
  pack_id: string;
  pageBreak: boolean;
  container_id: string;
  price: string;
  divided: boolean;
  available: boolean;
}

interface MainTestFormFieldsProps {
  control: Control<MainTestFormValues>; // react-hook-form control object
  isLoadingData: boolean; // For disabling fields while parent data is loading
  isSubmitting: boolean;  // For disabling fields during main form submission
  containers: Container[] | undefined;
  isLoadingContainers: boolean;
  onContainerAdded: (newContainer: Container) => void;
  packages: Package[] | undefined; // NEW PROP
  isLoadingPackages: boolean; // NEW PROP
  onPackageAdded: (newPackage: Package) => void; // NEW PROP
}

const MainTestFormFields: React.FC<MainTestFormFieldsProps> = ({
  control,
  isLoadingData,
  isSubmitting,
  containers,
  isLoadingContainers,
  onContainerAdded,
  packages,
  isLoadingPackages,
  onPackageAdded,
}) => {
  const { t, i18n } = useTranslation(['labTests', 'common']);
  const disabled = isLoadingData || isSubmitting;

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="main_test_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('labTests:form.nameLabel')}</FormLabel>
            <FormControl><Input placeholder={t('labTests:form.namePlaceholder')} {...field} disabled={disabled} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('labTests:form.priceLabel')}</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder={t('labTests:form.pricePlaceholder')} {...field} value={field.value || ''} disabled={disabled} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
     {/* --- UPDATED pack_id FIELD --- */}
     <FormField
        control={control}
        name="pack_id" // This will store the selected package_id as a string
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('labTests:form.packIdLabel')}</FormLabel>
            <div className="flex items-center gap-2">
              <Select
                onValueChange={field.onChange}
                value={field.value || ""} // Handle undefined/null for placeholder
                defaultValue={field.value || ""}
                disabled={isLoadingPackages || disabled}
                dir={i18n.dir()}
              >
                <FormControl className="flex-grow">
                  <SelectTrigger>
                    <SelectValue placeholder={t('labTests:form.selectPackagePlaceholder', "Select a package...")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value=" ">{t('common:none')}</SelectItem> {/* Option for no package */}
                  {isLoadingPackages ? (
                    <SelectItem value="loading_pkg" disabled>{t('common:loading')}</SelectItem>
                  ) : (
                    packages?.map(pkg => (
                      <SelectItem key={pkg.id} value={String(pkg.id)}>{pkg.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <AddPackageDialog onPackageAdded={onPackageAdded} />
            </div>
            <FormDescription>{t('labTests:form.packIdDescription')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      </div>
      
      <FormField
        control={control}
        name="container_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('labTests:form.containerLabel')}</FormLabel>
            <div className="flex items-center gap-2">
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isLoadingContainers || disabled} dir={i18n.dir()}>
                <FormControl className="flex-grow">
                  <SelectTrigger><SelectValue placeholder={t('labTests:form.selectContainer')} /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingContainers ? <SelectItem value="loading_cont" disabled>{t('common:loading')}</SelectItem> :
                   containers?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.container_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <AddContainerDialog onContainerAdded={onContainerAdded} />
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-3 pt-2">
        <FormField
          control={control}
          name="pageBreak"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <FormLabel className="font-normal">{t('labTests:form.pageBreakLabel')}</FormLabel>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} /></FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="divided"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <FormLabel className="font-normal">{t('labTests:form.dividedLabel')}</FormLabel>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} /></FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="available"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <FormLabel className="font-normal">{t('labTests:form.availableLabel')}</FormLabel>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} /></FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default MainTestFormFields;