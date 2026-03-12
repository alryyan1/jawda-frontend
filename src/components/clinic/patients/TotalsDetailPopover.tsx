// src/components/clinic/patients/TotalsDetailPopover.tsx
import React from "react";
import { Popover, Box, Typography, CircularProgress } from "@mui/material";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { getDoctorVisitById } from "@/services/visitService";
import type { DoctorVisit, RequestedService, LabRequest } from "@/types/visits";
import { formatNumber } from "@/lib/utils";

type PopoverType = "services" | "lab";

interface TotalsDetailPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  visitId: number;
  type: PopoverType;
}

const columnHelper = createColumnHelper<{ name: string; price: number; amount_paid: number }>();

const columns: ColumnDef<{ name: string; price: number; amount_paid: number }>[] = [
  columnHelper.accessor("name", { header: "الاسم", cell: (info) => info.getValue() }),
  columnHelper.accessor("price", {
    header: "السعر",
    cell: (info) => formatNumber(info.getValue()),
  }),
  columnHelper.accessor("amount_paid", {
    header: "المدفوع",
    cell: (info) => formatNumber(info.getValue()),
  }),
];

const TotalsDetailPopover: React.FC<TotalsDetailPopoverProps> = ({
  anchorEl,
  onClose,
  visitId,
  type,
}) => {
  const open = Boolean(anchorEl);

  const { data: visit, isLoading } = useQuery<DoctorVisit>({
    queryKey: ["doctorVisit", visitId],
    queryFn: () => getDoctorVisitById(visitId),
    enabled: open && !!visitId,
  });

  const rows =
    type === "services"
      ? (visit?.requested_services ?? []).map((rs: RequestedService) => ({
          name: rs.service?.name ?? "-",
          price: rs.price * (rs.count || 1),
          amount_paid: rs.amount_paid ?? 0,
        }))
      : (visit?.lab_requests ?? []).map((lr: LabRequest) => ({
          name: lr.main_test?.main_test_name ?? "-",
          price: lr.price * (lr.count || 1),
          amount_paid: lr.amount_paid ?? 0,
        }));

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const title = type === "services" ? "الخدمات المطلوبة" : "طلبات المختبر";

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      slotProps={{ paper: { sx: { maxWidth: 400, maxHeight: 320 } } }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          {title}
        </Typography>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            لا توجد بيانات
          </Typography>
        ) : (
          <Box sx={{ overflow: "auto", maxHeight: 260 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        style={{
                          textAlign: "right",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e0e0e0",
                          fontWeight: 600,
                        }}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          textAlign: "right",
                          padding: "6px 8px",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Box>
    </Popover>
  );
};

export default TotalsDetailPopover;
