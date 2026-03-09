import { useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Avatar,
  useTheme,
} from "@mui/material";
import { getWardsList, getWardById } from "@/services/wardService";
import type { Ward, Room, Bed as BedType } from "@/types/admissions";

export interface BedSelection {
  id: number;
  bed_number: string;
  room?: Room;
  room_id?: number;
  wardName?: string;
}

export interface DraggablePatient {
  patientId: number;
  patientName: string;
}

export interface BedMapProps {
  onSelectBed: (selection: BedSelection) => void;
  onClose?: () => void;
  selectedBedId?: number | null;
  disabledBedIds?: number[];
  /** Patients to show as draggable chips; drag onto a bed to assign. */
  draggablePatients?: DraggablePatient[];
  /** Called when a patient is dropped on a bed (assigns that bed to the patient). */
  onDropPatient?: (patientId: number, selection: BedSelection) => void;
  /** When true, show loading overlay (e.g. while assigning/updating a bed). */
  isUpdatingBed?: boolean;
}

const DRAG_TYPE_PATIENT = "application/x-jawda-patient";

const BED_STATUS = {
  available: {
    label: "متاح",
    bg: "#e8f5e9",
    border: "#4caf50",
    color: "#2e7d32",
  },
  occupied: {
    label: "محجوز",
    bg: "#ffebee",
    border: "#f44336",
    color: "#c62828",
  },
  maintenance: {
    label: "صيانة",
    bg: "#fafafa",
    border: "#9e9e9e",
    color: "#616161",
  },
} as const;

function getBedStyle(
  bed: BedType,
  disabledBedIds: number[],
  selectedBedId: number | null,
  theme: ReturnType<typeof useTheme>
) {
  const isDisabled = bed.status === "occupied" || disabledBedIds.includes(bed.id);
  const isSelected = selectedBedId === bed.id;

  if (isSelected) {
    return {
      bgcolor: theme.palette.background.paper,
      border: `3px solid ${theme.palette.primary.main}`,
      color: theme.palette.text.primary,
      cursor: "default" as const,
    };
  }

  if (bed.status === "maintenance") {
    return {
      bgcolor: theme.palette.background.paper,
      border: `2px solid ${BED_STATUS.maintenance.border}`,
      color: BED_STATUS.maintenance.color,
      cursor: "not-allowed" as const,
    };
  }

  if (isDisabled) {
    return {
      bgcolor: theme.palette.background.paper,
      border: `2px solid ${BED_STATUS.occupied.border}`,
      color: theme.palette.text.primary,
      cursor: "not-allowed" as const,
    };
  }

  return {
    bgcolor: theme.palette.background.paper,
    border: `2px solid ${BED_STATUS.available.border}`,
    color: theme.palette.text.primary,
    cursor: "pointer" as const,
  };
}

