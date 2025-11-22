import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { Autocomplete } from "@mui/material";
import { toast } from "sonner";
import type { AllDoctor } from "@/services/firestoreSpecialistService";
import { getDoctorsList, updateDoctorFirebaseId, getDoctors } from "@/services/doctorService";
import type { DoctorStripped } from "@/types/doctors";
import type { Doctor } from "@/types/doctors";

// Extended type to include firebase_id which may be present in API response
interface DoctorStrippedWithFirebase extends DoctorStripped {
  firebase_id?: string | null;
}

interface AllDoctorsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  doctors: AllDoctor[] | undefined;
  isLoading: boolean;
}

const AllDoctorsDialog: React.FC<AllDoctorsDialogProps> = ({
  isOpen,
  onOpenChange,
  doctors,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctors, setSelectedDoctors] = useState<Record<number, AllDoctor | null>>({});
  const initializedRef = useRef(false);

  // Fetch doctors from local DB - try to get full doctor data to ensure firebase_id is included
  const { data: localDoctors, isLoading: isLoadingLocalDoctors } = useQuery<DoctorStripped[], Error>({
    queryKey: ["localDoctors"],
    queryFn: async () => {
      // Fetch all doctors by paginating through all pages
      try {
        let allDoctors: Doctor[] = [];
        let currentPage = 1;
        let hasMorePages = true;
        
        while (hasMorePages) {
          const response = await getDoctors(currentPage, { per_page: 1000 });
          allDoctors = [...allDoctors, ...response.data];
          
          // Check if there are more pages
          hasMorePages = currentPage < response.meta.last_page;
          currentPage++;
        }
        
        // Map full Doctor objects to DoctorStripped format but keep firebase_id
        const doctorsWithFirebase = allDoctors.map((doc: Doctor) => ({
          id: doc.id,
          name: doc.name,
          specialist_name: doc.specialist_name,
          firebase_id: doc.firebase_id,
        })) as DoctorStrippedWithFirebase[];
        
        return doctorsWithFirebase;
      } catch (error) {
        // Fallback to stripped list if full data fails
        console.warn('Failed to fetch full doctors, falling back to stripped list:', error);
        return await getDoctorsList();
      }
    },
    enabled: isOpen,
    // staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Reset initialization when dialog closes
  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      setSelectedDoctors({});
    }
  }, [isOpen]);

  // Initialize selected doctors based on firebase_id when data is loaded
  useEffect(() => {
    if (localDoctors && doctors && doctors.length > 0 && !initializedRef.current) {
      const initialSelections: Record<number, AllDoctor | null> = {};
      
      localDoctors.forEach((localDoctor) => {
        // Check if local doctor has firebase_id and find matching Firestore doctor
        const doctorWithFirebase = localDoctor as DoctorStrippedWithFirebase;
        const firebaseId = doctorWithFirebase.firebase_id;
        
        if (firebaseId) {
          // Find the exact object from the doctors array to ensure reference equality
          const matchingFirestoreDoctor = doctors.find((doc) => doc.id === firebaseId);
          if (matchingFirestoreDoctor) {
            initialSelections[localDoctor.id] = matchingFirestoreDoctor;
          }
        }
      });
      
      if (Object.keys(initialSelections).length > 0) {
        setSelectedDoctors(initialSelections);
      }
      
      initializedRef.current = true;
    }
  }, [localDoctors, doctors]);

  // Update doctor firebase_id mutation
  const updateFirebaseIdMutation = useMutation({
    mutationFn: async ({ doctorId, firebaseId }: { doctorId: number; firebaseId: string }) => {
      return updateDoctorFirebaseId(doctorId, firebaseId);
    },
    onSuccess: (data, variables) => {
      toast.success(`تم تحديث firebase_id للطبيب ${data.name} بنجاح`);
      // Update the selected doctor in state
      const localDoctorId = variables.doctorId;
      const selectedFirestoreDoctor = selectedDoctors[localDoctorId];
      if (selectedFirestoreDoctor) {
        setSelectedDoctors((prev) => ({
          ...prev,
          [localDoctorId]: selectedFirestoreDoctor,
        }));
      }
    },
    onError: (error: Error) => {
      toast.error(`فشل تحديث firebase_id: ${error.message}`);
    },
  });

  // Handle doctor selection from autocomplete
  const handleDoctorSelect = (localDoctorId: number, firestoreDoctor: AllDoctor | null) => {
    if (!firestoreDoctor) {
      // Clear selection
      setSelectedDoctors((prev) => {
        const updated = { ...prev };
        delete updated[localDoctorId];
        return updated;
      });
      return;
    }

    // Update the selected doctor in state
    setSelectedDoctors((prev) => ({
      ...prev,
      [localDoctorId]: firestoreDoctor,
    }));

    // Update the doctor's firebase_id
    updateFirebaseIdMutation.mutate({
      doctorId: localDoctorId,
      firebaseId: firestoreDoctor.id,
    });
  };

  // Filter local doctors based on search query
  const filteredDoctors = useMemo(() => {
    if (!localDoctors) return [];
    
    if (!searchQuery.trim()) {
      return localDoctors.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const query = searchQuery.toLowerCase();
    return localDoctors
      .filter((doctor) => {
        return (
          doctor.name?.toLowerCase().includes(query) ||
          doctor.specialist_name?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [localDoctors, searchQuery]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle>
        جميع الأطباء
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          عرض جميع الأطباء من قاعدة البيانات المحلية
        </Typography>
        
        {/* Search Input */}
        <TextField
          fullWidth
          placeholder="بحث في الأطباء..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {isLoadingLocalDoctors ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredDoctors && filteredDoctors.length > 0 ? (
          <Box>
            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      اسم الطبيب (قاعدة البيانات)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      التخصص
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 250 }}>
                      ربط بطبيب من Firestore
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDoctors.map((doctor) => {
                    const localDoctorId = doctor.id;
                    const selectedFirestoreDoctor = selectedDoctors[localDoctorId];
                    const isUpdating = updateFirebaseIdMutation.isPending && 
                      updateFirebaseIdMutation.variables?.doctorId === localDoctorId;

                    return (
                      <TableRow
                        key={localDoctorId}
                        hover
                      >
                        <TableCell align="right">
                          {doctor.name || "غير محدد"}
                        </TableCell>
                        <TableCell align="right">
                          {doctor.specialist_name || "غير محدد"}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ minWidth: 250 }}>
                            <Autocomplete
                              options={doctors || []}
                              getOptionLabel={(option) => option.name || ""}
                              value={selectedFirestoreDoctor || null}
                              onChange={(_, newValue) => {
                                handleDoctorSelect(localDoctorId, newValue);
                              }}
                              loading={isLoading || isUpdating}
                              disabled={isLoading || isUpdating}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder={
                                    isLoading
                                      ? "جاري التحميل..."
                                      : "اختر طبيب من Firestore"
                                  }
                                  size="small"
                                />
                              )}
                              isOptionEqualToValue={(option, value) => option.id === value.id}
                            />
                            {selectedFirestoreDoctor && (
                              <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                                ✓ مرتبط: {selectedFirestoreDoctor.name}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              إجمالي النتائج: {filteredDoctors.length}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              {searchQuery.trim()
                ? "لا توجد نتائج للبحث"
                : "لا يوجد أطباء متاحون"}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AllDoctorsDialog;

