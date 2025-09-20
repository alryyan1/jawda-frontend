// src/components/clinic/PatientInfoDialog.tsx
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

// MUI imports
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Paper,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Chip,
  Avatar,
  Stack,
} from "@mui/material";
import {
  Person as UserCircle,
  Phone as PhoneIcon,
  CalendarToday as CalendarDays,
  LocationOn as MapPin,
  Business as Building,
  Badge as IdCard,
  Warning as AlertTriangle,
  Male as VenusAndMars,
  Female as FemaleIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

import type { Patient } from "@/types/patients";
import { getPatientById } from "@/services/patientService";
import EditPatientInfoDialog from "./EditPatientInfoDialog";
import type { DoctorVisit } from "@/types/visits";

interface PatientInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  visit: DoctorVisit | null;
}

// Enhanced DetailRow component with better UX
const DetailRowDisplay: React.FC<{
  label: string;
  value?: string | number | React.ReactNode | null;
  icon?: React.ElementType;
  titleValue?: string;
  variant?: 'default' | 'highlighted';
}> = ({ label, value, icon: Icon, titleValue, variant = 'default' }) => {
  const isHighlighted = variant === 'highlighted';
  
  return (
    <Fade in timeout={300}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: isHighlighted ? 'primary.light' : 'divider',
          bgcolor: isHighlighted ? 'primary.50' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: isHighlighted ? 'primary.main' : 'primary.light',
            boxShadow: 1,
            transform: 'translateY(-1px)',
          },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {Icon && (
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: isHighlighted ? 'primary.main' : 'grey.100',
                color: isHighlighted ? 'primary.contrastText' : 'text.secondary',
              }}
            >
              <Icon sx={{ fontSize: 18 }} />
            </Avatar>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 600, 
                color: 'text.secondary',
                display: 'block',
                mb: 0.5,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: '0.75rem'
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontWeight: isHighlighted ? 600 : 500,
                color: 'text.primary',
                lineHeight: 1.4,
                wordBreak: 'break-word',
                display: 'block'
              }}
              title={
                titleValue ||
                (typeof value === "string" || typeof value === "number"
                  ? String(value)
                  : undefined)
              }
            >
              {value || value === 0 ? (
                value
              ) : (
                <Chip
                  label="غير متوفر"
                  size="small"
                  variant="outlined"
                  sx={{
                    fontStyle: 'italic',
                    color: 'text.disabled',
                    borderColor: 'text.disabled',
                    '& .MuiChip-label': {
                      fontSize: '0.75rem'
                    }
                  }}
                />
              )}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Fade>
  );
};

