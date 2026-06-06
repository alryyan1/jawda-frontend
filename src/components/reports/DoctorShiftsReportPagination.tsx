import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from "lucide-react";

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

function buildPages(current: number, last: number): (number | "...")[] {
  if (last <= 9) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  const addRange = (from: number, to: number) => {
    for (let i = from; i <= to; i++) pages.push(i);
  };
  pages.push(1);
  if (current > 4) pages.push("...");
  addRange(Math.max(2, current - 2), Math.min(last - 1, current + 2));
  if (current < last - 3) pages.push("...");
  pages.push(last);
  return pages;
}

const DoctorShiftsReportPagination: React.FC<DoctorShiftsReportPaginationProps> = ({
  meta, currentPage, isFetching, onPageChange,
}) => {
  if (!meta || meta.last_page <= 1) return null;

  const pages = buildPages(currentPage, meta.last_page);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1 px-2">
      {/* First */}
      <Button variant="outline" size="sm" className="px-2"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1 || isFetching}
      >
        <ChevronsRight className="h-3.5 w-3.5" />
      </Button>

      {/* Prev */}
      <Button variant="outline" size="sm" className="px-2"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isFetching}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
        ) : (
          <Button
            key={p}
            size="sm"
            variant={p === currentPage ? "default" : "outline"}
            className="min-w-[2rem] px-2"
            onClick={() => onPageChange(p as number)}
            disabled={isFetching}
          >
            {p}
          </Button>
        )
      )}

      {/* Next */}
      <Button variant="outline" size="sm" className="px-2"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === meta.last_page || isFetching}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {/* Last */}
      <Button variant="outline" size="sm" className="px-2"
        onClick={() => onPageChange(meta.last_page)}
        disabled={currentPage === meta.last_page || isFetching}
      >
        <ChevronsLeft className="h-3.5 w-3.5" />
      </Button>

      <span className="text-xs text-muted-foreground mr-2">
        {meta.total.toLocaleString()} إجمالي
      </span>
    </div>
  );
};

export default DoctorShiftsReportPagination;
