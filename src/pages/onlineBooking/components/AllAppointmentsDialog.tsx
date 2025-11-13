import React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AppointmentWithDoctor } from "@/services/firestoreSpecialistService";

interface AllAppointmentsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: AppointmentWithDoctor[] | undefined;
  isLoading: boolean;
  formatRelativeTime: (createdAt: unknown) => string;
}

const AllAppointmentsDialog: React.FC<AllAppointmentsDialogProps> = ({
  isOpen,
  onOpenChange,
  appointments,
  isLoading,
  formatRelativeTime,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>جميع المواعيد</DialogTitle>
          <DialogDescription>عرض جميع المواعيد لجميع الأطباء</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : appointments && appointments.length > 0 ? (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {appointments.map((appointment) => (
                  <div
                    key={`${appointment.specialistId}-${appointment.doctorId}-${appointment.id}`}
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
                      <div className="flex items-center gap-2 mt-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">الطبيب:</span>{" "}
                          {appointment.doctorName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">التخصص:</span>{" "}
                          {appointment.specialistName}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              لا توجد مواعيد متاحة
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllAppointmentsDialog;