const PatientInfoDialog: React.FC<PatientInfoDialogProps> = ({
  isOpen,
  onOpenChange,
  visit,
}) => {
  const dateLocale = "ar".startsWith("ar") ? arSA : enUS;
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for Edit Dialog
  const [isEditPatientDialogOpen, setIsEditPatientDialogOpen] = useState(false);

  const patientQueryKey = ["patientDetailsForInfoPanel", visit?.patient.id];
  const {
    data: patient,
    isLoading,
    error,
  } = useQuery<Patient, Error>({
    queryKey: patientQueryKey,
    queryFn: () => {
      if (!visit?.patient.id) throw new Error("Patient ID is required.");
      return getPatientById(visit?.patient.id);
    },
    enabled: !!visit?.patient.id && isOpen, // Only fetch when main dialog is open and patientId exists
  });

  const getAgeString = (p?: Patient | null): string => {
    if (!p) return "غير متوفر";
    const parts = [];
    if (p.age_year !== null && p.age_year !== undefined && p.age_year >= 0)
      parts.push(`${p.age_year} سنة`);
    if (p.age_month !== null && p.age_month !== undefined && p.age_month >= 0)
      parts.push(`${p.age_month} شهر`);
    if (p.age_day !== null && p.age_day !== undefined && p.age_day >= 0)
      parts.push(`${p.age_day} يوم`);
    if (
      parts.length === 0 &&
      (p.age_year === 0 || p.age_month === 0 || p.age_day === 0)
    )
      return "0 يوم";
    return parts.length > 0 ? parts.join(" ") : "غير متوفر";
  };

  const handlePatientInfoUpdated = (updatedPatient: Patient) => {
    // Update the cache for this dialog's query
    queryClient.setQueryData(patientQueryKey, updatedPatient);
    // Potentially invalidate other lists where this patient might appear
    queryClient.invalidateQueries({ queryKey: ["activePatients"] });
    queryClient.invalidateQueries({ queryKey: ["patientVisitsSummary"] });
    setIsEditPatientDialogOpen(false); // Close edit dialog
  };

  const openEditDialog = () => {
    if (patient) setIsEditPatientDialogOpen(true);
  };

  // Ensure dialog closes cleanly
  const handleMainDialogOpenChange = (open: boolean) => {
    if (!open) {
      setIsEditPatientDialogOpen(false); // Close edit dialog if main dialog closes
    }
    onOpenChange(open);
  };

  return (
    <>
      <Dialog 
        open={isOpen} 
        onClose={() => handleMainDialogOpenChange(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        TransitionComponent={Slide}
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            height: isMobile ? '100vh' : 'auto',
            borderRadius: isMobile ? 0 : 3,
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          p: 3, 
          pb: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
          }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{ 
                  width: 56,
                  height: 56,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <UserCircle sx={{ fontSize: 32, color: 'white' }} />
              </Avatar>
              <Box>
                <Typography variant="h5" component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
                  تفاصيل المريض
                </Typography>
                {patient && (
                  <Typography variant="body1" sx={{ opacity: 0.9, fontWeight: 500 }}>
                    {patient.name}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {patient && !isLoading && (
                <Button 
                  variant="contained" 
                  size="medium" 
                  onClick={openEditDialog}
                  startIcon={<EditIcon />}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.3)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  تعديل
                </Button>
              )}
              <IconButton
                onClick={() => handleMainDialogOpenChange(false)}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.2)',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: 'grey.50' }}>
          {isLoading && (
            <Fade in timeout={500}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                py: 8, 
                gap: 3,
                minHeight: 300
              }}>
                <Box sx={{ position: 'relative' }}>
                  <CircularProgress 
                    size={60} 
                    thickness={4}
                    sx={{
                      color: 'primary.main',
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      }
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <UserCircle sx={{ fontSize: 20, color: 'primary.main' }} />
                  </Box>
                </Box>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
                  جاري تحميل التفاصيل...
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  يرجى الانتظار قليلاً
                </Typography>
              </Box>
            </Fade>
          )}

          {error && (
            <Fade in timeout={500}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                py: 6, 
                gap: 3,
                textAlign: 'center',
                px: 3,
                minHeight: 300
              }}>
                <Box sx={{ 
                  bgcolor: 'error.light', 
                  color: 'error.contrastText',
                  p: 2, 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(211, 47, 47, 0.2)'
                }}>
                  <AlertTriangle sx={{ fontSize: 40 }} />
                </Box>
                <Box>
                  <Typography variant="h6" color="error.main" sx={{ fontWeight: 600, mb: 1 }}>
                    فشل في جلب تفاصيل المريض
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '400px', display: 'block', mx: 'auto' }}>
                    {error.message}
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  color="error"
                  onClick={() => window.location.reload()}
                  sx={{ mt: 2 }}
                >
                  إعادة المحاولة
                </Button>
              </Box>
            </Fade>
          )}

          {patient && !isLoading && !error && (
            <Fade in timeout={800}>
              <Box sx={{ 
                maxHeight: 'calc(90vh - 200px)', 
                overflow: 'auto',
                direction: 'rtl',
                p: 3
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Personal Information Card */}
                  <Card sx={{ 
                    border: 'none', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                  }}>
                    <CardHeader sx={{ 
                      pb: 2, 
                      pt: 3,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                          <UserCircle sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          المعلومات الشخصية
                        </Typography>
                      </Box>
                    </CardHeader>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: { 
                          xs: '1fr', 
                          sm: 'repeat(2, 1fr)', 
                          lg: 'repeat(3, 1fr)' 
                        }, 
                        gap: 2 
                      }}>
                        <DetailRowDisplay
                          label="رقم الهوية"
                          value={visit?.id}
                          icon={IdCard}
                          variant="highlighted"
                        />
                        <DetailRowDisplay
                          label="الاسم الكامل"
                          value={patient.name}
                          variant="highlighted"
                        />
                        <DetailRowDisplay
                          label="رقم الهاتف"
                          value={patient.phone}
                          icon={PhoneIcon}
                        />
                        <DetailRowDisplay
                          label="الجنس"
                          value={patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : patient.gender}
                          icon={patient.gender === 'female' ? FemaleIcon : VenusAndMars}
                        />
                        <DetailRowDisplay
                          label="العمر"
                          value={getAgeString(patient)}
                          icon={CalendarDays}
                        />
                        <DetailRowDisplay
                          label="العنوان"
                          value={patient.address}
                          icon={MapPin}
                          titleValue={patient.address || undefined}
                        />
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Insurance Information Card */}
                  {patient.company_id && (
                    <Card sx={{ 
                      border: 'none', 
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      borderRadius: 3,
                      overflow: 'hidden',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)'
                    }}>
                      <CardHeader sx={{ 
                        pb: 2, 
                        pt: 3,
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                        color: 'white'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                            <Building sx={{ fontSize: 20 }} />
                          </Avatar>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            معلومات التأمين
                          </Typography>
                        </Box>
                      </CardHeader>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: { 
                            xs: '1fr', 
                            sm: 'repeat(2, 1fr)', 
                            lg: 'repeat(3, 1fr)' 
                          }, 
                          gap: 2 
                        }}>
                          <DetailRowDisplay
                            label="الشركة"
                            value={patient.company?.name}
                            icon={Building}
                            variant="highlighted"
                          />
                          <DetailRowDisplay
                            label="رقم التأمين"
                            value={patient.insurance_no}
                            variant="highlighted"
                          />
                          <DetailRowDisplay
                            label="الشركة الفرعية"
                            value={patient.subcompany?.name}
                          />
                          <DetailRowDisplay
                            label="العلاقة"
                            value={patient.company_relation?.name}
                          />
                          <DetailRowDisplay
                            label="الضامن"
                            value={patient.guarantor}
                          />
                          {patient.expire_date && (
                            <DetailRowDisplay
                              label="تاريخ الانتهاء"
                              value={visit ? format(visit.visit_date, "P", {
                                locale: dateLocale,
                              }) : undefined}
                              icon={CalendarDays}
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </Box>
            </Fade>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          pt: 2,
          bgcolor: 'grey.50',
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'center'
        }}>
          <Button 
            variant="contained" 
            onClick={() => handleMainDialogOpenChange(false)}
            sx={{ 
              minWidth: 120,
              py: 1.5,
              px: 4,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Patient Info Dialog (Conditionally Rendered) */}
      {visit?.patient.id && (
        <EditPatientInfoDialog
          isOpen={isEditPatientDialogOpen}
          onOpenChange={setIsEditPatientDialogOpen}
          patientId={visit?.patient.id}
          onPatientInfoUpdated={handlePatientInfoUpdated}
        />
      )}
    </>
  );
};

export default PatientInfoDialog;
