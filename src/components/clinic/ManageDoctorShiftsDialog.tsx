// src/components/clinic/ManageDoctorShiftsDialog.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, LogIn, LogOut } from 'lucide-react';

import { DoctorShift } from '@/types/doctors'; // Assuming DoctorShift type now includes basic doctor info + shift status
// Service functions to get doctors with their shift status, and to open/close shifts
// These would ideally be in a doctorShiftService.ts
import { getDoctorsWithShiftStatus, startDoctorShift, endDoctorShift } from '@/services/doctorShiftService'; // Create this service
import i18n from '@/i18n';

interface DoctorWithShiftStatus { // Type for the data returned by getDoctorsWithShiftStatus
  id: number; // Doctor ID
  name: string;
  specialist_name?: string | null;
  is_on_shift: boolean;
  current_doctor_shift_id?: number | null; // ID of the DoctorShift record if active
}

interface ManageDoctorShiftsDialogProps {
  triggerButton: React.ReactNode;
  currentClinicShiftId: number | null; // The ID of the general clinic shift
}

const ManageDoctorShiftsDialog: React.FC<ManageDoctorShiftsDialogProps> = ({ triggerButton, currentClinicShiftId }) => {
  const { t } = useTranslation(['clinic', 'common', 'doctors']);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const doctorsQueryKey = ['doctorsWithShiftStatus', debouncedSearchTerm];

  const { data: doctorsList, isLoading, isFetching } = useQuery<DoctorWithShiftStatus[], Error>({
    queryKey: doctorsQueryKey,
    queryFn: () => getDoctorsWithShiftStatus({ search: debouncedSearchTerm }), // Pass search to service
    enabled: isOpen, // Fetch only when dialog is open
  });

  const openShiftMutation = useMutation({
    mutationFn: (doctorId: number) => startDoctorShift({ 
        doctor_id: doctorId, 
        shift_id: currentClinicShiftId // Pass the general clinic shift ID
        // Add other necessary parameters for starting a shift if any
    }),
    onSuccess: () => {
      toast.success(t('clinic:doctorShifts.openedSuccess'));
      queryClient.invalidateQueries({ queryKey: doctorsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShifts'] }); // Invalidate DoctorsTabs query
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('clinic:doctorShifts.openError'));
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: (doctorShiftId: number) => endDoctorShift({ doctor_shift_id: doctorShiftId }),
    onSuccess: () => {
      toast.success(t('clinic:doctorShifts.closedSuccess'));
      queryClient.invalidateQueries({ queryKey: doctorsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShifts'] }); // Invalidate DoctorsTabs query
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('clinic:doctorShifts.closeError'));
    },
  });

  const handleOpenShift = (doctorId: number) => {
    if (!currentClinicShiftId) {
        toast.error(t('clinic:doctorShifts.noClinicShiftSelected')); // Or get current open clinic shift
        return;
    }
    openShiftMutation.mutate(doctorId);
  };

  const handleCloseShift = (doctorShiftId: number) => {
    closeShiftMutation.mutate(doctorShiftId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('clinic:doctorShifts.manageTitle')}</DialogTitle>
          <DialogDescription>{t('clinic:doctorShifts.manageDescription')}</DialogDescription>
        </DialogHeader>
        
        <div className="relative my-2">
          <Input
            type="search"
            placeholder={t('common:searchPlaceholder', "Search doctors...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10 rtl:pr-10"
          />
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {(isLoading || isFetching) && !doctorsList && (
            <div className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        )}
        {(!isLoading || doctorsList) && (
            <ScrollArea  className="h-[400px] flex-grow border rounded-md">
            {doctorsList && doctorsList.length > 0 ? (
                <Table style={{direction:i18n.dir()}}>
                <TableHeader>
                  <TableRow>
                  <TableHead className="text-center">{t('doctors:table.name')}</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">{t('doctors:table.specialist')}</TableHead>
                  <TableHead className="text-center">{t('clinic:doctorShifts.status')}</TableHead>
                  <TableHead className="text-center">{t('common:actions.openMenu')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorsList?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-center">{doc.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-center">{doc.specialist_name || '-'}</TableCell>
                    <TableCell className="text-center">
                    <Badge variant={doc.is_on_shift ? 'success' : 'outline'}>
                      {doc.is_on_shift ? t('clinic:doctorShifts.onShift') : t('clinic:doctorShifts.offShift')}
                    </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                    {doc.is_on_shift && doc.current_doctor_shift_id ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCloseShift(doc.current_doctor_shift_id!)}
                        disabled={closeShiftMutation.isPending && closeShiftMutation.variables === doc.current_doctor_shift_id}
                      >
                      {closeShiftMutation.isPending && closeShiftMutation.variables === doc.current_doctor_shift_id 
                        ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-1 rtl:ml-1" /> 
                        : <LogOut className="h-4 w-4 ltr:mr-1 rtl:ml-1"/>
                      }
                      {t('clinic:doctorShifts.closeShiftButton')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleOpenShift(doc.id)}
                        disabled={openShiftMutation.isPending && openShiftMutation.variables === doc.id || !currentClinicShiftId}
                      >
                      {openShiftMutation.isPending && openShiftMutation.variables === doc.id 
                        ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-1 rtl:ml-1" /> 
                        : <LogIn className="h-4 w-4 ltr:mr-1 rtl:ml-1"/>
                      }
                      {t('clinic:doctorShifts.openShiftButton')}
                      </Button>
                    )}
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    {searchTerm ? t('common:noResultsFound') : t('doctors:noDoctorsFound')}
                </div>
            )}
            </ScrollArea>
        )}
        
        <DialogFooter className="mt-auto pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('common:close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ManageDoctorShiftsDialog;