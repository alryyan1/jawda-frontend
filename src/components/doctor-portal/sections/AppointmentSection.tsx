import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { CalendarPlus, RefreshCw, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { getDoctorsList } from '@/services/doctorService';
import {
  getPatientAppointments,
  createPatientAppointment,
  resendAppointmentWhatsapp,
  cancelPatientAppointment,
} from '@/services/patientAppointmentService';
import type { DoctorStripped } from '@/types/doctors';
import type { PatientAppointment } from '@/types/appointment';

interface AppointmentSectionProps {
  patientId: number | undefined;
  defaultDoctorId?: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'مجدول',
  cancelled: 'ملغى',
};

const AppointmentSection: React.FC<AppointmentSectionProps> = ({ patientId, defaultDoctorId }) => {
  const queryClient = useQueryClient();
  const queryKey = ['patientAppointments', patientId];

  const { data: appointments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getPatientAppointments(patientId!),
    enabled: !!patientId,
  });

  const { data: doctors = [] } = useQuery<DoctorStripped[]>({
    queryKey: ['doctorsList'],
    queryFn: () => getDoctorsList({ active: true }),
  });

  const [selectedDoctor, setSelectedDoctor] = useState<DoctorStripped | null>(null);
  const [scheduledAt, setScheduledAt] = useState(() => dayjs().add(1, 'day').format('YYYY-MM-DDTHH:mm'));
  const [notes, setNotes] = useState('');
  const [sendWhatsapp, setSendWhatsapp] = useState(true);

  useEffect(() => {
    if (defaultDoctorId && doctors.length > 0 && !selectedDoctor) {
      setSelectedDoctor(doctors.find(d => d.id === defaultDoctorId) ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDoctorId, doctors]);

  const createMutation = useMutation({
    mutationFn: () =>
      createPatientAppointment(patientId!, {
        doctor_id: selectedDoctor?.id ?? null,
        scheduled_at: dayjs(scheduledAt).format('YYYY-MM-DD HH:mm:ss'),
        notes: notes.trim() || null,
        send_whatsapp: sendWhatsapp,
      }),
    onSuccess: appointment => {
      queryClient.invalidateQueries({ queryKey });
      if (sendWhatsapp) {
        if (appointment.whatsapp_sent_at) {
          toast.success('تم تحديد الموعد وإرسال إشعار واتساب للمريض');
        } else {
          toast.warning(`تم تحديد الموعد، لكن فشل إرسال واتساب: ${appointment.whatsapp_send_error ?? 'خطأ غير معروف'}`);
        }
      } else {
        toast.success('تم تحديد الموعد');
      }
      setNotes('');
    },
    onError: () => toast.error('فشل تحديد الموعد'),
  });

  const resendMutation = useMutation({
    mutationFn: (appointmentId: number) => resendAppointmentWhatsapp(appointmentId),
    onSuccess: appointment => {
      queryClient.invalidateQueries({ queryKey });
      if (appointment.whatsapp_sent_at) {
        toast.success('تم إرسال إشعار واتساب');
      } else {
        toast.error(`فشل إرسال واتساب: ${appointment.whatsapp_send_error ?? 'خطأ غير معروف'}`);
      }
    },
    onError: () => toast.error('فشل إرسال واتساب'),
  });

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: number) => cancelPatientAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('تم إلغاء الموعد');
    },
    onError: () => toast.error('فشل إلغاء الموعد'),
  });

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => dayjs(b.scheduled_at).valueOf() - dayjs(a.scheduled_at).valueOf()),
    [appointments]
  );

  if (!patientId) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          تحديد موعد جديد
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' }, minWidth: 0 }}>
            <Autocomplete
              options={doctors}
              value={selectedDoctor}
              onChange={(_, value) => setSelectedDoctor(value)}
              getOptionLabel={option => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              size="small"
              renderInput={params => <TextField {...params} label="الطبيب (اختياري)" />}
            />
          </Box>
          <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' }, minWidth: 0 }}>
            <TextField
              type="datetime-local"
              label="موعد الزيارة"
              size="small"
              fullWidth
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box sx={{ flexBasis: '100%', minWidth: 0 }}>
            <TextField
              label="ملاحظات (اختياري)"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <FormControlLabel
            control={<Checkbox checked={sendWhatsapp} onChange={e => setSendWhatsapp(e.target.checked)} size="small" />}
            label={<Typography sx={{ fontSize: '0.82rem' }}>إرسال إشعار عبر واتساب للمريض</Typography>}
          />
          <Button
            variant="contained"
            startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CalendarPlus size={16} />}
            disabled={createMutation.isPending || !scheduledAt}
            onClick={() => createMutation.mutate()}
          >
            تحديد الموعد
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" fontWeight={700}>
            المواعيد ({sortedAppointments.length})
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : sortedAppointments.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
            <Typography variant="body2">لا توجد مواعيد مسجلة لهذا المريض.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {sortedAppointments.map((appointment, index) => (
              <React.Fragment key={appointment.id}>
                {index > 0 && <Divider />}
                <AppointmentRow
                  appointment={appointment}
                  onResend={() => resendMutation.mutate(appointment.id)}
                  onCancel={() => cancelMutation.mutate(appointment.id)}
                  isResending={resendMutation.isPending && resendMutation.variables === appointment.id}
                  isCancelling={cancelMutation.isPending && cancelMutation.variables === appointment.id}
                />
              </React.Fragment>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

const AppointmentRow: React.FC<{
  appointment: PatientAppointment;
  onResend: () => void;
  onCancel: () => void;
  isResending: boolean;
  isCancelling: boolean;
}> = ({ appointment, onResend, onCancel, isResending, isCancelling }) => {
  const isCancelled = appointment.status === 'cancelled';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, flexWrap: 'wrap' }}>
      <Box sx={{ minWidth: 160 }}>
        <Typography variant="body2" fontWeight={600}>
          {dayjs(appointment.scheduled_at).format('YYYY-MM-DD HH:mm')}
        </Typography>
        {appointment.doctor && (
          <Typography variant="caption" color="text.secondary">
            د. {appointment.doctor.name}
          </Typography>
        )}
      </Box>

      {appointment.notes && (
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 160, fontSize: '0.8rem' }}>
          {appointment.notes}
        </Typography>
      )}

      <Chip
        label={STATUS_LABELS[appointment.status] ?? appointment.status}
        size="small"
        color={isCancelled ? 'default' : 'primary'}
        variant={isCancelled ? 'outlined' : 'filled'}
      />

      {appointment.whatsapp_sent_at ? (
        <Tooltip title={`تم الإرسال: ${dayjs(appointment.whatsapp_sent_at).format('YYYY-MM-DD HH:mm')}`}>
          <CheckCircle2 size={16} color="green" />
        </Tooltip>
      ) : appointment.whatsapp_send_error ? (
        <Tooltip title={appointment.whatsapp_send_error}>
          <AlertCircle size={16} color="#d32f2f" />
        </Tooltip>
      ) : null}

      <Box sx={{ flex: 1 }} />

      <Tooltip title="إعادة إرسال واتساب">
        <span>
          <IconButton size="small" onClick={onResend} disabled={isResending || isCancelled}>
            {isResending ? <CircularProgress size={14} /> : <RefreshCw size={14} />}
          </IconButton>
        </span>
      </Tooltip>
      {!isCancelled && (
        <Tooltip title="إلغاء الموعد">
          <span>
            <IconButton size="small" color="error" onClick={onCancel} disabled={isCancelling}>
              {isCancelling ? <CircularProgress size={14} /> : <XCircle size={14} />}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};

export default AppointmentSection;
