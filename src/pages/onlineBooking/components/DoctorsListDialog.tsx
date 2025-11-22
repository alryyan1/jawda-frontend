import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  Avatar,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import type { AllDoctor } from "@/services/firestoreSpecialistService";

interface DoctorsListDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  doctors: AllDoctor[] | undefined;
  isLoading: boolean;
}

const DoctorsListDialog: React.FC<DoctorsListDialogProps> = ({
  isOpen,
  onOpenChange,
  doctors,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter doctors based on search query (by name or id)
  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    
    if (!searchQuery.trim()) {
      return doctors;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return doctors.filter((doctor) => {
      const nameMatch = doctor.name?.toLowerCase().includes(query);
      const idMatch = doctor.id.toLowerCase().includes(query);
      return nameMatch || idMatch;
    });
  }, [doctors, searchQuery]);

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => {
        setSearchQuery("");
        onOpenChange(false);
      }}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle>
        قائمة جميع الأطباء
        {doctors && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ({filteredDoctors.length} من {doctors.length} طبيب)
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {/* Search Input */}
        <TextField
          fullWidth
          placeholder="بحث بالاسم أو المعرف..."
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

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredDoctors && filteredDoctors.length > 0 ? (
          <Box>
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                      المعرف
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                      الصورة
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      اسم الطبيب
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      التخصص
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDoctors.map((doctor) => (
                    <TableRow
                      key={doctor.id}
                      hover
                    >
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {doctor.id}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {doctor.photoUrl ? (
                          <Avatar
                            src={doctor.photoUrl}
                            alt={doctor.name}
                            sx={{ width: 50, height: 50, mx: 'auto' }}
                          />
                        ) : (
                          <Avatar sx={{ width: 50, height: 50, mx: 'auto', bgcolor: 'grey.300' }}>
                            <Typography variant="caption" color="text.secondary">
                              لا توجد صورة
                            </Typography>
                          </Avatar>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {doctor.name || "غير محدد"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {doctor.specialization || "غير محدد"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery.trim() ? "لا توجد نتائج للبحث" : "لا توجد أطباء متاحة"}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)} variant="outlined">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DoctorsListDialog;

