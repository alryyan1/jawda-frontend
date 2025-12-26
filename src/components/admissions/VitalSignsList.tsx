import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Chip,
} from '@mui/material';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAdmissionVitalSigns,
  deleteVitalSign,
} from '@/services/admissionVitalSignService';
import type { AdmissionVitalSign } from '@/types/admissions';
import AddVitalSignDialog from './AddVitalSignDialog';

interface VitalSignsListProps {
  admissionId: number;
}

export default function VitalSignsList({ admissionId }: VitalSignsListProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editVitalSign, setEditVitalSign] = useState<AdmissionVitalSign | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: vitalSigns = [], isLoading } = useQuery({
    queryKey: ['admissionVitalSigns', admissionId],
    queryFn: () => getAdmissionVitalSigns(admissionId),
    enabled: !!admissionId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVitalSign,
    onSuccess: () => {
      toast.success('تم حذف العلامات الحيوية');
      queryClient.invalidateQueries({ queryKey: ['admissionVitalSigns', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      setDeletingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حذف العلامات الحيوية');
      setDeletingId(null);
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذه القراءة؟')) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (vitalSign: AdmissionVitalSign) => {
    setEditVitalSign(vitalSign);
    setAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setAddDialogOpen(false);
    setEditVitalSign(null);
  };

  // Group vital signs by date
  const groupedByDate = vitalSigns.reduce((acc, vs) => {
    const date = vs.reading_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(vs);
    return acc;
  }, {} as Record<string, AdmissionVitalSign[]>);

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Loader2 className="h-6 w-6 animate-spin" />
      </Box>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              العلامات الحيوية
            </Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setAddDialogOpen(true)}
              size="small"
            >
              إضافة قراءة
            </Button>
          </Box>

          {vitalSigns.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">لا توجد قراءات للعلامات الحيوية</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell className="text-xl!" align="center">التاريخ</TableCell>
                    <TableCell className="text-xl!" align="center">الوقت</TableCell>
                    <TableCell className="text-xl!" align="center">درجة الحرارة</TableCell>
                    <TableCell className="text-xl!" align="center">ضغط الدم</TableCell>
                    <TableCell className="text-xl!" align="center">SpO2</TableCell>
                    <TableCell className="text-xl!" align="center">O2</TableCell>
                    <TableCell className="text-xl!" align="center">معدل النبض</TableCell>
                    <TableCell className="text-xl!" align="center">الملاحظات الطبية</TableCell>
                    <TableCell className="text-xl!" align="center">المسجل</TableCell>
                    <TableCell className="text-xl!" align="center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedDates.map((date) => {
                    const readings = groupedByDate[date].sort((a, b) => 
                      b.reading_time.localeCompare(a.reading_time)
                    );
                    return readings.map((vs, index) => (
                      <TableRow key={vs.id}>
                        {index === 0 && (
                          <TableCell
                            rowSpan={readings.length}
                            align="center"
                            sx={{ fontWeight: 600, verticalAlign: 'top' }}
                          >
                            {new Date(date).toLocaleDateString('ar-SA')}
                          </TableCell>
                        )}
                        <TableCell align="center">{vs.reading_time}</TableCell>
                        <TableCell align="center">
                          {vs.temperature !== null ? `${vs.temperature}°C` : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {vs.blood_pressure_systolic !== null && vs.blood_pressure_diastolic !== null
                            ? `${vs.blood_pressure_systolic}/${vs.blood_pressure_diastolic}`
                            : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {vs.oxygen_saturation !== null ? `${vs.oxygen_saturation}%` : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {vs.oxygen_flow !== null ? `${vs.oxygen_flow} L/min` : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {vs.pulse_rate !== null ? `${vs.pulse_rate}` : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {vs.notes ? (
                            <Tooltip title={vs.notes}>
                              <Chip label="ملاحظات طبية" size="small" />
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {vs.user?.name || '-'}
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" gap={0.5} justifyContent="center">
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(vs)}
                                color="primary"
                              >
                                <Edit className="h-4 w-4" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(vs.id)}
                                disabled={deletingId === vs.id}
                                color="error"
                              >
                                {deletingId === vs.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <AddVitalSignDialog
        open={addDialogOpen}
        onClose={handleCloseDialog}
        admissionId={admissionId}
        editVitalSign={editVitalSign}
      />
    </>
  );
}

