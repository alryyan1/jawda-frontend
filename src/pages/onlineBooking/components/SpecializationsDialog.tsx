import React, { useState, useMemo } from "react";
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
  Chip,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import type { ApiSpecialization } from "@/services/firestoreSpecialistService";
import { format } from "date-fns";

interface SpecializationsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  specializations: ApiSpecialization[] | undefined;
  isLoading: boolean;
}

const SpecializationsDialog: React.FC<SpecializationsDialogProps> = ({
  isOpen,
  onOpenChange,
  specializations,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Format timestamp to readable date
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "غير متاح";
    
    try {
      // If it's already a formatted string, return it
      if (typeof timestamp === "string" && timestamp.includes("at")) {
        return timestamp;
      }
      
      // Handle Firestore timestamp format
      if (timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);
        return format(date, "yyyy-MM-dd HH:mm:ss");
      }
      
      // Handle ISO string or date string
      if (typeof timestamp === "string") {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return format(date, "yyyy-MM-dd HH:mm:ss");
        }
        return timestamp; // Return as-is if not a valid date
      }
      
      // Handle Date object
      if (timestamp instanceof Date) {
        return format(timestamp, "yyyy-MM-dd HH:mm:ss");
      }
      
      // Handle number (Unix timestamp in milliseconds)
      if (typeof timestamp === "number") {
        return format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
      }
      
      return "غير متاح";
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "غير متاح";
    }
  };

  // Filter specializations based on search query
  const filteredSpecializations = useMemo(() => {
    if (!specializations) return [];
    
    if (!searchQuery.trim()) {
      return specializations.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    const query = searchQuery.toLowerCase();
    return specializations
      .filter((spec) => {
        return (
          spec.specName?.toLowerCase().includes(query) ||
          spec.order?.toString().includes(query) ||
          (spec.isActive ? "نشط" : "غير نشط").includes(query)
        );
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [specializations, searchQuery]);

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
      <DialogTitle>التخصصات</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          عرض جميع التخصصات من API
        </Typography>
        
        {/* Search Input */}
        <TextField
          fullWidth
          placeholder="بحث في التخصصات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ mb: 2 }}
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
        ) : filteredSpecializations && filteredSpecializations.length > 0 ? (
          <Box>
            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      اسم التخصص
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      الترتيب
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      الحالة
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      تاريخ الإنشاء
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSpecializations.map((spec, index) => (
                    <TableRow
                      key={spec.id || index}
                      hover
                    >
                      <TableCell align="right">
                        {spec.specName || "غير محدد"}
                      </TableCell>
                      <TableCell align="center">
                        {spec.order ?? 0}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={spec.isActive ? "نشط" : "غير نشط"}
                          size="small"
                          color={spec.isActive ? "success" : "error"}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>
                        {formatTimestamp(spec.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              إجمالي النتائج: {filteredSpecializations.length}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              {searchQuery.trim()
                ? "لا توجد نتائج للبحث"
                : "لا توجد تخصصات متاحة"}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onOpenChange(false)}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SpecializationsDialog;
