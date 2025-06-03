// src/pages/communication/BulkWhatsAppPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { DateRange } from 'react-day-picker';
import { Loader2, MessageSquare, Users, Filter, Play, Pause, StopCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

import type { PatientForBulkMessage, BulkMessageFilters, WhatsAppTemplateForBulk } from '@/types/whatsapp';
import type { DoctorStripped } from '@/types/doctors';
import type { Service } from '@/types/services';
import type { Specialist } from '@/types/doctors';
import { getDoctorsList } from '@/services/doctorService';
import { getServices } from '@/services/serviceService';
import { getSpecialistsList } from '@/services/doctorService';
import { fetchPatientsForBulkMessage } from '@/services/backendWhatsappService';
import { sendBackendWhatsAppText } from '@/services/backendWhatsappService';
import { useAuth } from '@/contexts/AuthContext';
import type { Setting } from '@/types/settings';
import { getSettings } from '@/services/settingService';

// Add missing type
interface FetchPatientsForBulkMessagePayload {
  date_from?: string;
  date_to?: string;
  doctor_id: string | null;
  service_id: string | null;
  specialist_id: string | null;
  unique_phones_only: boolean;
}

// Zod schema for the main form (filters + message)
const bulkMessageFormSchema = z.object({
  date_range: z.custom<DateRange>().optional(),
  doctor_id: z.string().optional(),
  service_id: z.string().optional(),
  specialist_id: z.string().optional(),
  unique_phones_only: z.boolean(),
  template_id: z.string().optional(),
  message_content: z.string().min(5, "Message too short").max(4096, "Message too long"),
  send_interval: z.number().min(5).max(60),
});

type BulkMessageFormValues = z.infer<typeof bulkMessageFormSchema>;

const getLocalizedTemplatesForBulk = (t: Function, clinicName?: string): WhatsAppTemplateForBulk[] => [
    { id: 'promo', nameKey: 'whatsapp:templates.promoName', contentKey: 'whatsapp:templates.promoContent' },
    { id: 'info', nameKey: 'whatsapp:templates.infoName', contentKey: 'whatsapp:templates.infoContent' },
];

const BulkWhatsAppPage: React.FC = () => {
  const { t, i18n } = useTranslation(['whatsapp', 'common', 'patients', 'doctors', 'services']);
  const { user: currentUser } = useAuth(); // Get current user for context
  const [fetchedPatients, setFetchedPatients] = useState<PatientForBulkMessage[]>([]);
  const [isFetchingPatients, setIsFetchingPatients] = useState(false);
  const [sendingProcess, setSendingProcess] = useState<{
    active: boolean;
    paused: boolean;
    currentIndex: number;
    totalToSend: number;
  }>({ active: false, paused: false, currentIndex: 0, totalToSend: 0 });
  const sendingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const form = useForm<BulkMessageFormValues>({
    resolver: zodResolver(bulkMessageFormSchema),
    defaultValues: {
      date_range: { from: subDays(new Date(), 30), to: new Date() },
      unique_phones_only: true,
      message_content: '',
      send_interval: 10,
    } as BulkMessageFormValues,
  });
  const { watch, setValue } = form;
  const selectedTemplateId = watch("template_id");

  const { data: appSettings } = useQuery<Setting | null, Error>({
    queryKey: ['appSettingsForWhatsAppBulk'],
    queryFn: getSettings,
    staleTime: 1000 * 60 * 60,
  });
  
  const clinicDisplayName = useMemo(() => appSettings?.hospital_name || appSettings?.lab_name || t('common:defaultClinicName'), [appSettings, t]);
  const templates = useMemo(() => getLocalizedTemplatesForBulk(t, clinicDisplayName), [t, clinicDisplayName]);


  const { data: doctors = [] } = useQuery<DoctorStripped[], Error>({
    queryKey: ['doctorsListForBulkWhatsApp'],
    queryFn: () => getDoctorsList({ active: true }),
  });
  const { data: services = [] } = useQuery<Service[], Error>({
    queryKey: ['servicesListForBulkWhatsApp'],
    queryFn: () => getServices(1, {per_page: 500, activate: true }).then(res => res.data),
  });
  const { data: specialists = [] } = useQuery<DoctorStripped[], Error>({ // Assuming Specialist type is similar to DoctorStripped
    queryKey: ['specialistsListForBulkWhatsApp'],
    queryFn: getSpecialistsList,
  });

  const sendTextMutation = useMutation({
    mutationFn: (payload: { patientId: number, message: string}) => 
        sendBackendWhatsAppText({ patient_id: payload.patientId, message: payload.message }),
    // onSuccess and onError will be handled per-patient in the sending loop
  });

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        let content = t(template.contentKey, { 
            // Provide generic placeholders or indicate they need manual filling
            patientName: "{{patientName}}", 
            clinicName: clinicDisplayName,
            // You might add more default values if your templates consistently use them
        });
        setValue('message_content', content);
      }
    }
  }, [selectedTemplateId, templates, setValue, t, clinicDisplayName]);

  const handleFetchPatients = async (data: BulkMessageFormValues) => {
    setIsFetchingPatients(true);
    setFetchedPatients([]);
    try {
      const filters: FetchPatientsForBulkMessagePayload = {
        date_from: data.date_range?.from ? format(data.date_range.from, 'yyyy-MM-dd') : undefined,
        date_to: data.date_range?.to ? format(data.date_range.to, 'yyyy-MM-dd') : undefined,
        doctor_id: data.doctor_id || null,
        service_id: data.service_id || null,
        specialist_id: data.specialist_id || null,
        unique_phones_only: data.unique_phones_only,
      };
      const result = await fetchPatientsForBulkMessage(filters);
      setFetchedPatients(result.map(p => ({ ...p, isSelected: true, sendStatus: 'idle' })));
      toast.success(t('whatsapp:bulk.patientsFetched', { count: result.length }));
    } catch (error: any) {
      toast.error(t('common:error.fetchFailed'), { description: error.message });
    } finally {
      setIsFetchingPatients(false);
    }
  };

  const togglePatientSelection = (patientId: number) => {
    setFetchedPatients(prev => prev.map(p => p.id === patientId ? { ...p, isSelected: !p.isSelected } : p));
  };

  const toggleSelectAllPatients = (checked: boolean) => {
    setFetchedPatients(prev => prev.map(p => ({ ...p, isSelected: checked })));
  };
  
  const startSendingProcess = () => {
    const patientsToSend = fetchedPatients.filter(p => p.isSelected && p.sendStatus !== 'sent');
    if (patientsToSend.length === 0) {
      toast.info(t('whatsapp:bulk.noPatientsSelectedToSend'));
      return;
    }
    if (!form.getValues('message_content').trim()) {
        form.setError('message_content', { type: 'manual', message: t('common:validation.requiredFieldNoContext') });
        return;
    }

    setSendingProcess({ active: true, paused: false, currentIndex: 0, totalToSend: patientsToSend.length });
    // Actual sending will be handled by useEffect watching `sendingProcess`
  };

  const pauseSendingProcess = () => setSendingProcess(prev => ({ ...prev, paused: true }));
  const resumeSendingProcess = () => setSendingProcess(prev => ({ ...prev, paused: false }));
  const stopSendingProcess = () => {
    if (sendingIntervalRef.current) clearTimeout(sendingIntervalRef.current);
    setSendingProcess({ active: false, paused: false, currentIndex: 0, totalToSend: 0 });
    // Optionally reset sendStatus for non-sent items
    setFetchedPatients(prev => prev.map(p => p.sendStatus === 'sending' ? {...p, sendStatus: 'idle'} : p));
  };

  useEffect(() => {
    if (sendingProcess.active && !sendingProcess.paused) {
      const patientsToSend = fetchedPatients.filter(p => p.isSelected && p.sendStatus !== 'sent');
      
      if (sendingProcess.currentIndex < patientsToSend.length) {
        const currentPatientTarget = patientsToSend[sendingProcess.currentIndex];
        
        setFetchedPatients(prev => prev.map(p => 
            p.id === currentPatientTarget.id ? { ...p, sendStatus: 'sending' } : p
        ));

        let finalMessage = form.getValues('message_content');
        finalMessage = finalMessage.replace(/{{patientName}}/gi, currentPatientTarget.name);
        // Add more placeholder replacements as needed

        sendingIntervalRef.current = setTimeout(async () => {
          try {
            await sendTextMutation.mutateAsync({ patientId: currentPatientTarget.id, message: finalMessage });
            setFetchedPatients(prev => prev.map(p => 
              p.id === currentPatientTarget.id ? { ...p, sendStatus: 'sent', sendError: undefined } : p
            ));
          } catch (error: any) {
            setFetchedPatients(prev => prev.map(p => 
              p.id === currentPatientTarget.id ? { ...p, sendStatus: 'failed', sendError: error.message || t('common:error.generic') } : p
            ));
          } finally {
            if (sendingProcess.active) { // Check if process wasn't stopped
                setSendingProcess(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
            }
          }
        }, (form.getValues('send_interval') || 10) * 1000);

      } else { // All selected patients processed
        toast.success(t('whatsapp:bulk.sendingProcessCompleted'));
        setSendingProcess({ active: false, paused: false, currentIndex: 0, totalToSend: 0 });
      }
    }
    return () => {
      if (sendingIntervalRef.current) clearTimeout(sendingIntervalRef.current);
    };
  }, [sendingProcess, fetchedPatients, form, sendTextMutation, t]);


  const selectedCount = useMemo(() => fetchedPatients.filter(p => p.isSelected).length, [fetchedPatients]);
  const successfullySentCount = useMemo(() => fetchedPatients.filter(p => p.sendStatus === 'sent').length, [fetchedPatients]);

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-8 w-8 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('whatsapp:bulk.pageTitle')}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFetchPatients as any)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('whatsapp:bulk.filtersTitle')}</CardTitle>
              <CardDescription>{t('whatsapp:bulk.filtersDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control as any}
                name="date_range"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('common:dateRange')}</FormLabel>
                    <DatePickerWithRange date={field.value} onDateChange={field.onChange} align="start" />
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="doctor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common:doctor')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common:selectDoctorPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">{t('common:allDoctors')}</SelectItem>
                        {doctors.map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField control={form.control as any} name="service_id" render={({ field }) => (
                <FormItem><FormLabel>{t('services:serviceEntityName')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder={t('services:selectServicePlaceholder')} /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="">{t('services:allServices')}</SelectItem>{services.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage/></FormItem>
              )}/>
              <FormField control={form.control as any} name="specialist_id" render={({ field }) => (
                <FormItem><FormLabel>{t('doctors:specialist')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder={t('doctors:selectSpecialistPlaceholder')} /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="">{t('doctors:allSpecialists')}</SelectItem>{specialists.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage/></FormItem>
              )}/>
              <FormField control={form.control as any} name="unique_phones_only" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 rtl:space-x-reverse pt-7"><FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange}/>
                </FormControl><FormLabel className="font-normal">{t('whatsapp:bulk.uniquePhonesOnly')}</FormLabel></FormItem>
              )}/>
              <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                <Button type="submit" className="w-full sm:w-auto" disabled={isFetchingPatients}>
                  {isFetchingPatients && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/>}
                  <Users className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('whatsapp:bulk.fetchPatientsButton')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {fetchedPatients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('whatsapp:bulk.messageCompositionTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control as any} name="template_id" render={({ field }) => (
                    <FormItem><FormLabel>{t('clinic:visit.whatsAppDialog.selectTemplate')}</FormLabel>
                    <Select onValueChange={(val) => {field.onChange(val); setValue('message_content', templates.find(t=>t.id===val)?.contentKey ? t(templates.find(t=>t.id===val)!.contentKey, {patientName: '{{patientName}}', clinicName: clinicDisplayName}) : '')}} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('clinic:visit.whatsAppDialog.templatePlaceholder')} /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="">{t('whatsapp:noTemplate')}</SelectItem>{templates.map(tpl => <SelectItem key={tpl.id} value={tpl.id}>{t(tpl.nameKey)}</SelectItem>)}</SelectContent>
                    </Select></FormItem>
                )}/>
                <FormField control={form.control as any} name="message_content" render={({ field }) => (
                    <FormItem><FormLabel>{t('whatsapp:bulk.messageContentLabel')}</FormLabel><FormControl><Textarea {...field} rows={5} placeholder={t('whatsapp:bulk.messagePlaceholder')} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control as any} name="send_interval" render={({ field }) => (
                    <FormItem className="max-w-xs"><FormLabel>{t('whatsapp:bulk.sendIntervalLabel')}</FormLabel>
                    <div className="flex items-center gap-2">
                        <FormControl><Input type="number" min="5" max="60" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="w-20"/></FormControl> 
                        <span>{t('common:seconds')}</span>
                    </div>
                    <FormMessage /></FormItem>
                )}/>
              </CardContent>
            </Card>
          )}

          {fetchedPatients.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle>{t('whatsapp:bulk.patientListTitle', { count: fetchedPatients.length })}</CardTitle>
                  <CardDescription>{t('whatsapp:bulk.selectPatientsToSend')}</CardDescription>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox 
                        id="selectAllPatients" 
                        checked={fetchedPatients.length > 0 && fetchedPatients.every(p => p.isSelected)}
                        onCheckedChange={(checked) => toggleSelectAllPatients(!!checked)}
                    />
                    <Label htmlFor="selectAllPatients" className="text-sm font-normal">{t('common:selectAll')}</Label>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>{t('patients:fields.name')}</TableHead><TableHead>{t('common:phone')}</TableHead><TableHead className="text-center">{t('common:status')}</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {fetchedPatients.map(p => (
                        <TableRow key={p.id} className={p.sendStatus === 'sending' ? 'bg-blue-500/10' : ''}>
                          <TableCell><Checkbox checked={p.isSelected} onCheckedChange={() => togglePatientSelection(p.id)} /></TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.phone}</TableCell>
                          <TableCell className="text-center">
                            {p.sendStatus === 'sending' && <Loader2 className="h-4 w-4 animate-spin text-blue-500 mx-auto"/>}
                            {p.sendStatus === 'sent' && <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto"/>}
                            {p.sendStatus === 'failed' && 
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild><XCircle className="h-4 w-4 text-destructive mx-auto cursor-help"/></TooltipTrigger>
                                        <TooltipContent><p>{p.sendError || t('common:error.generic')}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            }
                            {p.sendStatus === 'idle' && <span className="text-xs text-muted-foreground">-</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-3">
                {sendingProcess.active && (
                    <Progress value={(sendingProcess.currentIndex / sendingProcess.totalToSend) * 100} className="w-full h-2"/>
                )}
                <div className="text-sm text-muted-foreground">
                    {t('whatsapp:bulk.selectedForSending', { count: selectedCount })} | {t('whatsapp:bulk.successfullySent', { count: successfullySentCount })}
                    {sendingProcess.active && ` | ${t('whatsapp:bulk.processing')} ${sendingProcess.currentIndex} / ${sendingProcess.totalToSend}`}
                </div>
                <div className="flex gap-2 justify-end">
                    {!sendingProcess.active ? (
                        <Button onClick={startSendingProcess} disabled={selectedCount === 0 || sendTextMutation.isPending}>
                            <Play className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('whatsapp:bulk.startSendingButton')}
                        </Button>
                    ) : sendingProcess.paused ? (
                        <Button onClick={resumeSendingProcess} variant="outline"><Play className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('common:resume')}</Button>
                    ) : (
                        <Button onClick={pauseSendingProcess} variant="outline"><Pause className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('common:pause')}</Button>
                    )}
                    {sendingProcess.active && (
                        <Button onClick={stopSendingProcess} variant="destructive"><StopCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('common:stop')}</Button>
                    )}
                </div>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
};
export default BulkWhatsAppPage;