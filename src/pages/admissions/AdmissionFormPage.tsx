import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { ArrowRight, Plus } from 'lucide-react';
import type { AdmissionFormData } from '@/types/admissions';
import { createAdmission } from '@/services/admissionService';
import { getWardsList } from '@/services/wardService';
import { getRooms } from '@/services/roomService';
import { getAvailableBeds } from '@/services/bedService';
import { searchExistingPatients, registerNewPatient } from '@/services/patientService';
import { getDoctorsList } from '@/services/doctorService';
import type { PatientSearchResult, PatientFormData } from '@/types/patients';

type AdmissionFormValues = {
  patient_id: string;
  ward_id: string;
  room_id: string;
  bed_id: string;
  admission_date: Date | null;
  admission_time: string;
  admission_type: string;
  admission_reason: string;
  diagnosis: string;
  doctor_id: string;
  specialist_doctor_id: string;
  notes: string;
  provisional_diagnosis: string;
  operations: string;
};

export default function AdmissionFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);
  const [quickAddFormData, setQuickAddFormData] = useState({
    name: '',
    phone: '',
    gender: '' as 'male' | 'female' | '',
    age_year: '',
    age_month: '',
    age_day: '',
    income_source: '',
    social_status: '',
  });

  const { data: wards } = useQuery({
    queryKey: ['wardsList'],
    queryFn: () => getWardsList({ status: true }),
  });

  const { data: rooms, refetch: refetchRooms } = useQuery({
    queryKey: ['rooms', selectedWardId],
    queryFn: () => getRooms(1, { ward_id: selectedWardId!, per_page: 1000 }).then(res => res.data),
    enabled: !!selectedWardId,
  });

  const { data: beds, refetch: refetchBeds } = useQuery({
    queryKey: ['availableBeds', selectedRoomId],
    queryFn: () => getAvailableBeds({ room_id: selectedRoomId! }),
    enabled: !!selectedRoomId,
  });

  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  const [specialistDoctorSearchTerm, setSpecialistDoctorSearchTerm] = useState("");

  const { data: doctors } = useQuery({
    queryKey: ['doctorsList'],
    queryFn: () => getDoctorsList({ active: true }),
  });

  const { data: patientSearchResults, isLoading: isSearchingPatients } = useQuery({
    queryKey: ['patientSearch', patientSearchTerm],
    queryFn: () => searchExistingPatients(patientSearchTerm),
    enabled: patientSearchTerm.length >= 2,
  });

  const form = useForm<AdmissionFormValues>({
    defaultValues: {
      patient_id: '',
      ward_id: '',
      room_id: '',
      bed_id: '',
      admission_date: new Date(),
      admission_time: new Date().toTimeString().slice(0, 5),
      admission_type: '',
      admission_reason: '',
      diagnosis: '',
      doctor_id: '',
      specialist_doctor_id: '',
      notes: '',
      provisional_diagnosis: '',
      operations: '',
    },
  });
  const { control, handleSubmit, watch, setValue } = form;

  const wardId = watch('ward_id');
  const roomId = watch('room_id');

  useEffect(() => {
    if (wardId) {
      setSelectedWardId(Number(wardId));
      setValue('room_id', '');
      setValue('bed_id', '');
      refetchRooms();
    }
  }, [wardId, setValue, refetchRooms]);

  useEffect(() => {
    if (roomId) {
      setSelectedRoomId(Number(roomId));
      setValue('bed_id', '');
      refetchBeds();
    }
  }, [roomId, setValue, refetchBeds]);

  const mutation = useMutation({
    mutationFn: (data: AdmissionFormData) => createAdmission(data),
    onSuccess: () => {
      toast.success('تم إضافة التنويم بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      navigate('/admissions/list');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'فشل إضافة التنويم';
      const errorDetails = error.response?.data?.errors;
      
      if (errorDetails?.patient_id) {
        toast.error('خطأ في بيانات المريض', {
          description: 'يرجى التأكد من اختيار مريض صحيح أو إنشاء مريض جديد'
        });
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const quickAddPatientMutation = useMutation({
    mutationFn: async (data: Partial<PatientFormData>) => {
      // Get first available doctor and shift for quick registration
      const firstDoctor = doctors?.[0];
      if (!firstDoctor) {
        throw new Error('لا يوجد أطباء متاحين');
      }
      
      // Create minimal patient data - backend should handle shift assignment
      const patientData: PatientFormData = {
        name: data.name!,
        phone: data.phone!,
        gender: data.gender as 'male' | 'female',
        age_year: data.age_year ? Number(data.age_year) : null,
        age_month: data.age_month ? Number(data.age_month) : null,
        age_day: data.age_day ? Number(data.age_day) : null,
        doctor_id: firstDoctor.id,
        doctor_shift_id: 1, // Default shift - backend may override
        income_source: data.income_source || null,
        social_status: (data.social_status as 'single' | 'married' | 'widowed' | 'divorced' | null) || null,
      };
      
      return registerNewPatient(patientData);
    },
    onSuccess: (patient) => {
      toast.success('تم إضافة المريض بنجاح');
      // Convert patient to PatientSearchResult format and select it
      const patientResult: PatientSearchResult = {
        id: patient.id,
        name: patient.name,
        phone: patient.phone || null,
        gender: patient.gender,
        age_year: patient.age_year || null,
      };
      setSelectedPatient(patientResult);
      setValue('patient_id', String(patient.id));
      setQuickAddDialogOpen(false);
      setQuickAddFormData({
        name: '',
        phone: '',
        gender: '',
        age_year: '',
        age_month: '',
        age_day: '',
        income_source: '',
        social_status: '',
      });
      queryClient.invalidateQueries({ queryKey: ['patientSearch'] });
    },
    onError: () => {
      // Error handling is commented out as per user preference
    },
  });

  const handleQuickAddSubmit = () => {
    if (!quickAddFormData.name || !quickAddFormData.phone || !quickAddFormData.gender) {
      toast.error('يرجى إدخال الاسم والهاتف والنوع');
      return;
    }
    // Convert form data to PatientFormData format
    const patientData: PatientFormData = {
      name: quickAddFormData.name,
      phone: quickAddFormData.phone,
      gender: quickAddFormData.gender as 'male' | 'female',
      age_year: quickAddFormData.age_year ? Number(quickAddFormData.age_year) : null,
      age_month: quickAddFormData.age_month ? Number(quickAddFormData.age_month) : null,
      age_day: quickAddFormData.age_day ? Number(quickAddFormData.age_day) : null,
      income_source: quickAddFormData.income_source || null,
      social_status: (quickAddFormData.social_status as 'single' | 'married' | 'widowed' | 'divorced' | null) || null,
      doctor_id: doctors?.[0]?.id,
      doctor_shift_id: 1,
    };
    quickAddPatientMutation.mutate(patientData);
  };

  const onSubmit = (data: AdmissionFormValues) => {
    if (!selectedPatient) return toast.error('يرجى اختيار المريض');
    if (!data.ward_id) return toast.error('يرجى اختيار القسم');
    if (!data.room_id) return toast.error('يرجى اختيار الغرفة');
    if (!data.bed_id) return toast.error('يرجى اختيار السرير');
    if (!data.admission_date) return toast.error('يرجى اختيار تاريخ التنويم');

    // Convert time from HH:mm to H:i:s format
    let formattedTime: string | null = null;
    if (data.admission_time) {
      // If time is in HH:mm format, add :00 for seconds
      if (data.admission_time.length === 5) {
        formattedTime = `${data.admission_time}:00`;
      } else if (data.admission_time.length === 8) {
        // Already in H:i:s format
        formattedTime = data.admission_time;
      } else {
        formattedTime = data.admission_time;
      }
    }

    const submissionData: AdmissionFormData = {
      patient_id: String(selectedPatient.id),
      ward_id: data.ward_id,
      room_id: data.room_id,
      bed_id: data.bed_id,
      admission_date: data.admission_date,
      admission_time: formattedTime,
      admission_type: data.admission_type || null,
      admission_reason: data.admission_reason || null,
      diagnosis: data.diagnosis || null,
      doctor_id: data.doctor_id || undefined,
      specialist_doctor_id: data.specialist_doctor_id || undefined,
      notes: data.notes || null,
      provisional_diagnosis: data.provisional_diagnosis || null,
      operations: data.operations || null,
    };

    mutation.mutate(submissionData);
  };

  return (
    <Card className="max-w-5xl mx-auto h-full flex flex-col">
      <CardHeader sx={{ flexShrink: 0, pb: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            onClick={() => navigate(-1)}
            variant="outlined"
            size="small"
            startIcon={<ArrowRight />}
            sx={{ minWidth: 'auto' }}
          >
            رجوع
          </Button>
          <Typography variant="h6">إضافة تنويم جديد</Typography>
        </Box>
      </CardHeader>
      <CardContent sx={{ flex: 1, overflowY: 'auto', pb: 2, pt: 2 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Patient Selection - Full Width */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
              معلومات المريض
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Autocomplete
                  options={patientSearchResults || []}
                  getOptionLabel={(option) => `${option.name} - ${option.phone || ''}`}
                  loading={isSearchingPatients}
                  value={selectedPatient}
                  onInputChange={(_, value) => setPatientSearchTerm(value)}
                  onChange={(_, value) => {
                    setSelectedPatient(value);
                    if (value) setValue('patient_id', String(value.id));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="البحث عن المريض" placeholder="ابدأ بكتابة اسم أو رقم هاتف المريض" />
                  )}
                />
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Plus size={16} />}
                onClick={() => setQuickAddDialogOpen(true)}
                sx={{ 
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  mt: 0.5,
                  height: '56px'
                }}
                disabled={mutation.isPending}
              >
                إضافة مريض جديد
              </Button>
            </Box>
          </Box>

          {/* Location Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
              الموقع (القسم - الغرفة - السرير)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
              <Controller name="ward_id" control={control} rules={{ required: 'القسم مطلوب' }} render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error}>
                  <InputLabel>القسم</InputLabel>
                  <Select {...field} label="القسم" disabled={mutation.isPending}>
                    {wards?.map((ward) => (
                      <MenuItem key={ward.id} value={String(ward.id)}>{ward.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )} />

              <Controller name="room_id" control={control} rules={{ required: 'الغرفة مطلوبة' }} render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error} disabled={!selectedWardId || mutation.isPending}>
                  <InputLabel>الغرفة</InputLabel>
                  <Select {...field} label="الغرفة">
                    {rooms?.map((room) => {
                      const roomTypeLabel = room.room_type === 'normal' ? 'عادي' : room.room_type === 'vip' ? 'VIP' : '';
                      const roomTypeDisplay = roomTypeLabel ? ` (${roomTypeLabel})` : '';
                      return (
                        <MenuItem key={room.id} value={String(room.id)}>
                          {room.room_number}{roomTypeDisplay}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )} />

              <Controller name="bed_id" control={control} rules={{ required: 'السرير مطلوب' }} render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error} disabled={!selectedRoomId || mutation.isPending}>
                  <InputLabel>السرير</InputLabel>
                  <Select {...field} label="السرير">
                    {beds?.map((bed) => (
                      <MenuItem key={bed.id} value={String(bed.id)}>{bed.bed_number}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )} />
            </Box>
          </Box>

          {/* Admission Details Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
              تفاصيل التنويم
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
              <Controller name="admission_date" control={control} rules={{ required: 'تاريخ التنويم مطلوب' }} render={({ field, fieldState }) => (
                <TextField
                  fullWidth
                  label="تاريخ التنويم"
                  type="date"
                  value={field.value ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={mutation.isPending}
                />
              )} />
              <Controller name="admission_time" control={control} render={({ field }) => (
                <TextField
                  fullWidth
                  label="وقت التنويم"
                  type="time"
                  {...field}
                  InputLabelProps={{ shrink: true }}
                  disabled={mutation.isPending}
                />
              )} />
              <Controller name="admission_type" control={control} render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>نوع الإقامة</InputLabel>
                  <Select {...field} label="نوع الإقامة" disabled={mutation.isPending}>
                    <MenuItem value="اقامه قصيره">إقامة قصيرة</MenuItem>
                    <MenuItem value="اقامه طويله">إقامة طويلة</MenuItem>
                  </Select>
                </FormControl>
              )} />
            </Box>
          </Box>

          {/* Medical Information Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
              المعلومات الطبية
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
              <Controller name="admission_reason" control={control} render={({ field }) => (
                <TextField fullWidth label="سبب التنويم" multiline rows={2} size="small" {...field} disabled={mutation.isPending} />
              )} />
              <Controller name="diagnosis" control={control} render={({ field }) => (
                <TextField fullWidth label="التشخيص الطبي" multiline rows={2} size="small" {...field} disabled={mutation.isPending} />
              )} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mt: 1.5 }}>
              <Controller name="provisional_diagnosis" control={control} render={({ field }) => (
                <TextField 
                  fullWidth 
                  label="التشخيص المؤقت" 
                  multiline 
                  rows={2} 
                  size="small"
                  {...field} 
                  disabled={mutation.isPending}
                  placeholder="أدخل التشخيص المؤقت..."
                />
              )} />
              <Controller name="operations" control={control} render={({ field }) => (
                <TextField 
                  fullWidth 
                  label="العمليات (مع التواريخ)" 
                  multiline 
                  rows={2} 
                  size="small"
                  {...field} 
                  disabled={mutation.isPending}
                  placeholder="اسم العملية - التاريخ (مثال: عملية القلب - 2024-01-15)"
                />
              )} />
            </Box>
          </Box>

          {/* Doctor and Notes Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
              الطبيب والملاحظات
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Controller 
                    name="doctor_id" 
                    control={control} 
                    render={({ field }) => (
                      <Autocomplete
                        fullWidth
                        options={doctors || []}
                        getOptionLabel={(option) => option.name || ''}
                        value={doctors?.find(d => String(d.id) === field.value) || null}
                        onChange={(_, newValue) => {
                          field.onChange(newValue ? String(newValue.id) : '');
                        }}
                        onInputChange={(_, value) => setDoctorSearchTerm(value)}
                        inputValue={doctorSearchTerm}
                        disabled={mutation.isPending}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            label="الطبيب" 
                            placeholder="ابحث عن طبيب..."
                          />
                        )}
                        noOptionsText="لا يوجد أطباء"
                      />
                    )} 
                  />
                </Box>
                <Button
                  component={Link}
                  to="/doctors/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  size="small"
                  startIcon={<Plus size={16} />}
                  sx={{ 
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    mt: 0.5,
                    height: '40px'
                  }}
                  disabled={mutation.isPending}
                >
                  إضافة طبيب
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Controller 
                    name="specialist_doctor_id" 
                    control={control} 
                    render={({ field }) => (
                      <Autocomplete
                        fullWidth
                        options={doctors || []}
                        getOptionLabel={(option) => option.name || ''}
                        value={doctors?.find(d => String(d.id) === field.value) || null}
                        onChange={(_, newValue) => {
                          field.onChange(newValue ? String(newValue.id) : '');
                        }}
                        onInputChange={(_, value) => setSpecialistDoctorSearchTerm(value)}
                        inputValue={specialistDoctorSearchTerm}
                        disabled={mutation.isPending}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            label="الطبيب الأخصائي" 
                            placeholder="ابحث عن طبيب أخصائي..."
                          />
                        )}
                        noOptionsText="لا يوجد أطباء"
                      />
                    )} 
                  />
                </Box>
                <Button
                  component={Link}
                  to="/doctors/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  size="small"
                  startIcon={<Plus size={16} />}
                  sx={{ 
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    mt: 0.5,
                    height: '40px'
                  }}
                  disabled={mutation.isPending}
                >
                  إضافة طبيب
                </Button>
              </Box>
            </Box>
            <Box sx={{ mt: 1.5 }}>
              <Controller name="notes" control={control} render={({ field }) => (
                <TextField fullWidth label="ملاحظات طبية" multiline rows={2} size="small" {...field} disabled={mutation.isPending} />
              )} />
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Button variant="outlined" onClick={() => navigate(-1)} disabled={mutation.isPending} size="small">إلغاء</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending || !selectedPatient} size="small">
              {mutation.isPending ? <CircularProgress size={18} /> : 'إضافة'}
            </Button>
          </Box>
        </Box>
      </CardContent>

      {/* Quick Add Patient Dialog */}
      <Dialog open={quickAddDialogOpen} onClose={() => setQuickAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة مريض جديد</DialogTitle>
        <DialogContent>
          <Box 
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                if (!quickAddPatientMutation.isPending && quickAddFormData.name && quickAddFormData.phone && quickAddFormData.gender) {
                  handleQuickAddSubmit();
                }
              }
            }}
          >
            <TextField
              fullWidth
              label="اسم المريض"
              value={quickAddFormData.name}
              onChange={(e) => setQuickAddFormData({ ...quickAddFormData, name: e.target.value })}
              required
              disabled={quickAddPatientMutation.isPending}
            />
            <TextField
              fullWidth
              label="رقم الهاتف"
              value={quickAddFormData.phone}
              onChange={(e) => setQuickAddFormData({ ...quickAddFormData, phone: e.target.value })}
              required
              disabled={quickAddPatientMutation.isPending}
            />
            <FormControl fullWidth required>
              <InputLabel>النوع</InputLabel>
              <Select
                value={quickAddFormData.gender}
                label="النوع"
                onChange={(e) => setQuickAddFormData({ ...quickAddFormData, gender: e.target.value as 'male' | 'female' })}
                disabled={quickAddPatientMutation.isPending}
              >
                <MenuItem value="male">ذكر</MenuItem>
                <MenuItem value="female">أنثى</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label="العمر (سنوات)"
                type="number"
                value={quickAddFormData.age_year}
                onChange={(e) => setQuickAddFormData({ ...quickAddFormData, age_year: e.target.value })}
                disabled={quickAddPatientMutation.isPending}
              />
              <TextField
                fullWidth
                label="العمر (أشهر)"
                type="number"
                value={quickAddFormData.age_month}
                onChange={(e) => setQuickAddFormData({ ...quickAddFormData, age_month: e.target.value })}
                disabled={quickAddPatientMutation.isPending}
              />
              <TextField
                fullWidth
                label="العمر (أيام)"
                type="number"
                value={quickAddFormData.age_day}
                onChange={(e) => setQuickAddFormData({ ...quickAddFormData, age_day: e.target.value })}
                disabled={quickAddPatientMutation.isPending}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>الحالة الاجتماعية</InputLabel>
              <Select
                value={quickAddFormData.social_status}
                label="الحالة الاجتماعية"
                onChange={(e) => setQuickAddFormData({ ...quickAddFormData, social_status: e.target.value })}
                disabled={quickAddPatientMutation.isPending}
              >
                <MenuItem value="single">أعزب</MenuItem>
                <MenuItem value="married">متزوج</MenuItem>
                <MenuItem value="widowed">أرمل</MenuItem>
                <MenuItem value="divorced">مطلق</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="مصدر الدخل"
              value={quickAddFormData.income_source}
              onChange={(e) => setQuickAddFormData({ ...quickAddFormData, income_source: e.target.value })}
              disabled={quickAddPatientMutation.isPending}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickAddDialogOpen(false)} disabled={quickAddPatientMutation.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={handleQuickAddSubmit}
            variant="contained"
            disabled={quickAddPatientMutation.isPending || !quickAddFormData.name || !quickAddFormData.phone || !quickAddFormData.gender}
          >
            {quickAddPatientMutation.isPending ? <CircularProgress size={20} /> : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

