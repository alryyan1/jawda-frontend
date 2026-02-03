import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Pill,
  ClipboardList,
  UserCheck,
} from "lucide-react";
import type {
  AdmissionTreatment,
  AdmissionTreatmentFormData,
  AdmissionDose,
  AdmissionDoseFormData,
  AdmissionNursingAssignment,
  AdmissionNursingAssignmentFormData,
} from "@/types/admissions";
import {
  getAdmissionTreatments,
  createAdmissionTreatment,
  updateAdmissionTreatment,
  deleteAdmissionTreatment,
} from "@/services/admissionTreatmentService";
import {
  getAdmissionDoses,
  createAdmissionDose,
  updateAdmissionDose,
  deleteAdmissionDose,
} from "@/services/admissionDoseService";
import {
  getAdmissionNursingAssignments,
  createAdmissionNursingAssignment,
  updateAdmissionNursingAssignment,
  deleteAdmissionNursingAssignment,
} from "@/services/admissionNursingAssignmentService";
import { getDoctorsList } from "@/services/doctorService";
import { useForm, Controller } from "react-hook-form";

interface AdmissionPatientFileTabProps {
  admissionId: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-file-tabpanel-${index}`}
      aria-labelledby={`patient-file-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export default function AdmissionPatientFileTab({
  admissionId,
}: AdmissionPatientFileTabProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [doseDialogOpen, setDoseDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] =
    useState<AdmissionTreatment | null>(null);
  const [editingDose, setEditingDose] = useState<AdmissionDose | null>(null);
  const [editingAssignment, setEditingAssignment] =
    useState<AdmissionNursingAssignment | null>(null);

  const queryClient = useQueryClient();

  // Treatments
  const {
    data: treatments,
    isLoading: isLoadingTreatments,
  } = useQuery({
    queryKey: ["admissionTreatments", admissionId],
    queryFn: () => getAdmissionTreatments(admissionId),
  });

  // Doses
  const {
    data: doses,
    isLoading: isLoadingDoses,
  } = useQuery({
    queryKey: ["admissionDoses", admissionId],
    queryFn: () => getAdmissionDoses(admissionId),
  });

  // Nursing Assignments
  const {
    data: assignments,
    isLoading: isLoadingAssignments,
  } = useQuery({
    queryKey: ["admissionNursingAssignments", admissionId],
    queryFn: () => getAdmissionNursingAssignments(admissionId),
  });

  // Doctors for dose form
  const { data: doctors } = useQuery({
    queryKey: ["doctorsList"],
    queryFn: () => getDoctorsList({ active: true }),
  });

  // Treatment mutations
  const treatmentMutation = useMutation({
    mutationFn: (data: AdmissionTreatmentFormData) =>
      editingTreatment
        ? updateAdmissionTreatment(admissionId, editingTreatment.id, data)
        : createAdmissionTreatment(admissionId, data),
    onSuccess: () => {
      toast.success(
        editingTreatment
          ? "تم تحديث بيانات العلاج بنجاح"
          : "تم إضافة بيانات العلاج بنجاح",
      );
      queryClient.invalidateQueries({
        queryKey: ["admissionTreatments", admissionId],
      });
      setTreatmentDialogOpen(false);
      setEditingTreatment(null);
    },
    onError: () => {
      toast.error("فشل حفظ بيانات العلاج");
    },
  });

  const deleteTreatmentMutation = useMutation({
    mutationFn: (treatmentId: number) =>
      deleteAdmissionTreatment(admissionId, treatmentId),
    onSuccess: () => {
      toast.success("تم حذف بيانات العلاج بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["admissionTreatments", admissionId],
      });
    },
    onError: () => {
      toast.error("فشل حذف بيانات العلاج");
    },
  });

  // Dose mutations
  const doseMutation = useMutation({
    mutationFn: (data: AdmissionDoseFormData) =>
      editingDose
        ? updateAdmissionDose(admissionId, editingDose.id, data)
        : createAdmissionDose(admissionId, data),
    onSuccess: () => {
      toast.success(
        editingDose ? "تم تحديث الجرعة بنجاح" : "تم إضافة الجرعة بنجاح",
      );
      queryClient.invalidateQueries({
        queryKey: ["admissionDoses", admissionId],
      });
      setDoseDialogOpen(false);
      setEditingDose(null);
    },
    onError: () => {
      toast.error("فشل حفظ الجرعة");
    },
  });

