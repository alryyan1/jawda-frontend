import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FirestoreSpecialist } from "@/services/firestoreSpecialistService";

interface SpecialistsListProps {
  specialists: FirestoreSpecialist[] | undefined;
  isLoading: boolean;
  error: Error | null;
  selectedSpecialistId: string | null;
  onSelectSpecialist: (specialistId: string) => void;
}

const SpecialistsList: React.FC<SpecialistsListProps> = ({
  specialists,
  isLoading,
  error,
  selectedSpecialistId,
  onSelectSpecialist,
}) => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>التخصصات</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-4">
            فشل تحميل التخصصات
          </div>
        ) : specialists && specialists.length > 0 ? (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {specialists.map((specialist) => (
              <div
                key={specialist.id}
                onClick={() => onSelectSpecialist(specialist.id)}
                className={`p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                  selectedSpecialistId === specialist.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                    : ""
                }`}
              >
                <div className="font-medium">{specialist.specName}</div>
                {specialist.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {specialist.description}
                  </div>
                )}
                {!specialist.isActive && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    غير نشط
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            لا توجد تخصصات متاحة
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialistsList;

