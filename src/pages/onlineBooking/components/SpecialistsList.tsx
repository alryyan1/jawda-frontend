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
  Chip,
} from "@mui/material";
import type { FirestoreSpecialist } from "@/services/firestoreSpecialistService";

interface SpecialistsListProps {
  specialists: FirestoreSpecialist[] | undefined;
  isLoading: boolean;
  error: Error | null;
  selectedSpecialistId: string | null;
  onSelectSpecialist: (specialistId: string) => void;
}

const SpecialistsList: React.FC<SpecialistsListProps> = ({
  specialists,
  isLoading,
  error,
  selectedSpecialistId,
  onSelectSpecialist,
}) => {
  return (
    <Card sx={{ height: window.innerHeight - 100, display: 'flex', flexDirection: 'column' }}>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pt: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 1 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>
            فشل تحميل التخصصات
          </Typography>
        ) : specialists && specialists.length > 0 ? (
          <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
            <List sx={{ p: 0 }}>
              {specialists.map((specialist) => (
                <ListItem key={specialist.id} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => onSelectSpecialist(specialist.id)}
                    selected={selectedSpecialistId === specialist.id}
                    sx={{
                      border: 1,
                      borderColor: selectedSpecialistId === specialist.id ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      bgcolor: selectedSpecialistId === specialist.id ? 'action.selected' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {specialist.specName}
                          </Typography>
                          {!specialist.isActive && (
                            <Chip
                              label="غير نشط"
                              size="small"
                              color="default"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        specialist.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {specialist.description}
                          </Typography>
                        )
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              لا توجد تخصصات متاحة
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialistsList;
