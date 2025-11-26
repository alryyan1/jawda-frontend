import React from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TablePagination,
  TextField,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { getDeletedRequestedServiceDeposits } from "@/services/deletedRequestedServiceDepositService";
import type { RequestedServiceDepositDeletion } from "@/types/services";

const DeletedServiceDepositsPage: React.FC = () => {
  const [page, setPage] = React.useState(0); // zero-based for MUI
  const [rowsPerPage, setRowsPerPage] = React.useState(50);
  const [searchName, setSearchName] = React.useState("");
  const [fromDate, setFromDate] = React.useState(
    dayjs().format("YYYY-MM-DD")
  );
  const [toDate, setToDate] = React.useState(dayjs().format("YYYY-MM-DD"));

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "deletedRequestedServiceDeposits",
      page + 1,
      rowsPerPage,
      searchName,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      getDeletedRequestedServiceDeposits({
        page: page + 1,
        per_page: rowsPerPage,
        service_name: searchName || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
    keepPreviousData: true,
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const rows: RequestedServiceDepositDeletion[] = data?.data ?? [];
  const total = data?.meta?.total ?? rows.length;

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom fontWeight={700}>
        تقرير إلغاء السدادات
      </Typography>

      <Box
        mb={2}
        display="flex"
        flexWrap="wrap"
        gap={2}
        alignItems="center"
        justifyContent="flex-start"
      >
        <TextField
          label="بحث بالاسم (الخدمة / المستخدم)"
          variant="outlined"
          size="small"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <TextField
          label="من تاريخ (تاريخ الحذف)"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <TextField
          label="إلى تاريخ (تاريخ الحذف)"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Box py={4}>
          <Typography color="error" align="center">
            حدث خطأ أثناء تحميل تقرير الغاء السدادات.
          </Typography>
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center">الخدمة المحذوفة</TableCell>
                  <TableCell align="center">مبلغ الدفعة</TableCell>
                  <TableCell align="center">طريقة الدفع</TableCell>
                  <TableCell align="center">المستخدم (سجل الدفعة)</TableCell>
                  <TableCell align="center">المستخدم (ألغى الدفعة)</TableCell>
                  <TableCell align="center">تاريخ إنشاء الدفعة</TableCell>
                  <TableCell align="center">تاريخ الحذف</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      لا توجد دفعات محذوفة.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell align="center">
                        {row.requested_service?.service?.name ??
                          `خدمة رقم ${row.requested_service_id}`}
                      </TableCell>
                      <TableCell align="center">
                        {row.amount.toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        {row.is_bank ? "بنكك" : "كاش"}
                      </TableCell>
                      <TableCell align="center">
                        {row.user?.name ?? "غير معروف"}
                      </TableCell>
                      <TableCell align="center">
                        {row.deleted_by_user?.name ?? "غير معروف"}
                      </TableCell>
                      <TableCell align="center">
                        {row.original_created_at
                          ? dayjs(row.original_created_at).format(
                              "DD/MM/YYYY HH:mm"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell align="center">
                        {row.deleted_at
                          ? dayjs(row.deleted_at).format("DD/MM/YYYY HH:mm")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </Paper>
      )}
    </Box>
  );
};

export default DeletedServiceDepositsPage;


