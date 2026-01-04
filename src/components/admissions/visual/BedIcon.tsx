import { useDraggable } from "@dnd-kit/core";
import { Tooltip, Box, Typography } from "@mui/material";
import { BedDouble } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import type { Bed } from "@/types/admissions";

interface BedIconProps {
  bed: Bed;
  roomId: number;
  isDragging?: boolean;
}

export default function BedIcon({ bed, roomId, isDragging }: BedIconProps) {
  const navigate = useNavigate();
  const hasDraggedRef = useRef(false);
  
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingState } = useDraggable({
    id: `bed-${bed.id}`,
    data: {
      bed,
      roomId,
      admission: bed.current_admission,
    },
    disabled: bed.status !== "occupied" || !bed.current_admission,
  });

  // Track if dragging is happening
  useEffect(() => {
    if (isDraggingState) {
      hasDraggedRef.current = true;
    } else {
      // Reset after drag ends
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 100);
    }
  }, [isDraggingState]);

  const getBedColor = () => {
    if (bed.status === "maintenance") return "#9e9e9e"; // Gray
    if (bed.status === "occupied") return "#f44336"; // Red
    return "#4caf50"; // Green (available)
  };

  const getBedBgColor = () => {
    if (bed.status === "maintenance") return "#e0e0e0";
    if (bed.status === "occupied") return "#ffebee";
    return "#e8f5e9";
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDraggingState ? 0.5 : 1,
      }
    : {};

  const isDraggable = bed.status === "occupied" && bed.current_admission;

  const handleClick = (e: React.MouseEvent) => {
    // Only navigate if:
    // 1. Bed has an admission
    // 2. Not currently dragging
    // 3. No drag occurred (transform is null or hasn't changed)
    if (
      bed.current_admission?.id &&
      !isDraggingState &&
      !hasDraggedRef.current &&
      !transform
    ) {
      e.stopPropagation();
      navigate(`/admissions/${bed.current_admission.id}`);
    }
  };

  const tooltipContent = bed.current_admission ? (
    <Box sx={{ p: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {bed.current_admission.patient?.name || "مريض"}
      </Typography>
      <Typography variant="caption" display="block">
        الطبيب: {bed.current_admission.doctor?.name || "غير محدد"}
      </Typography>
      {bed.current_admission.specialist_doctor?.name && 
       bed.current_admission.specialist_doctor?.name !== bed.current_admission.doctor?.name && (
        <Typography variant="caption" display="block">
          الطبيب الأخصائي: {bed.current_admission.specialist_doctor.name}
        </Typography>
      )}
    </Box>
  ) : (
    <Typography variant="body2">سرير متاح</Typography>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Box
        ref={setNodeRef}
        style={style}
        {...(isDraggable ? { ...listeners, ...attributes } : {})}
        onClick={handleClick}
        sx={{
          width: 50,
          height: 50,
          borderRadius: 2,
          border: `2px solid ${getBedColor()}`,
          bgcolor: getBedBgColor(),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: bed.current_admission ? "pointer" : isDraggable ? "grab" : "default",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: isDraggable ? "scale(1.1)" : "scale(1.05)",
            boxShadow: 3,
            zIndex: 10,
          },
          "&:active": {
            cursor: isDraggable ? "grabbing" : bed.current_admission ? "pointer" : "default",
            transform: isDraggable ? "scale(0.95)" : "scale(1)",
          },
          opacity: isDraggingState ? 0.5 : 1,
          position: "relative",
        }}
      >
        <BedDouble
          size={24}
          color={getBedColor()}
          style={{
            opacity: bed.status === "maintenance" ? 0.5 : 1,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: getBedColor(),
            mt: 0.25,
          }}
        >
          {bed.bed_number}
        </Typography>
      </Box>
    </Tooltip>
  );
}

