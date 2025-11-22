import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import type { FirestoreDoctor, DaySchedule } from "@/services/firestoreSpecialistService";

interface DoctorScheduleProps {
  selectedDoctor: FirestoreDoctor | null;
  sortedScheduleDays: [string, DaySchedule][];
  scheduleDayAppointmentCounts: Record<string, number>;
  getDateForDay: (day: string) => string;
  formatDateDisplay: (dateString: string) => string;
  onDayRowClick: (day: string, dateString: string) => void;
  onDayClick: (day: string, dateString: string) => void;
  selectedDayForViewing: string | null;
}

const DoctorSchedule: React.FC<DoctorScheduleProps> = ({
  selectedDoctor,
  sortedScheduleDays,
  scheduleDayAppointmentCounts,
  getDateForDay,
  formatDateDisplay,
  onDayRowClick,
  onDayClick,
  selectedDayForViewing,
}) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="div">
              الجدول الزمني
            </Typography>
            {selectedDoctor && (
              <Typography variant="body1" color="text.secondary" fontWeight="600">
                ({selectedDoctor.docName})
              </Typography>
            )}
          </Box>
        }
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pt: 0 }}>
        {!selectedDoctor ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              اختر طبيباً لعرض جدوله الزمني
            </Typography>
          </Box>
        ) : selectedDoctor.workingSchedule &&
          Object.keys(selectedDoctor.workingSchedule).length > 0 ? (
          <TableContainer component={Paper} sx={{ maxHeight: 600, flexGrow: 1 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>اليوم</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>عدد المواعيد</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الفترات</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الإجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedScheduleDays.map(([day, schedule]) => {
                  const hasSchedule = schedule.morning || schedule.evening;
                  const dateString = getDateForDay(day);
                  const formattedDate = formatDateDisplay(dateString);
                  const isSelected = selectedDayForViewing === day;
                  return (
                    <TableRow
                      key={day}
                      onClick={() => hasSchedule && onDayRowClick(day, dateString)}
                      sx={{
                        cursor: hasSchedule ? 'pointer' : 'not-allowed',
                        opacity: hasSchedule ? 1 : 0.5,
                        border: isSelected ? 2 : 0,
                        borderColor: isSelected ? 'primary.main' : 'transparent',
                        bgcolor: isSelected ? 'primary.light' : 'transparent',
                        '&:hover': hasSchedule 
                          ? { 
                              bgcolor: isSelected ? 'primary.light' : 'action.hover' 
                            } 
                          : {},
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {day}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formattedDate && (
                          <Typography variant="body2" color="text.secondary">
                            {formattedDate}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {dateString && (
                          <Chip
                            label={scheduleDayAppointmentCounts[dateString] || 0}
                            size="small"
                            color={scheduleDayAppointmentCounts[dateString] > 0 ? "success" : "default"}
                            sx={{ 
                              minWidth: 28, 
                              height: 24, 
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              borderRadius: '12px'
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {schedule.morning && (
                            <Chip
                              label="صباح"
                              size="small"
                              color="info"
                              sx={{ fontSize: '0.85rem', fontWeight: '600' }}
                            />
                          )}
                          {schedule.evening && (
                            <Chip
                              label="مساء"
                              size="small"
                              color="warning"
                              sx={{ fontSize: '0.85rem', fontWeight: '600' }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {hasSchedule && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDayClick(day, dateString);
                            }}
                            sx={{ fontSize: '0.9rem', fontWeight: '600', minWidth: 'auto', px: 1, py: 0.5 }}
                          >
                            حجز
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              لا يوجد جدول زمني متاح
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DoctorSchedule;
