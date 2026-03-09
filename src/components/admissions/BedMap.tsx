import { useQuery, useQueries } from "@tanstack/react-query";
import { Box, Typography, CircularProgress, Chip } from "@mui/material";
import { Bed } from "lucide-react";
import { getWardsList, getWardById } from "@/services/wardService";
import type { Ward, Room, Bed as BedType } from "@/types/admissions";

export interface BedSelection {
  id: number;
  bed_number: string;
  room?: Room;
  room_id?: number;
  wardName?: string;
}

export interface BedMapProps {
  onSelectBed: (selection: BedSelection) => void;
  onClose?: () => void;
  selectedBedId?: number | null;
  disabledBedIds?: number[];
}

export default function BedMap({
  onSelectBed,
  selectedBedId = null,
  disabledBedIds = [],
}: BedMapProps) {
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
          minHeight: 200,
          p: 3,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!wardsWithRooms.length) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">لا توجد أقسام متاحة.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxHeight: "70vh", overflow: "auto" }}>
      {wardsWithRooms.map((ward) => (
        <Box key={ward.id} sx={{ mb: 3 }}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ mb: 1.5, color: "text.primary" }}
          >
            {ward.name}
          </Typography>
          {(!ward.rooms || ward.rooms.length === 0) ? (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              لا توجد غرف
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {ward.rooms!.map((room) => (
                <Box
                  key={room.id}
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ minWidth: 80 }}
                  >
                    غرفة {room.room_number}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {(room.beds ?? []).map((bed) => {
                      const isOccupied =
                        bed.status === "occupied" ||
                        disabledBedIds.includes(bed.id);
                      const isSelected = selectedBedId === bed.id;
                      return (
                        <Chip
                          key={bed.id}
                          icon={<Bed size={14} />}
                          label={bed.bed_number}
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
                          disabled={isOccupied}
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                          sx={{
                            cursor: isOccupied ? "not-allowed" : "pointer",
                            opacity: isOccupied ? 0.7 : 1,
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
