import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  FormControlLabel,
  Switch,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Divider,
  Grid,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import type { FirestoreDoctor, UpdateDoctorData, WorkingSchedule, DaySchedule } from "@/services/firestoreSpecialistService";

interface EditDoctorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  doctorToEdit: FirestoreDoctor | null;
  doctorEditForm: UpdateDoctorData;
  isPending: boolean;
  onFormChange: (data: UpdateDoctorData) => void;
  onSubmit: (e: React.FormEvent) => void;
}

// Arabic day names
const ARABIC_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const EditDoctorDialog: React.FC<EditDoctorDialogProps> = ({
  isOpen,
  onOpenChange,
  doctorToEdit,
  doctorEditForm,
  isPending,
  onFormChange,
  onSubmit,
}) => {
  const [workingSchedule, setWorkingSchedule] = useState<WorkingSchedule>({});

  // Initialize working schedule from doctorToEdit or doctorEditForm
  useEffect(() => {
    if (doctorToEdit?.workingSchedule) {
      setWorkingSchedule(doctorToEdit.workingSchedule);
    } else if ((doctorEditForm as any).workingSchedule) {
      setWorkingSchedule((doctorEditForm as any).workingSchedule);
    } else {
      setWorkingSchedule({});
    }
  }, [doctorToEdit, doctorEditForm, isOpen]);

  const handleScheduleChange = (day: string, period: "morning" | "evening", field: "start" | "end", value: string) => {
    const newSchedule = { ...workingSchedule };
    if (!newSchedule[day]) {
      newSchedule[day] = {};
    }
    if (!newSchedule[day][period]) {
      newSchedule[day][period] = { start: "", end: "" };
    }
    newSchedule[day][period] = {
      ...newSchedule[day][period],
      [field]: value,
    };
    setWorkingSchedule(newSchedule);
    onFormChange({ ...doctorEditForm, workingSchedule: newSchedule });
  };

  const handleRemovePeriod = (day: string, period: "morning" | "evening") => {
    const newSchedule = { ...workingSchedule };
    if (newSchedule[day] && newSchedule[day][period]) {
      delete newSchedule[day][period];
      // If day has no periods, remove the day
      if (!newSchedule[day].morning && !newSchedule[day].evening) {
        delete newSchedule[day];
      }
      setWorkingSchedule(newSchedule);
      onFormChange({ ...doctorEditForm, workingSchedule: newSchedule });
    }
  };

  const handleAddDay = (day: string) => {
    const newSchedule = { ...workingSchedule };
    if (!newSchedule[day]) {
      newSchedule[day] = {};
    }
    setWorkingSchedule(newSchedule);
    onFormChange({ ...doctorEditForm, workingSchedule: newSchedule });
  };

  const handleRemoveDay = (day: string) => {
    const newSchedule = { ...workingSchedule };
    delete newSchedule[day];
    setWorkingSchedule(newSchedule);
    onFormChange({ ...doctorEditForm, workingSchedule: newSchedule });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle>تعديل بيانات الطبيب</DialogTitle>
      <DialogContent dividers>
        <form onSubmit={onSubmit} id="edit-doctor-form">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="اسم الطبيب"
              value={doctorEditForm.docName || ""}
              onChange={(e) =>
                onFormChange({ ...doctorEditForm, docName: e.target.value })
              }
              placeholder="اسم الطبيب"
              required
              fullWidth
              size="small"
            />

            <TextField
              label="رقم الهاتف"
              value={doctorEditForm.phoneNumber || ""}
              onChange={(e) =>
                onFormChange({
                  ...doctorEditForm,
                  phoneNumber: e.target.value,
                })
              }
              placeholder="رقم الهاتف"
              fullWidth
              size="small"
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="حد المرضى الصباحي"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={doctorEditForm.morningPatientLimit || 0}
                  onChange={(e) =>
                    onFormChange({
                      ...doctorEditForm,
                      morningPatientLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="حد المرضى الصباحي"
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="حد المرضى المسائي"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={doctorEditForm.eveningPatientLimit || 0}
                  onChange={(e) =>
                    onFormChange({
                      ...doctorEditForm,
                      eveningPatientLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="حد المرضى المسائي"
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={doctorEditForm.isActive ?? true}
                    onChange={(e) =>
                      onFormChange({ ...doctorEditForm, isActive: e.target.checked })
                    }
                  />
                }
                label="نشط"
              />
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={doctorEditForm.isBookingEnabled ?? false}
                    onChange={(e) =>
                      onFormChange({
                        ...doctorEditForm,
                        isBookingEnabled: e.target.checked,
                      })
                    }
                  />
                }
                label="الحجز متاح"
              />
            </Box>

            <Divider />

            {/* Working Schedule Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                الجدول الزمني
              </Typography>

              {/* Days with existing schedule */}
              {Object.keys(workingSchedule).map((day) => (
                <Accordion key={day} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {day}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDay(day);
                        }}
                        sx={{ ml: 'auto' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Morning Period */}
                      {workingSchedule[day]?.morning ? (
                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="medium">
                              فترة الصباح
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleRemovePeriod(day, "morning")}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <TextField
                                label="وقت البداية"
                                type="time"
                                value={workingSchedule[day].morning?.start || ""}
                                onChange={(e) =>
                                  handleScheduleChange(day, "morning", "start", e.target.value)
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                label="وقت النهاية"
                                type="time"
                                value={workingSchedule[day].morning?.end || ""}
                                onChange={(e) =>
                                  handleScheduleChange(day, "morning", "end", e.target.value)
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            handleScheduleChange(day, "morning", "start", "09:00");
                            handleScheduleChange(day, "morning", "end", "12:00");
                          }}
                          variant="outlined"
                        >
                          إضافة فترة صباحية
                        </Button>
                      )}

                      {/* Evening Period */}
                      {workingSchedule[day]?.evening ? (
                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="medium">
                              فترة المساء
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleRemovePeriod(day, "evening")}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <TextField
                                label="وقت البداية"
                                type="time"
                                value={workingSchedule[day].evening?.start || ""}
                                onChange={(e) =>
                                  handleScheduleChange(day, "evening", "start", e.target.value)
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                label="وقت النهاية"
                                type="time"
                                value={workingSchedule[day].evening?.end || ""}
                                onChange={(e) =>
                                  handleScheduleChange(day, "evening", "end", e.target.value)
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            handleScheduleChange(day, "evening", "start", "18:00");
                            handleScheduleChange(day, "evening", "end", "22:00");
                          }}
                          variant="outlined"
                        >
                          إضافة فترة مسائية
                        </Button>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}

              {/* Add new day */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  إضافة يوم جديد:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {ARABIC_DAYS.filter(day => !workingSchedule[day]).map((day) => (
                    <Button
                      key={day}
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddDay(day)}
                      startIcon={<AddIcon />}
                    >
                      {day}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => onOpenChange(false)}
          disabled={isPending}
          variant="outlined"
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          form="edit-doctor-form"
          disabled={isPending}
          variant="contained"
          startIcon={isPending ? <CircularProgress size={16} /> : null}
        >
          {isPending ? "جاري التحديث..." : "حفظ التغييرات"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDoctorDialog;
