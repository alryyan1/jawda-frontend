import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Chip,
} from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import type { FirestoreDoctor, FirestoreSpecialist } from "@/services/firestoreSpecialistService";

interface DoctorsListProps {
  doctors: FirestoreDoctor[] | undefined;
  isLoading: boolean;
  error: Error | null;
  selectedSpecialistId: string | null;
  selectedDoctor: FirestoreDoctor | null;
  specialists: FirestoreSpecialist[] | undefined;
  doctorAppointmentCounts: Record<string, number>;
  onSelectDoctor: (doctor: FirestoreDoctor) => void;
  onEditDoctor: (doctor: FirestoreDoctor) => void;
}

const DoctorsList: React.FC<DoctorsListProps> = ({
  doctors,
  isLoading,
  error,
  selectedSpecialistId,
  selectedDoctor,
  specialists,
  doctorAppointmentCounts,
  onSelectDoctor,
  onEditDoctor,
}) => {
  const specialistName = specialists?.find((s) => s.id === selectedSpecialistId)?.specName;

  return (
    <Card sx={{ height: window.innerHeight - 100 }} >
   
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pt: 0, px: 0 }}>
        {!selectedSpecialistId ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <Typography variant="body1" color="text.secondary">
              اختر تخصصاً لعرض الأطباء
            </Typography>
          </Box>
        ) : isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 1, px: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ textAlign: 'center', py: 4, px: 3 }}>
            فشل تحميل الأطباء
          </Typography>
        ) : doctors && doctors.length > 0 ? (
          <Box sx={{ overflowY: 'auto', px: 3, pb: 3, pt: 0 }}>
            <List sx={{ p: 0 }}>
              {doctors.map((doctor) => (
                <ListItem key={doctor.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => onSelectDoctor(doctor)}
                    selected={selectedDoctor?.id === doctor.id}
                    sx={{
                      border: selectedDoctor?.id === doctor.id ? 2 : 1,
                      borderColor: selectedDoctor?.id === doctor.id
                        ? 'primary.main'
                        : !doctor.isBookingEnabled
                        ? 'warning.main'
                        : 'divider',
                      borderRadius: 1,
                      bgcolor: selectedDoctor?.id === doctor.id 
                        ? 'primary.light' 
                        : 'transparent',
                      py: 0.75,
                      '&:hover': {
                        bgcolor: selectedDoctor?.id === doctor.id 
                          ? 'primary.light' 
                          : 'action.hover',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        borderColor: 'primary.main',
                        borderWidth: 2,
                        '&:hover': {
                          bgcolor: 'primary.light',
                        },
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {doctor.docName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                              ID: {doctor.id}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditDoctor(doctor);
                            }}
                            sx={{ ml: 'auto' }}
                            title="إعدادات الطبيب"
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <Typography variant="body1" color="text.secondary">
              لا يوجد أطباء متاحون لهذا التخصص
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DoctorsList;
