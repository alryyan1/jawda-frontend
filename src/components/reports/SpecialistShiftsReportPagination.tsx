import React from "react";
import { Button } from "@/components/ui/button";

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface SpecialistShiftsReportPaginationProps {
  meta: PaginationMeta | undefined;
  currentPage: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}

const SpecialistShiftsReportPagination: React.FC<SpecialistShiftsReportPaginationProps> = ({
  meta,
  currentPage,
  isFetching,
  onPageChange,
}) => {

  if (!meta || meta.last_page <= 1) {
    return null;
  }

  return (
    <div className="mt-6 flex items-center justify-center px-2 gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1 || isFetching}
      >
        السابق
      </Button>
      <span className="text-sm text-muted-foreground">
        صفحة {meta.current_page} من {meta.last_page}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(meta.last_page, currentPage + 1))}
        disabled={currentPage === meta.last_page || isFetching}
      >
        التالي
      </Button>
    </div>
  );
};

export default SpecialistShiftsReportPagination;

