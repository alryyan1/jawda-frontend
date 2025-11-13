import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FirestoreDoctor, DaySchedule } from "@/services/firestoreSpecialistService";

interface DoctorScheduleProps {
  selectedDoctor: FirestoreDoctor | null;
  sortedScheduleDays: [string, DaySchedule][];
  scheduleDayAppointmentCounts: Record<string, number>;
  getDateForDay: (day: string) => string;
  formatDateDisplay: (dateString: string) => string;
  onDayRowClick: (day: string, dateString: string) => void;
  onDayClick: (day: string, dateString: string) => void;
}

const DoctorSchedule: React.FC<DoctorScheduleProps> = ({
  selectedDoctor,
  sortedScheduleDays,
  scheduleDayAppointmentCounts,
  getDateForDay,
  formatDateDisplay,
  onDayRowClick,
  onDayClick,
}) => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>
          الجدول الزمني
          {selectedDoctor && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mr-2">
              ({selectedDoctor.docName})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedDoctor ? (
          <div className="text-center py-8 text-gray-500">
            اختر طبيباً لعرض جدوله الزمني
          </div>
        ) : selectedDoctor.workingSchedule &&
          Object.keys(selectedDoctor.workingSchedule).length > 0 ? (
          <div className="max-h-[600px] overflow-y-auto">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedScheduleDays.map(([day, schedule]) => {
                const hasSchedule = schedule.morning || schedule.evening;
                const dateString = getDateForDay(day);
                const formattedDate = formatDateDisplay(dateString);
                return (
                  <div
                    key={day}
                    onClick={() => hasSchedule && onDayRowClick(day, dateString)}
                    className={`py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      !hasSchedule
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{day}</div>
                        {dateString &&
                          scheduleDayAppointmentCounts[dateString] !== undefined &&
                          scheduleDayAppointmentCounts[dateString] > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 min-w-[20px]">
                              {scheduleDayAppointmentCounts[dateString]}
                            </span>
                          )}
                      </div>
                      {formattedDate && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formattedDate}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-2">
                        {schedule.morning && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            صباح
                          </span>
                        )}
                        {schedule.evening && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                            مساء
                          </span>
                        )}
                      </div>
                      {hasSchedule && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDayClick(day, dateString);
                          }}
                          className="text-xs h-7 px-2"
                        >
                          حجز
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            لا يوجد جدول زمني متاح
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DoctorSchedule;

