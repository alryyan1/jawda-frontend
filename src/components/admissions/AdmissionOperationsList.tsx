import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { Plus, Trash2, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import apiClient, { API_BASE_URL } from "@/services/api";
import AddAdmissionOperationDialog from "./AddAdmissionOperationDialog";

import { Operation } from "@/types/operations";
import { operationService } from "@/services/operationService";
import OperationFinanceForm from "@/components/operations/OperationFinanceForm";

interface AdmissionOperationsListProps {
  admissionId: number;
}

export default function AdmissionOperationsList({
  admissionId,
}: AdmissionOperationsListProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Fetch Operations
  const { data: operations = [], isLoading } = useQuery({
    queryKey: ["admissionOperations", admissionId],
    queryFn: async () => {
      const response = await operationService.getOperations({
        admission_id: admissionId,
      });
      if (Array.isArray(response)) return response;
      // @ts-ignore
      if (response.data && Array.isArray(response.data)) return response.data;
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/operations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admissionOperations", admissionId],
      });
      toast.success("تم حذف العملية بنجاح");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("فشل في حذف العملية");
    },
  });

  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Typography variant="h6" fontWeight={600}>
          العمليات الجراحية
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => setAddDialogOpen(true)}
          size="small"
        >
          إضافة عملية
        </Button>
      </div>

      {operations.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          py={4}
        >
          لا توجد عمليات مضافة لهذا التنويم
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right">اسم العملية</TableCell>
                <TableCell align="right">التاريخ</TableCell>
                <TableCell align="right">أجر الجراح</TableCell>
                <TableCell align="right">الطبيب المسجل</TableCell>
                <TableCell align="right">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.map((op: Operation) => (
                <TableRow key={op.id} hover>
                  <TableCell align="right" className="font-medium">
                    {op.operation_type}
                    {op.description && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        {op.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{op.operation_date}</TableCell>
                  <TableCell align="right" className="font-bold">
                    {Number(op.surgeon_fee).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {op.user?.username || "-"}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        setSelectedOperation(op);
                        setFinanceDialogOpen(true);
                      }}
                      className="ml-2"
                    >
                      المالية
                    </Button>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={async () => {
                        try {
                          const response = await apiClient.get(
                            `/operations/${op.id}/print-report`,
                            {
                              responseType: "blob",
                            },
                          );
                          const blob = new Blob([response.data], {
                            type: "application/pdf",
                          });
                          const url = window.URL.createObjectURL(blob);
                          window.open(url, "_blank");
                        } catch (error) {
                          toast.error("فشل في طباعة التقرير");
                          console.error(error);
                        }
                      }}
                      title="طباعة التقرير"
                    >
                      <Printer size={16} />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteId(op.id)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AddAdmissionOperationDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        admissionId={admissionId}
      />

      {selectedOperation && (
        <OperationFinanceForm
          open={financeDialogOpen}
          onClose={() => setFinanceDialogOpen(false)}
          operation={selectedOperation}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["admissionOperations", admissionId],
            });
            setFinanceDialogOpen(false);
          }}
        />
      )}

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف هذه العملية؟
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>إلغاء</Button>
          <Button
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            color="error"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
