import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface DoctorShiftsReportPaginationProps {
  meta: PaginationMeta | undefined;
  currentPage: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}

const DoctorShiftsReportPagination: React.FC<DoctorShiftsReportPaginationProps> = ({
  meta,
  currentPage,
  isFetching,
  onPageChange,
}) => {
  const { t } = useTranslation(["common"]);

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
        {t("common:previous")}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t("common:pageXOfY", {
          current: meta.current_page,
          total: meta.last_page,
        })}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(meta.last_page, currentPage + 1))}
        disabled={currentPage === meta.last_page || isFetching}
      >
        {t("common:next")}
      </Button>
    </div>
  );
};

export default DoctorShiftsReportPagination; 