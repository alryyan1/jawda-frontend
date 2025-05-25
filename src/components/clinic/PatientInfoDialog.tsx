// src/components/clinic/PatientInfoDialog.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, Phone, CalendarDays, MapPin, Building, IdCard, AlertTriangle, VenusAndMars } from 'lucide-react';
import type { Patient } from '@/types/patients';
import { getPatientById } from '@/services/patientService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '@radix-ui/react-scroll-area';

interface PatientInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number | null;
}

const DetailRowDialog: React.FC<{ label: string; value?: string | number | null; icon?: React.ElementType }> = 
({ label, value, icon: Icon }) => (
  <div className="grid grid-cols-[24px_1fr] items-start gap-3 py-2">
    {Icon ? (
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
    ) : (
      <div className="w-5"></div>
    )}
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground line-clamp-2">
        {value || <span className="text-muted-foreground">-</span>}
      </p>
    </div>
  </div>
);

const PatientInfoDialog: React.FC<PatientInfoDialogProps> = ({ isOpen, onOpenChange, patientId }) => {
  const { t, i18n } = useTranslation(['clinic', 'common', 'patients']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const { data: patient, isLoading, error } = useQuery<Patient, Error>({
    queryKey: ['patientDetails', patientId],
    queryFn: () => {
      if (!patientId) throw new Error("Patient ID is required.");
      return getPatientById(patientId);
    },
    enabled: !!patientId && isOpen,
  });

  const getAgeString = (p?: Patient | null): string => {
    if (!p) return t("common:notAvailable_short", "N/A");
    const parts = [];
    if (p.age_year !== null && p.age_year !== undefined) {
      parts.push(`${p.age_year}${t("common:years_shortInitial", "Y")}`);
    }
    if (p.age_month !== null && p.age_month !== undefined) {
      parts.push(`${p.age_month}${t("common:months_shortInitial", "M")}`);
    }
    if (p.age_day !== null && p.age_day !== undefined) {
      parts.push(`${p.age_day}${t("common:days_shortInitial", "D")}`);
    }
    return parts.length > 0 ? parts.join(" ") : t("common:notAvailable_short", "N/A");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl lg:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {t('patients:details.title')}
              </DialogTitle>
              {patient && (
                <DialogDescription className="text-sm text-muted-foreground">
                  {patient.name}
                </DialogDescription>
              )}
            </div>
            
          </div>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t('common:loading')}
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
            <div className="bg-destructive/10 p-3 rounded-full">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">
                {t('common:error.fetchFailed', { entity: t('patients:entityName') })}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                {error.message}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="mt-2"
            >
              {t('common:close')}
            </Button>
          </div>
        )}

        {patient && !isLoading && (
          <ScrollArea className="pr-3 -mx-6 px-6">
            <div style={{direction: i18n.dir()}} className="space-y-4 py-2">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">
                    {t('patients:details.personalInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <DetailRowDialog 
                      label={t('patients:fields.id')} 
                      value={patient.id} 
                      icon={IdCard}
                    />
                    <DetailRowDialog 
                      label={t('patients:fields.name')} 
                      value={patient.name} 
                    />
                    <DetailRowDialog 
                      label={t('common:gender')} 
                      value={t(`common:genderEnum.${patient.gender}`)} 
                      icon={VenusAndMars}
                    />
                  </div>
                  <div className="space-y-2">
                    <DetailRowDialog 
                      label={t('common:phone')} 
                      value={patient.phone} 
                      icon={Phone}
                    />
                    <DetailRowDialog 
                      label={t('common:age')} 
                      value={getAgeString(patient)} 
                      icon={CalendarDays}
                    />
                    <DetailRowDialog 
                      label={t('patients:fields.address')} 
                      value={patient.address} 
                      icon={MapPin}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {(patient.company || patient.insurance_no) && (
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">
                      {t('patients:details.insuranceInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {patient.company && (
                        <DetailRowDialog 
                          label={t('patients:fields.company')} 
                          value={patient.company.name} 
                          icon={Building}
                        />
                      )}
                      {patient.insurance_no && (
                        <DetailRowDialog 
                          label={t('patients:fields.insuranceNo')} 
                          value={patient.insurance_no}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      {patient.subcompany && (
                        <DetailRowDialog 
                          label={t('patients:fields.subCompany')} 
                          value={patient.subcompany.name}
                        />
                      )}
                      {patient.expire_date && (
                        <DetailRowDialog 
                          label={t('patients:fields.expiryDate')} 
                          value={format(parseISO(patient.expire_date), 'P', {locale: dateLocale})}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="min-w-[80px]">
              {t('common:close')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientInfoDialog;