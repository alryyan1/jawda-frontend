import React from "react";
import { Loader2, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FirestoreDoctor, FirestoreSpecialist } from "@/services/firestoreSpecialistService";

interface DoctorsListProps {
  doctors: FirestoreDoctor[] | undefined;
  isLoading: boolean;
  error: Error | null;
  selectedSpecialistId: string | null;
  selectedDoctor: FirestoreDoctor | null;
  specialists: FirestoreSpecialist[] | undefined;
  doctorAppointmentCounts: Record<string, number>;
  onSelectDoctor: (doctor: FirestoreDoctor) => void;
  onEditDoctor: (doctor: FirestoreDoctor) => void;
}

const DoctorsList: React.FC<DoctorsListProps> = ({
  doctors,
  isLoading,
  error,
  selectedSpecialistId,
  selectedDoctor,
  specialists,
  doctorAppointmentCounts,
  onSelectDoctor,
  onEditDoctor,
}) => {
  const specialistName = specialists?.find((s) => s.id === selectedSpecialistId)?.specName;

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>
          الأطباء
          {selectedSpecialistId && specialistName && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mr-2">
              ({specialistName})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedSpecialistId ? (
          <div className="text-center py-8 text-gray-500">
            اختر تخصصاً لعرض الأطباء
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-4">
            فشل تحميل الأطباء
          </div>
        ) : doctors && doctors.length > 0 ? (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                onClick={() => onSelectDoctor(doctor)}
                className={`p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                  selectedDoctor?.id === doctor.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {doctor.photoUrl ? (
                    <img
                      src={doctor.photoUrl}
                      alt={doctor.docName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">
                        {doctor.docName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{doctor.docName}</div>
                        {doctorAppointmentCounts[doctor.id] !== undefined &&
                          doctorAppointmentCounts[doctor.id] > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 min-w-[20px]">
                              {doctorAppointmentCounts[doctor.id]}
                            </span>
                          )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditDoctor(doctor);
                        }}
                        className="h-8 w-8 p-0"
                        title="إعدادات الطبيب"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                    {doctor.phoneNumber && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {doctor.phoneNumber}
                      </div>
                    )}
                    {!doctor.isActive && (
                      <div className="text-xs text-red-500 mt-1">غير نشط</div>
                    )}
                    {!doctor.isBookingEnabled && (
                      <div className="text-xs text-orange-500 mt-1">
                        الحجز غير متاح
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            لا يوجد أطباء متاحون لهذا التخصص
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DoctorsList;

