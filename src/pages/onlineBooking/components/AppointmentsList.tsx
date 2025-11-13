import React from "react";
import { Loader2, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { FirestoreDoctor, FirestoreAppointment } from "@/services/firestoreSpecialistService";

interface AppointmentsListProps {
  selectedDoctor: FirestoreDoctor | null;
  appointments: FirestoreAppointment[] | undefined;
  isLoading: boolean;
  error: Error | null;
  filteredAppointments: FirestoreAppointment[];
  appointmentSearch: string;
  filteredDate: string | null;
  formatDateDisplay: (dateString: string) => string;
  formatRelativeTime: (createdAt: unknown) => string;
  onSearchChange: (value: string) => void;
  onClearDateFilter: () => void;
}

const AppointmentsList: React.FC<AppointmentsListProps> = ({
  selectedDoctor,
  appointments,
  isLoading,
  error,
  filteredAppointments,
  appointmentSearch,
  filteredDate,
  formatDateDisplay,
  formatRelativeTime,
  onSearchChange,
  onClearDateFilter,
}) => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>
          المواعيد
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
            اختر طبيباً لعرض المواعيد
          </div>
        ) : isLoading ? (
          <>
            {/* Date Filter Badge */}
            {filteredDate && (
              <div className="mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
                  <span>مواعيد {formatDateDisplay(filteredDate)}</span>
                  <button
                    onClick={onClearDateFilter}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                    aria-label="إزالة فلتر التاريخ"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="بحث في المواعيد..."
                  value={appointmentSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pr-10"
                  disabled
                />
              </div>
            </div>

            {/* Skeleton Loading */}
            <div className="max-h-[500px] overflow-y-auto">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="py-3 px-2">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <div className="flex items-center justify-between mt-2">
                        <Skeleton className="h-3 w-28" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-12" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : error ? (
          <div className="text-red-500 text-center py-4">
            فشل تحميل المواعيد
          </div>
        ) : (
          <>
            {/* Date Filter Badge */}
            {filteredDate && (
              <div className="mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
                  <span>مواعيد {formatDateDisplay(filteredDate)}</span>
                  <button
                    onClick={onClearDateFilter}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                    aria-label="إزالة فلتر التاريخ"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="بحث في المواعيد..."
                  value={appointmentSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Appointments List */}
            {filteredAppointments && filteredAppointments.length > 0 ? (
              <div className="max-h-[500px] overflow-y-auto">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">
                            {appointment.patientName}
                          </div>
                          {appointment.createdAt && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {formatRelativeTime(appointment.createdAt)}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {appointment.patientPhone}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {appointment.date} - {appointment.time}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                appointment.period === "morning"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                  : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                              }`}
                            >
                              {appointment.period === "morning" ? "صباح" : "مساء"}
                            </span>
                            {appointment.isConfirmed ? (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                مؤكد
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                                غير مؤكد
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : appointmentSearch || filteredDate ? (
              <div className="text-center py-8 text-gray-500">
                {appointmentSearch
                  ? "لا توجد نتائج للبحث"
                  : "لا توجد مواعيد في هذا التاريخ"}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                لا توجد مواعيد متاحة
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsList;