  const deleteDoseMutation = useMutation({
    mutationFn: (doseId: number) => deleteAdmissionDose(admissionId, doseId),
    onSuccess: () => {
      toast.success("تم حذف الجرعة بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["admissionDoses", admissionId],
      });
    },
    onError: () => {
      toast.error("فشل حذف الجرعة");
    },
  });

  // Assignment mutations
  const assignmentMutation = useMutation({
    mutationFn: (data: AdmissionNursingAssignmentFormData) =>
      editingAssignment
        ? updateAdmissionNursingAssignment(
            admissionId,
            editingAssignment.id,
            data,
          )
        : createAdmissionNursingAssignment(admissionId, data),
    onSuccess: () => {
      toast.success(
        editingAssignment
          ? "تم تحديث المهمة التمريضية بنجاح"
          : "تم إضافة المهمة التمريضية بنجاح",
      );
      queryClient.invalidateQueries({
        queryKey: ["admissionNursingAssignments", admissionId],
      });
      setAssignmentDialogOpen(false);
      setEditingAssignment(null);
    },
    onError: () => {
      toast.error("فشل حفظ المهمة التمريضية");
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      deleteAdmissionNursingAssignment(admissionId, assignmentId),
    onSuccess: () => {
      toast.success("تم حذف المهمة التمريضية بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["admissionNursingAssignments", admissionId],
      });
    },
    onError: () => {
      toast.error("فشل حذف المهمة التمريضية");
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab
            icon={<ClipboardList size={20} />}
            iconPosition="start"
            label="بيانات العلاج"
          />
          <Tab icon={<Pill size={20} />} iconPosition="start" label="الجرعات" />
          <Tab
            icon={<UserCheck size={20} />}
            iconPosition="start"
            label="المهام التمريضية"
          />
        </Tabs>
      </Box>

      {/* Treatments Tab */}
      <TabPanel value={currentTab} index={0}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<Plus />}
            onClick={() => {
              setEditingTreatment(null);
              setTreatmentDialogOpen(true);
            }}
          >
            إضافة بيانات علاج
          </Button>
        </Box>

        {isLoadingTreatments ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : treatments && treatments.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>خطة العلاج</TableCell>
                  <TableCell>التفاصيل</TableCell>
                  <TableCell>ملاحظات</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {treatments.map((treatment) => (
                  <TableRow key={treatment.id}>
                    <TableCell>
                      {treatment.treatment_date || "-"}
                      {treatment.treatment_time && (
                        <Typography variant="caption" display="block">
                          {treatment.treatment_time}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{treatment.treatment_plan || "-"}</TableCell>
                    <TableCell>{treatment.treatment_details || "-"}</TableCell>
                    <TableCell>{treatment.notes || "-"}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingTreatment(treatment);
                          setTreatmentDialogOpen(true);
                        }}
                      >
                        <Edit size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (
                            confirm("هل أنت متأكد من حذف بيانات العلاج؟")
                          ) {
                            deleteTreatmentMutation.mutate(treatment.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" align="center">
                لا توجد بيانات علاج
              </Typography>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Doses Tab */}
      <TabPanel value={currentTab} index={1}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<Plus />}
            onClick={() => {
              setEditingDose(null);
              setDoseDialogOpen(true);
            }}
          >
            إضافة جرعة
          </Button>
        </Box>

        {isLoadingDoses ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : doses && doses.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>اسم الدواء</TableCell>
                  <TableCell>الجرعة</TableCell>
                  <TableCell>التكرار</TableCell>
                  <TableCell>طريقة الإعطاء</TableCell>
                  <TableCell>من تاريخ</TableCell>
                  <TableCell>إلى تاريخ</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {doses.map((dose) => (
                  <TableRow key={dose.id}>
                    <TableCell>{dose.medication_name}</TableCell>
                    <TableCell>{dose.dosage || "-"}</TableCell>
                    <TableCell>{dose.frequency || "-"}</TableCell>
                    <TableCell>{dose.route || "-"}</TableCell>
                    <TableCell>{dose.start_date || "-"}</TableCell>
                    <TableCell>{dose.end_date || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={dose.is_active ? "نشط" : "غير نشط"}
                        color={dose.is_active ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingDose(dose);
                          setDoseDialogOpen(true);
                        }}
                      >
                        <Edit size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف الجرعة؟")) {
                            deleteDoseMutation.mutate(dose.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" align="center">
                لا توجد جرعات مسجلة
              </Typography>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Nursing Assignments Tab */}
      <TabPanel value={currentTab} index={2}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<Plus />}
            onClick={() => {
              setEditingAssignment(null);
              setAssignmentDialogOpen(true);
            }}
          >
            إضافة مهمة تمريضية
          </Button>
        </Box>

        {isLoadingAssignments ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : assignments && assignments.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>وصف المهمة</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>تاريخ الاستحقاق</TableCell>
                  <TableCell>المسؤول</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.assignment_description}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          assignment.priority === "high"
                            ? "عالية"
                            : assignment.priority === "medium"
                              ? "متوسطة"
                              : "منخفضة"
                        }
                        color={
                          assignment.priority === "high"
                            ? "error"
                            : assignment.priority === "medium"
                              ? "warning"
                              : "default"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          assignment.status === "completed"
                            ? "مكتملة"
                            : assignment.status === "in_progress"
                              ? "قيد التنفيذ"
                              : assignment.status === "cancelled"
                                ? "ملغاة"
                                : "معلقة"
                        }
                        color={
                          assignment.status === "completed"
                            ? "success"
                            : assignment.status === "in_progress"
                              ? "info"
                              : assignment.status === "cancelled"
                                ? "error"
                                : "default"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {assignment.due_date || "-"}
                      {assignment.due_time && (
                        <Typography variant="caption" display="block">
                          {assignment.due_time}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.user?.name || "-"}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingAssignment(assignment);
                          setAssignmentDialogOpen(true);
                        }}
                      >
                        <Edit size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (
                            confirm("هل أنت متأكد من حذف المهمة التمريضية؟")
                          ) {
                            deleteAssignmentMutation.mutate(assignment.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" align="center">
                لا توجد مهام تمريضية
              </Typography>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Treatment Dialog */}
      <TreatmentDialog
        open={treatmentDialogOpen}
        onClose={() => {
          setTreatmentDialogOpen(false);
          setEditingTreatment(null);
        }}
        onSubmit={(data) => treatmentMutation.mutate(data)}
        editingTreatment={editingTreatment}
        isLoading={treatmentMutation.isPending}
      />

      {/* Dose Dialog */}
      <DoseDialog
        open={doseDialogOpen}
        onClose={() => {
          setDoseDialogOpen(false);
          setEditingDose(null);
        }}
        onSubmit={(data) => doseMutation.mutate(data)}
        editingDose={editingDose}
        doctors={doctors || []}
        isLoading={doseMutation.isPending}
      />

      {/* Assignment Dialog */}
      <AssignmentDialog
        open={assignmentDialogOpen}
        onClose={() => {
          setAssignmentDialogOpen(false);
          setEditingAssignment(null);
        }}
        onSubmit={(data) => assignmentMutation.mutate(data)}
        editingAssignment={editingAssignment}
        isLoading={assignmentMutation.isPending}
      />
    </Box>
  );
}

// Treatment Dialog Component
function TreatmentDialog({
  open,
  onClose,
  onSubmit,
  editingTreatment,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AdmissionTreatmentFormData) => void;
  editingTreatment: AdmissionTreatment | null;
  isLoading: boolean;
}) {
  const { control, handleSubmit, reset } = useForm<AdmissionTreatmentFormData>(
    {
      defaultValues: {
        treatment_plan: "",
        treatment_details: "",
        notes: "",
        treatment_date: new Date().toISOString().split("T")[0],
        treatment_time: "",
      },
    },
  );

  React.useEffect(() => {
    if (editingTreatment) {
      reset({
        treatment_plan: editingTreatment.treatment_plan || "",
        treatment_details: editingTreatment.treatment_details || "",
        notes: editingTreatment.notes || "",
        treatment_date: editingTreatment.treatment_date || "",
        treatment_time: editingTreatment.treatment_time || "",
      });
    } else {
      reset({
        treatment_plan: "",
        treatment_details: "",
        notes: "",
        treatment_date: new Date().toISOString().split("T")[0],
        treatment_time: "",
      });
    }
  }, [editingTreatment, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {editingTreatment ? "تعديل بيانات العلاج" : "إضافة بيانات علاج"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Controller
              name="treatment_date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="تاريخ العلاج"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              )}
            />
            <Controller
              name="treatment_time"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="وقت العلاج"
                  type="time"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              )}
            />
            <Controller
              name="treatment_plan"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="خطة العلاج"
                  multiline
                  rows={3}
                  fullWidth
                />
              )}
            />
            <Controller
              name="treatment_details"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="تفاصيل العلاج"
                  multiline
                  rows={4}
                  fullWidth
                />
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="ملاحظات"
                  multiline
                  rows={2}
                  fullWidth
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : "حفظ"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Dose Dialog Component
function DoseDialog({
  open,
  onClose,
  onSubmit,
  editingDose,
  doctors,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AdmissionDoseFormData) => void;
  editingDose: AdmissionDose | null;
  doctors: any[];
  isLoading: boolean;
}) {
  const { control, handleSubmit, reset } = useForm<AdmissionDoseFormData>({
    defaultValues: {
      medication_name: "",
      dosage: "",
      frequency: "",
      route: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      instructions: "",
      notes: "",
      doctor_id: null,
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (editingDose) {
      reset({
        medication_name: editingDose.medication_name,
        dosage: editingDose.dosage || "",
        frequency: editingDose.frequency || "",
        route: editingDose.route || "",
        start_date: editingDose.start_date || "",
        end_date: editingDose.end_date || "",
        instructions: editingDose.instructions || "",
        notes: editingDose.notes || "",
        doctor_id: editingDose.doctor_id || null,
        is_active: editingDose.is_active,
      });
    } else {
      reset({
        medication_name: "",
        dosage: "",
        frequency: "",
        route: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        instructions: "",
        notes: "",
        doctor_id: null,
        is_active: true,
      });
    }
  }, [editingDose, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {editingDose ? "تعديل الجرعة" : "إضافة جرعة"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Controller
              name="medication_name"
              control={control}
              rules={{ required: "اسم الدواء مطلوب" }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="اسم الدواء"
                  fullWidth
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <Controller
                name="dosage"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="الجرعة" fullWidth />
                )}
              />
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="التكرار" fullWidth />
                )}
              />
            </Box>
            <Controller
              name="route"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="طريقة الإعطاء" fullWidth />
              )}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <Controller
                name="start_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="من تاريخ"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="end_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="إلى تاريخ"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                )}
              />
            </Box>
            <Controller
              name="doctor_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>الطبيب الموصي</InputLabel>
                  <Select
                    {...field}
                    label="الطبيب الموصي"
                    value={field.value || ""}
                  >
                    <MenuItem value="">بدون</MenuItem>
                    {doctors.map((doctor) => (
                      <MenuItem key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="instructions"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="تعليمات خاصة"
                  multiline
                  rows={2}
                  fullWidth
                />
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="ملاحظات"
                  multiline
                  rows={2}
                  fullWidth
                />
              )}
            />
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>الحالة</InputLabel>
                  <Select
                    {...field}
                    label="الحالة"
                    value={field.value ? "active" : "inactive"}
                    onChange={(e) =>
                      field.onChange(e.target.value === "active")
                    }
                  >
                    <MenuItem value="active">نشط</MenuItem>
                    <MenuItem value="inactive">غير نشط</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : "حفظ"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Assignment Dialog Component
function AssignmentDialog({
  open,
  onClose,
  onSubmit,
  editingAssignment,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AdmissionNursingAssignmentFormData) => void;
  editingAssignment: AdmissionNursingAssignment | null;
  isLoading: boolean;
}) {
  const { control, handleSubmit, reset } =
    useForm<AdmissionNursingAssignmentFormData>({
      defaultValues: {
        assignment_description: "",
        priority: "medium",
        status: "pending",
        due_date: "",
        due_time: "",
        notes: "",
      },
    });

  React.useEffect(() => {
    if (editingAssignment) {
      reset({
        assignment_description: editingAssignment.assignment_description,
        priority: editingAssignment.priority,
        status: editingAssignment.status,
        due_date: editingAssignment.due_date || "",
        due_time: editingAssignment.due_time || "",
        notes: editingAssignment.notes || "",
      });
    } else {
      reset({
        assignment_description: "",
        priority: "medium",
        status: "pending",
        due_date: "",
        due_time: "",
        notes: "",
      });
    }
  }, [editingAssignment, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {editingAssignment
            ? "تعديل المهمة التمريضية"
            : "إضافة مهمة تمريضية"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Controller
              name="assignment_description"
              control={control}
              rules={{ required: "وصف المهمة مطلوب" }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="وصف المهمة"
                  multiline
                  rows={3}
                  fullWidth
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>الأولوية</InputLabel>
                    <Select {...field} label="الأولوية">
                      <MenuItem value="low">منخفضة</MenuItem>
                      <MenuItem value="medium">متوسطة</MenuItem>
                      <MenuItem value="high">عالية</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>الحالة</InputLabel>
                    <Select {...field} label="الحالة">
                      <MenuItem value="pending">معلقة</MenuItem>
                      <MenuItem value="in_progress">قيد التنفيذ</MenuItem>
                      <MenuItem value="completed">مكتملة</MenuItem>
                      <MenuItem value="cancelled">ملغاة</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Controller
                name="due_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="تاريخ الاستحقاق"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="due_time"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="وقت الاستحقاق"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                )}
              />
            </Box>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="ملاحظات"
                  multiline
                  rows={2}
                  fullWidth
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : "حفظ"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
