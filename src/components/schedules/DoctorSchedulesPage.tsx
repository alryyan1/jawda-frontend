// src/pages/schedules/DoctorSchedulesPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// MUI
import { Box, Card, CardContent, CardHeader, Typography, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import { CalendarMonth as CalendarMonthIcon } from '@mui/icons-material';

import type { DoctorStripped } from '@/types/doctors';
import { getDoctorsList } from '@/services/doctorService';
import DoctorScheduleForm from '@/components/schedules/DoctorScheduleForm';

const DoctorSchedulesPage: React.FC = () => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  const { data: doctors, isLoading: isLoadingDoctors } = useQuery<DoctorStripped[], Error>({
    queryKey: ['doctorsSimpleListForSchedules'],
    queryFn: () => getDoctorsList(),
  });

  const selectedDoctor = doctors?.find(doc => String(doc.id) === selectedDoctorId);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>جدولة الأطباء</Typography>
        </Box>
      </Box>

      <Card sx={{ mt: 2 }}>
        <CardHeader title="الجداول" subheader="يرجى اختيار الطبيب لعرض/تعديل جدوله" />
        <CardContent>
          <Box sx={{ maxWidth: 320 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="doctor-select-label">اختر الطبيب</InputLabel>
              <Select
                labelId="doctor-select-label"
                label="اختر الطبيب"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(String(e.target.value))}
                disabled={isLoadingDoctors}
              >
                {isLoadingDoctors && (
                  <MenuItem value="" disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} /> جاري التحميل...
                    </Box>
                  </MenuItem>
                )}
                {(doctors || []).map(doc => (
                  <MenuItem key={doc.id} value={String(doc.id)}>{doc.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mt: 2 }}>
            {selectedDoctor ? (
              <DoctorScheduleForm selectedDoctor={selectedDoctor} />
            ) : !isLoadingDoctors ? (
              <Typography variant="body2" color="text.secondary">لم يتم اختيار طبيب</Typography>
            ) : null}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardHeader title="المواعيد" subheader="عرض، حجز، وإدارة مواعيد المرضى (لاحقاً)." />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            سيتم تنفيذ إدارة المواعيد هنا قريباً.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
export default DoctorSchedulesPage;