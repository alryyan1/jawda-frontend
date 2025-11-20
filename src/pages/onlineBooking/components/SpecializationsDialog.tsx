import React, { useState, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiSpecialization } from "@/services/firestoreSpecialistService";
import { format } from "date-fns";

interface SpecializationsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  specializations: ApiSpecialization[] | undefined;
  isLoading: boolean;
}

const SpecializationsDialog: React.FC<SpecializationsDialogProps> = ({
  isOpen,
  onOpenChange,
  specializations,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Format timestamp to readable date
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "غير متاح";
    
    try {
      // If it's already a formatted string, return it
      if (typeof timestamp === "string" && timestamp.includes("at")) {
        return timestamp;
      }
      
      // Handle Firestore timestamp format
      if (timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);
        return format(date, "yyyy-MM-dd HH:mm:ss");
      }
      
      // Handle ISO string or date string
      if (typeof timestamp === "string") {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return format(date, "yyyy-MM-dd HH:mm:ss");
        }
        return timestamp; // Return as-is if not a valid date
      }
      
      // Handle Date object
      if (timestamp instanceof Date) {
        return format(timestamp, "yyyy-MM-dd HH:mm:ss");
      }
      
      // Handle number (Unix timestamp in milliseconds)
      if (typeof timestamp === "number") {
        return format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
      }
      
      return "غير متاح";
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "غير متاح";
    }
  };

  // Filter specializations based on search query
  const filteredSpecializations = useMemo(() => {
    if (!specializations) return [];
    
    if (!searchQuery.trim()) {
      return specializations.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    const query = searchQuery.toLowerCase();
    return specializations
      .filter((spec) => {
        return (
          spec.specName?.toLowerCase().includes(query) ||
          spec.order?.toString().includes(query) ||
          (spec.isActive ? "نشط" : "غير نشط").includes(query)
        );
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [specializations, searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>التخصصات</DialogTitle>
          <DialogDescription>عرض جميع التخصصات من API</DialogDescription>
        </DialogHeader>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="بحث في التخصصات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredSpecializations && filteredSpecializations.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        اسم التخصص
                      </th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        الترتيب
                      </th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        الحالة
                      </th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        تاريخ الإنشاء
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSpecializations.map((spec, index) => (
                      <tr
                        key={spec.id || index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm">
                          {spec.specName || "غير محدد"}
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-center">
                          {spec.order ?? 0}
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm">
                          <span
                            className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                              spec.isActive
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {spec.isActive ? "نشط" : "غير نشط"}
                          </span>
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatTimestamp(spec.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                إجمالي النتائج: {filteredSpecializations.length}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchQuery.trim()
                ? "لا توجد نتائج للبحث"
                : "لا توجد تخصصات متاحة"}
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

export default SpecializationsDialog;

