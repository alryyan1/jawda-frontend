// src/components/clinic/RequestedServicesTable.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { RequestedService } from "@/types/services";
import type { DoctorVisit } from "@/types/visits";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Trash2,
  DollarSign,
  PlusCircle,
  Edit,
  XCircle,
  Save,
  Settings2,
  PackageOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "../ui/card";
import ServicePaymentDialog from "./ServicePaymentDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatNumber } from "@/lib/utils";
import {
  updateRequestedServiceDetails,
  removeRequestedServiceFromVisit,
} from "@/services/visitService";
import ManageRequestedServiceCostsDialog from "./ManageRequestedServiceCostsDialog";
import ManageServiceDepositsDialog from "./ManageServiceDepositsDialog";
import type { AxiosError } from "axios";

interface RequestedServicesTableProps {
  visitId: number;
  visit?: DoctorVisit;
  requestedServices: RequestedService[];
  isLoading: boolean;
  currentClinicShiftId: number | null;
  onAddMoreServices: () => void;
  handlePrintReceipt: () => void;
}

interface RowEditData {
  count: number;
  discount_per: number;
  endurance?: number;
  visit?: DoctorVisit;
}

const RequestedServicesTable: React.FC<RequestedServicesTableProps> = ({
  visit,
  visitId,
  requestedServices,
  isLoading,
  currentClinicShiftId,
  onAddMoreServices,
  handlePrintReceipt,
}) => {
  const { t, i18n } = useTranslation([
    "services",
    "common",
    "payments",
    "clinic",
  ]);
  const queryClient = useQueryClient();
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [payingService, setPayingService] = useState<RequestedService | null>(null);
  const [currentEditData, setCurrentEditData] = useState<RowEditData>({
    count: 1,
    discount_per: 0,
    endurance: 0,
  });
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const [isManageServiceCostsDialogOpen, setIsManageServiceCostsDialogOpen] = useState(false);
  const [selectedRequestedServiceForCosts, setSelectedRequestedServiceForCosts] = useState<RequestedService | null>(null);
  const [isManageDepositsDialogOpen, setIsManageDepositsDialogOpen] = useState(false);
  const [selectedServiceForDeposits, setSelectedServiceForDeposits] = useState<RequestedService | null>(null);

  const handleManageDeposits = (requestedService: RequestedService) => {
    setSelectedServiceForDeposits(requestedService);
    setIsManageDepositsDialogOpen(true);
  };

  const handleCloseDeposits = () => {
    setIsManageDepositsDialogOpen(false);
    setSelectedServiceForDeposits(null);
  };

  const handleDepositsUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ["requestedServicesForVisit", visitId],
    });
  };

  const isCompanyPatient = !!visit?.patient?.company_id;

  const updateMutation = useMutation({
    mutationFn: (data: {
      rsId: number;
      payload: Partial<
        Pick<RequestedService, "count" | "discount_per" | "endurance">
      >;
    }) => updateRequestedServiceDetails(visitId, data.rsId, data.payload),
    onSuccess: () => {
      toast.success(t("common:updatedSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["requestedServicesForVisit", visitId],
      });
      setEditingRowId(null);
      setCurrentEditData({ count: 1, discount_per: 0, endurance: 0 });
    },
    onError: (error: AxiosError) =>
      toast.error((error.response?.data as { message?: string })?.message || t("common:error.updateFailed")),
  });

  const removeMutation = useMutation({
    mutationFn: (requestedServiceId: number) =>
      removeRequestedServiceFromVisit(visitId, requestedServiceId),
    onSuccess: () => {
      toast.success(t("services:removedSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["requestedServicesForVisit", visitId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ["availableServicesForVisit", visitId],
        exact: true,
      });
      setServiceToDelete(null);
    },
    onError: (error: AxiosError) =>
     {
      console.log(error,'error')
      toast.error((error.response?.data as { message?: string })?.message || t("common:error.requestFailed"))
     }
  });

  const handleCancelEdit = () => setEditingRowId(null);

  const handleEdit = (rs: RequestedService) => {
    setEditingRowId(rs.id);
    setCurrentEditData({
      count: rs.count || 1,
      discount_per: rs.discount_per || 0,
      endurance: isCompanyPatient ? rs.endurance || 0 : 0,
    });
  };

  const handleSaveEdit = (rsId: number) => {
    if (currentEditData.count < 1) {
      toast.error(t("services:validation.countMinOne"));
      return;
    }
    const payload: Partial<
      Pick<RequestedService, "count" | "discount_per" | "endurance">
    > = {
      count: currentEditData.count,
    };
    if (!isCompanyPatient) {
      payload.discount_per = currentEditData.discount_per;
    }
    if (isCompanyPatient) {
      payload.endurance = currentEditData.endurance;
    }
    updateMutation.mutate({ rsId, payload });
  };

  const handleManageServiceCosts = (requestedService: RequestedService) => {
    if (!isManageServiceCostsDialogOpen) {
      setSelectedRequestedServiceForCosts(requestedService);
      setIsManageServiceCostsDialogOpen(true);
    }
  };

  const handleCloseServiceCostsDialog = () => {
    setIsManageServiceCostsDialogOpen(false);
    setSelectedRequestedServiceForCosts(null);
  };



  const calculateItemBalance = (
    rs: RequestedService,
    editData?: RowEditData
  ) => {
    const price = Number(rs.price) || 0;
    const count = editData ? editData.count : Number(rs.count) || 1;

    let itemDiscountPer = 0;
    if (!isCompanyPatient) {
      itemDiscountPer = editData
        ? editData.discount_per
        : Number(rs.discount_per) || 0;
    }

    const itemFixedDiscount = Number(rs.discount) || 0;

    const subTotal = price * count;
    const discountAmountFromPercentage = (subTotal * itemDiscountPer) / 100;
    const totalItemDiscount = discountAmountFromPercentage + itemFixedDiscount;

    let itemEndurance = 0;
    if (isCompanyPatient) {
      itemEndurance =
        editData && editData.endurance !== undefined
          ? editData.endurance
          : Number(rs.endurance) || 0;
    }

    const netPrice = subTotal - totalItemDiscount - itemEndurance;
    const amountPaid = Number(rs.amount_paid) || 0;
    return netPrice - amountPaid;
  };

  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={onAddMoreServices} variant="outline" size="sm">
            <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />{" "}
            {t("services:addMoreServices")}
          </Button>
        </div>
        {requestedServices.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("services:noServicesRequestedYet")}
          </p>
        )}
        {requestedServices.length > 0 && (
          <Card>
            <Table style={{ direction: i18n.dir() }} className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">
                    {t("services:table.serviceName")}
                  </TableHead>
                  <TableHead className="text-center w-[70px]">
                    {t("services:table.price")}
                  </TableHead>
                  <TableHead className="text-center w-[90px]">
                    {t("services:table.amountPaid")}
                  </TableHead>
                  <TableHead className="text-center w-[60px]">
                    {t("payments:pay")}
                  </TableHead>
                  <TableHead className="text-center w-[40px]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestedServices.map((rs) => {
                  const isEditingThisRow = editingRowId === rs.id;
                  const isExpanded = expandedRowId === rs.id;
                  const price = Number(rs.price) || 0;
                  return (
                    <React.Fragment key={rs.id}>
                      <TableRow
                        className={isEditingThisRow ? "bg-muted/30 dark:bg-muted/20" : ""}
                      >
                        <TableCell className="py-2 font-medium text-center">
                          {rs.service?.name || t("common:unknownService")}
                          {rs.service?.service_group?.name && (
                            <span className="block text-muted-foreground text-[10px]">
                              ({rs.service.service_group.name})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {formatNumber(price)}
                        </TableCell>
                        <TableCell className="text-center py-2 text-green-600 dark:text-green-500">
                          {formatNumber(rs.amount_paid)}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPayingService(rs)}
                            disabled={!currentClinicShiftId}
                          >
                            <DollarSign className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                            {t("payments:pay")}
                          </Button>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setExpandedRowId(isExpanded ? null : rs.id)}
                            aria-label={isExpanded ? t("common:collapse") : t("common:expand")}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/10 p-3">
                            <div className="space-y-4">
                              {/* Details Section */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-semibold">{t("services:table.count")}:</span> {rs.count}
                                </div>
                                {!isCompanyPatient && (
                                  <div>
                                    <span className="font-semibold">{t("services:table.discountPercentage")}:</span> {rs.discount_per}%
                                  </div>
                                )}
                                {isCompanyPatient && (
                                  <div>
                                    <span className="font-semibold">{t("services:table.endurance")}:</span> {formatNumber(rs.endurance)}
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold">{t("services:table.totalItemPrice")}:</span> {formatNumber(Number(rs.price) * Number(rs.count))}
                                </div>
                                <div>
                                  <span className="font-semibold">{t("services:table.balance")}:</span> {formatNumber(calculateItemBalance(rs))}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2">
                                {/* Edit Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(rs)}
                                  disabled={editingRowId !== null}
                                >
                                  <Edit className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                                  {t("common:edit")}
                                </Button>

                                {/* Manage Costs Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleManageServiceCosts(rs)}
                                >
                                  <Settings2 className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                                  {t("services:manageCosts")}
                                </Button>

                                {/* Manage Deposits Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleManageDeposits(rs)}
                                >
                                  <PackageOpen className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                                  {t("services:manageDeposits")}
                                </Button>

                                {/* Delete Button */}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setServiceToDelete(rs.id)}
                                >
                                  <Trash2 className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                                  {t("common:delete")}
                                </Button>
                              </div>

                              {/* Edit Form (when editing) */}
                              {isEditingThisRow && (
                                <div className="border rounded-lg p-3 bg-background">
                                  <div className="grid grid-cols-2 gap-3">
                                    {/* Count Input */}
                                    <div>
                                      <label className="text-xs font-medium">
                                        {t("services:table.count")}
                                      </label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={currentEditData.count}
                                        onChange={(e) =>
                                          setCurrentEditData({
                                            ...currentEditData,
                                            count: parseInt(e.target.value) || 1,
                                          })
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>

                                    {/* Discount/Endurance Input */}
                                    <div>
                                      <label className="text-xs font-medium">
                                        {isCompanyPatient
                                          ? t("services:table.endurance")
                                          : t("services:table.discountPercentage")}
                                      </label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={
                                          isCompanyPatient
                                            ? currentEditData.endurance
                                            : currentEditData.discount_per
                                        }
                                        onChange={(e) =>
                                          setCurrentEditData({
                                            ...currentEditData,
                                            [isCompanyPatient ? "endurance" : "discount_per"]:
                                              parseFloat(e.target.value) || 0,
                                          })
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>

                                  {/* Save/Cancel Buttons */}
                                  <div className="flex gap-2 mt-3">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveEdit(rs.id)}
                                      disabled={updateMutation.isPending}
                                    >
                                      {updateMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin ltr:mr-1 rtl:ml-1" />
                                      ) : (
                                        <Save className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                                      )}
                                      {t("common:save")}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                    >
                                      <XCircle className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                                      {t("common:cancel")}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
        {payingService && currentClinicShiftId && visit && (
          <ServicePaymentDialog
          handlePrintReceipt={handlePrintReceipt}
            visit={visit}
            isOpen={!!payingService}
            onOpenChange={(open) => !open && setPayingService(null)}
            requestedService={payingService}
            visitId={visitId}
            currentClinicShiftId={currentClinicShiftId}
            onPaymentSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: ["requestedServicesForVisit", visitId],
              });
              setPayingService(null);
            }}
          />
        )}
        <AlertDialog
          open={!!serviceToDelete}
          onOpenChange={(open) => !open && setServiceToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("common:confirmDeleteTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("common:confirmDeleteMessage", {
                  item: t("services:serviceEntityName"),
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  serviceToDelete && removeMutation.mutate(serviceToDelete)
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                ) : (
                  <Trash2 className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                )}
                {t("common:delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {selectedServiceForDeposits && (
          <ManageServiceDepositsDialog
            isOpen={isManageDepositsDialogOpen}
            onOpenChange={handleCloseDeposits}
            requestedService={selectedServiceForDeposits}
            onAllDepositsUpdated={handleDepositsUpdated}
          />
        )}
        {selectedRequestedServiceForCosts && (
          <ManageRequestedServiceCostsDialog
            isOpen={isManageServiceCostsDialogOpen}
            onOpenChange={handleCloseServiceCostsDialog}
            requestedService={selectedRequestedServiceForCosts}
            onCostsUpdated={() => {
              queryClient.invalidateQueries({
                queryKey: ["requestedServicesForVisit", visitId],
                exact: true,
              });
              handleCloseServiceCostsDialog();
            }}
          />
        )}
      </div>
    </>
  );
};
export default RequestedServicesTable;
