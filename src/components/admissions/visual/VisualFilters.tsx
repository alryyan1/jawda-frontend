import { useState } from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  InputAdornment,
} from "@mui/material";
import { Search, X, Filter } from "lucide-react";
import type { Ward } from "@/types/admissions";

interface VisualFiltersProps {
  wards: Ward[];
  selectedWard: number | "";
  selectedRoomType: string;
  selectedStatus: string;
  searchTerm: string;
  onWardChange: (wardId: number | "") => void;
  onRoomTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onSearchChange: (term: string) => void;
  onQuickFilter: (filter: "available" | "occupied" | "all") => void;
}

export default function VisualFilters({
  wards,
  selectedWard,
  selectedRoomType,
  selectedStatus,
  searchTerm,
  onWardChange,
  onRoomTypeChange,
  onStatusChange,
  onSearchChange,
  onQuickFilter,
}: VisualFiltersProps) {
  const [activeQuickFilter, setActiveQuickFilter] = useState<"available" | "occupied" | "all">("all");

  const handleQuickFilter = (filter: "available" | "occupied" | "all") => {
    setActiveQuickFilter(filter);
    onQuickFilter(filter);
  };

  const hasActiveFilters = selectedWard !== "" || selectedRoomType !== "all" || selectedStatus !== "all" || searchTerm !== "";

  const clearFilters = () => {
    onWardChange("");
    onRoomTypeChange("all");
    onStatusChange("all");
    onSearchChange("");
    handleQuickFilter("all");
  };

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Filter size={20} />
        <Box component="span" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
          الفلاتر
        </Box>
        {hasActiveFilters && (
          <Chip
            label="مسح الفلاتر"
            size="small"
            onClick={clearFilters}
            onDelete={clearFilters}
            deleteIcon={<X size={16} />}
            color="default"
            variant="outlined"
          />
        )}
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <TextField
          placeholder="بحث برقم الغرفة..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          size="small"
          sx={{ minWidth: 200, flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>القسم</InputLabel>
          <Select
            value={selectedWard}
            label="القسم"
            onChange={(e) => onWardChange(e.target.value as number | "")}
          >
            <MenuItem value="">الكل</MenuItem>
            {wards.map((ward) => (
              <MenuItem key={ward.id} value={ward.id}>
                {ward.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>نوع الغرفة</InputLabel>
          <Select
            value={selectedRoomType}
            label="نوع الغرفة"
            onChange={(e) => onRoomTypeChange(e.target.value)}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="normal">عادي</MenuItem>
            <MenuItem value="vip">VIP</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>حالة الإشغال</InputLabel>
          <Select
            value={selectedStatus}
            label="حالة الإشغال"
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="available">متاح بالكامل</MenuItem>
            <MenuItem value="partial">مشغول جزئياً</MenuItem>
            <MenuItem value="occupied">مشغول بالكامل</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button
          variant={activeQuickFilter === "all" ? "contained" : "outlined"}
          size="small"
          onClick={() => handleQuickFilter("all")}
        >
          الكل
        </Button>
        <Button
          variant={activeQuickFilter === "available" ? "contained" : "outlined"}
          size="small"
          color="success"
          onClick={() => handleQuickFilter("available")}
        >
          المتاح فقط
        </Button>
        <Button
          variant={activeQuickFilter === "occupied" ? "contained" : "outlined"}
          size="small"
          color="error"
          onClick={() => handleQuickFilter("occupied")}
        >
          المشغول فقط
        </Button>
      </Box>
    </Box>
  );
}

