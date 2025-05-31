// src/components/audit/AuditedServicesTable.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, Edit } from "lucide-react";

import type { AuditedRequestedService } from "@/types/auditing";
import { deleteAuditedService } from "@/services/insuranceAuditService";
import EditAddAuditedServiceDialog from "./EditAddAuditedServiceDialog";

interface AuditedServicesTableProps {
  auditRecordId: number;
  initialAuditedServices: AuditedRequestedService[];
  disabled?: boolean;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const AuditedServicesTable: React.FC<AuditedServicesTableProps> = ({
  auditRecordId,
  initialAuditedServices,
  disabled,
}) => {
  const { t } = useTranslation(["audit", "services", "common"]);
  const queryClient = useQueryClient();

  const [isEditAddDialogOpen, setIsEditAddDialogOpen] = useState(false);
  const [currentItemForDialog, setCurrentItemForDialog] =
    useState<AuditedRequestedService | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const handleDeleteItem = async (item: AuditedRequestedService) => {
    try {
      setDeletingItemId(item.id);
      await deleteAuditedService(item.id);
      toast.success(t("common:deletedSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["auditRecordForVisit", auditRecordId],
      });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(
        apiError.response?.data?.message || t("common:error.deleteFailed")
      );
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleOpenAddDialog = () => {
    setCurrentItemForDialog(null); // Indicate new item
    setIsEditAddDialogOpen(true);
  };

  const handleOpenEditDialog = (item: AuditedRequestedService) => {
    setCurrentItemForDialog(item);
    setIsEditAddDialogOpen(true);
  };

  const handleDialogSaveSuccess = () => {
    setIsEditAddDialogOpen(false);
    setCurrentItemForDialog(null);
    queryClient.invalidateQueries({
      queryKey: ["auditRecordForVisit", auditRecordId],
    });
  };

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  return (
    <>
      <ScrollArea className="max-h-[45vh] border rounded-md">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">
                {t("audit:auditedServices.service")}
              </TableHead>
              <TableHead className="w-[80px] text-center">
                {t("audit:auditedServices.price")}
              </TableHead>
              <TableHead className="w-[60px] text-center">
                {t("audit:auditedServices.count")}
              </TableHead>
             
              <TableHead className="w-[90px] text-center">
                {t("audit:auditedServices.endurance")}
              </TableHead>
              <TableHead className="w-[160px] text-center">
                {t("audit:auditedServices.status")}
              </TableHead>
              <TableHead className="min-w-[150px]">
                {t("audit:auditedServices.notes")}
              </TableHead>
              <TableHead className="w-[90px] text-center">
                {t("common:actions.openMenu")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialAuditedServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  {t("audit:auditedServices.noServices")}
                </TableCell>
              </TableRow>
            ) : (
              initialAuditedServices.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="py-2">{item.service?.name}</TableCell>
                  <TableCell className="py-2 text-center">
                    {formatNumber(item.audited_price)}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    {item.audited_count}
                  </TableCell>
                 
                  <TableCell className="py-2 text-center">
                    {formatNumber(item.audited_endurance)}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <Badge
                      variant={
                        item.audited_status === "approved_for_claim"
                          ? "success"
                          : item.audited_status === "rejected_by_auditor"
                          ? "destructive"
                          : item.audited_status === "pending_edits"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {t(`audit:serviceStatus.${item.audited_status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    {item.auditor_notes_for_service || "-"}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenEditDialog(item)}
                        disabled={disabled}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteItem(item)}
                        disabled={disabled || deletingItemId === item.id}
                      >
                        {deletingItemId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {!disabled && (
        <div className="pt-3 flex justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenAddDialog}
            className="text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />{" "}
            {t("audit:auditedServices.addAuditedService")}
          </Button>
        </div>
      )}

      <EditAddAuditedServiceDialog
        isOpen={isEditAddDialogOpen}
        onOpenChange={setIsEditAddDialogOpen}
        auditRecordId={auditRecordId}
        existingAuditedService={currentItemForDialog}
        onSaveSuccess={handleDialogSaveSuccess}
      />
    </>
  );
};

export default AuditedServicesTable;