export default function BedMap({
  onSelectBed,
  selectedBedId = null,
  disabledBedIds = [],
  draggablePatients = [],
  onDropPatient,
  isUpdatingBed = false,
}: BedMapProps) {
  const theme = useTheme();
  const [dragOverBedId, setDragOverBedId] = useState<number | null>(null);

  const handleBedDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE_PATIENT)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleBedDrop = (
    e: React.DragEvent,
    bed: BedType,
    room: Room,
    ward: Ward & { rooms?: Room[] }
  ) => {
    e.preventDefault();
    setDragOverBedId(null);
    const raw = e.dataTransfer.getData(DRAG_TYPE_PATIENT);
    if (!raw || !onDropPatient) return;
    try {
      const payload = JSON.parse(raw) as { patientId: number; sourceBedId?: number };
      const { patientId, sourceBedId } = payload;
      if (bed.status === "occupied" || disabledBedIds.includes(bed.id)) return;
      if (sourceBedId != null && sourceBedId === bed.id) return; // same bed, no-op
      onDropPatient(patientId, {
        id: bed.id,
        bed_number: bed.bed_number,
        room,
        room_id: room.id,
        wardName: ward.name,
      });
    } catch {
      // ignore invalid drag data
    }
  };

  const { data: wardsList = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["wardsList", "bedmap"],
    queryFn: () => getWardsList({ status: true }),
  });

  const wardIds = (wardsList as Ward[])?.map((w) => w.id) ?? [];
  const wardQueries = useQueries({
    queries: wardIds.map((id) => ({
      queryKey: ["ward", id],
      queryFn: () => getWardById(id).then((r) => r.data),
      enabled: !!id,
    })),
  });

  const wardsWithRooms = wardQueries
    .map((q) => q.data)
    .filter((w): w is Ward & { rooms?: Room[] } => !!w);
  const isLoadingWards = wardQueries.some((q) => q.isLoading);

  const isLoading = isLoadingList || isLoadingWards;

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 160,
          p: 2,
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!wardsWithRooms.length) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">لا توجد أقسام متاحة.</Typography>
      </Box>
    );
  }

  // Patient IDs already assigned to a bed (from current ward/room/bed data)
  const assignedPatientIds = useMemo(() => {
    const ids = new Set<number>();
    for (const ward of wardsWithRooms) {
      for (const room of ward.rooms ?? []) {
        for (const bed of room.beds ?? []) {
          const pid = bed.current_admission?.patient_id ?? (bed.current_admission?.patient as { id?: number } | undefined)?.id;
          if (pid != null) ids.add(pid);
        }
      }
    }
    return ids;
  }, [wardsWithRooms]);

  const patientsWithoutBed = useMemo(
    () => draggablePatients.filter((p) => !assignedPatientIds.has(p.patientId)),
    [draggablePatients, assignedPatientIds]
  );

  return (
    <Box sx={{ position: "relative", p: 1.25, maxHeight: "70vh", overflow: "auto" }}>
      {isUpdatingBed && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(255,255,255,0.7)",
            zIndex: 10,
            borderRadius: 1,
          }}
        >
          <CircularProgress size={40} />
        </Box>
      )}
      {/* Draggable patients: drag onto a bed to assign (only those not yet in a bed) */}
      {patientsWithoutBed.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            mb: 1.25,
            pb: 1.25,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", mr: 0.5 }}>
            اسحب المريض إلى السرير:
          </Typography>
          {patientsWithoutBed.map(({ patientId, patientName }) => (
            <Chip
              key={patientId}
              size="small"
              label={patientName || `#${patientId}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  DRAG_TYPE_PATIENT,
                  JSON.stringify({ patientId, patientName })
                );
                e.dataTransfer.effectAllowed = "move";
              }}
              sx={{
                cursor: "grab",
                "&:active": { cursor: "grabbing" },
              }}
            />
          ))}
        </Box>
      )}

      {/* Legend */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          mb: 1.25,
          pb: 1.25,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Chip
          size="small"
          label={BED_STATUS.available.label}
          sx={{
            bgcolor: BED_STATUS.available.bg,
            border: `1px solid ${BED_STATUS.available.border}`,
            color: BED_STATUS.available.color,
            fontWeight: 600,
          }}
        />
        <Chip
          size="small"
          label={BED_STATUS.occupied.label}
          sx={{
            bgcolor: BED_STATUS.occupied.bg,
            border: `1px solid ${BED_STATUS.occupied.border}`,
            color: BED_STATUS.occupied.color,
            fontWeight: 600,
          }}
        />
        <Chip
          size="small"
          label={BED_STATUS.maintenance.label}
          sx={{
            bgcolor: BED_STATUS.maintenance.bg,
            border: `1px solid ${BED_STATUS.maintenance.border}`,
            color: BED_STATUS.maintenance.color,
            fontWeight: 600,
          }}
        />
        {selectedBedId && (
          <Chip
            size="small"
            label="المحدد"
            color="primary"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Wards → Rooms → Beds (2 wards per row) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 1.25,
        }}
      >
        {wardsWithRooms.map((ward) => (
          <Card
            key={ward.id}
            variant="outlined"
            sx={{
              borderRadius: 1.5,
              overflow: "hidden",
            }}
          >
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              bgcolor: "grey.100",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              {ward.name}
            </Typography>
          </Box>
          <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
            {(!ward.rooms || ward.rooms.length === 0) ? (
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                لا توجد غرف
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {ward.rooms!.map((room) => (
                  <Box key={room.id}>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ mb: 0.5, display: "block" }}
                    >
                      غرفة {room.room_number}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.75,
                      }}
                    >
                      {(room.beds ?? []).map((bed) => {
                        const isOccupied =
                          bed.status === "occupied" ||
                          disabledBedIds.includes(bed.id);
                        const isSelected = selectedBedId === bed.id;
                        const patientName =
                          bed.current_admission?.patient?.name ?? null;
                        const patientIdFromBed =
                          bed.current_admission?.patient_id ??
                          (bed.current_admission?.patient as { id?: number } | undefined)?.id;
                        const canDragFromBed =
                          !!onDropPatient && !!patientName && patientIdFromBed != null;
                        const style = getBedStyle(
                          bed,
                          disabledBedIds,
                          selectedBedId,
                          theme
                        );
                        const isDragOverFreeBed =
                          !isOccupied && onDropPatient && dragOverBedId === bed.id;

                        return (
                          <Card
                            key={bed.id}
                            variant="outlined"
                            draggable={canDragFromBed}
                            onDragStart={
                              canDragFromBed
                                ? (e) => {
                                    e.dataTransfer.setData(
                                      DRAG_TYPE_PATIENT,
                                      JSON.stringify({
                                        patientId: patientIdFromBed,
                                        patientName: patientName ?? "",
                                        sourceBedId: bed.id,
                                      })
                                    );
                                    e.dataTransfer.effectAllowed = "move";
                                  }
                                : undefined
                            }
                            onDragEnter={
                              onDropPatient && !isOccupied
                                ? () => setDragOverBedId(bed.id)
                                : undefined
                            }
                            onDragLeave={
                              onDropPatient && !isOccupied
                                ? () => setDragOverBedId(null)
                                : undefined
                            }
                            sx={{
                              width: 120,
                              minHeight: 56,
                              borderRadius: 1.25,
                              transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                              ...style,
                              ...(canDragFromBed && { cursor: "grab", "&:active": { cursor: "grabbing" } }),
                              ...(isDragOverFreeBed && {
                                transform: "scale(1.05)",
                                boxShadow: 2,
                                borderColor: BED_STATUS.available.border,
                              }),
                              "&:hover": isOccupied || isSelected
                                ? {}
                                : {
                                    boxShadow: 1,
                                    borderColor: BED_STATUS.available.border,
                                  },
                            }}
                            onDragOver={onDropPatient ? handleBedDragOver : undefined}
                            onDrop={
                              onDropPatient && !isOccupied
                                ? (e) => handleBedDrop(e, bed, room, ward)
                                : undefined
                            }
                            onClick={() => {
                              if (isOccupied) return;
                              onSelectBed({
                                id: bed.id,
                                bed_number: bed.bed_number,
                                room,
                                room_id: room.id,
                                wardName: ward.name,
                              });
                            }}
                          >
                            <CardContent sx={{ py: 0.5, px: 1, "&:last-child": { pb: 0.5 } }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                  mb: patientName ? 0.25 : 0,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    bgcolor: "grey.300",
                                    color: "grey.800",
                                  }}
                                >
                                  {bed.bed_number}
                                </Avatar>
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{ color: "inherit", fontSize: "0.7rem" }}
                                >
                                  سرير {bed.bed_number}
                                </Typography>
                              </Box>
                              {patientName && (
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{
                                    display: "block",
                                    color: "inherit",
                                    lineHeight: 1.2,
                                    fontSize: "0.8rem",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {patientName}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
        ))}
      </Box>
    </Box>
  );
}
