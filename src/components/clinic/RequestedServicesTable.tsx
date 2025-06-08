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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      toast.error(error.response?.data?.message || t("common:error.updateFailed")),
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
      toast.error(error.response?.data?.message || t("common:error.requestFailed"))
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

  const discountOptions = Array.from({ length: 11 }, (_, i) => i * 10);

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
                    {t("services:table.count")}
                  </TableHead>
                  {!isCompanyPatient && (
                    <TableHead className="text-center w-[130px]">
                      {t("services:table.discountPercentage")}
                    </TableHead>
                  )}
                  {isCompanyPatient && (
                    <TableHead className="text-center w-[100px]">
                      {t("services:table.endurance")}
                    </TableHead>
                  )}
                 
                    <TableHead className="text-center w-[90px]">
                      {t("services:table.totalItemPrice")}
                    </TableHead>
                  
                  <TableHead className="text-center w-[90px]">
                    {t("services:table.amountPaid")}
                  </TableHead>
                  {!isCompanyPatient && (
                    <TableHead className="text-center w-[90px]">
                      {t("services:table.balance")}
                    </TableHead>
                  )}
                  <TableHead className="text-right w-[130px]">
                    {t("common:actions.openMenu")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestedServices.map((rs) => {
                  const isEditingThisRow = editingRowId === rs.id;
                  const balance = calculateItemBalance(
                    rs,
                    isEditingThisRow ? currentEditData : undefined
                  );
                  const price = Number(rs.price) || 0;
                  const count = isEditingThisRow
                    ? currentEditData.count
                    : Number(rs.count) || 1;
                  let discountPer = 0;
                  if (!isCompanyPatient) {
                    discountPer = isEditingThisRow
                      ? currentEditData.discount_per
                      : Number(rs.discount_per) || 0;
                  }
                  const fixedDiscount = Number(rs.discount) || 0;
                  const subTotal = price * count;
                  const discountAmountFromPercentage =
                    (subTotal * discountPer) / 100;
                  const totalItemDiscount =
                    discountAmountFromPercentage + fixedDiscount;
                  let endurance = 0;
                  if (isCompanyPatient) {
                    endurance =
                      isEditingThisRow &&
                      currentEditData.endurance !== undefined
                        ? currentEditData.endurance
                        : Number(rs.endurance * rs.count) || 0;
                  }
                  const netPrice = subTotal - totalItemDiscount - endurance;

                  return (
                    <TableRow
                      key={rs.id}
                      className={
                        isEditingThisRow ? "bg-muted/30 dark:bg-muted/20" : ""
                      }
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
                      <TableCell className="text-center py-2">
                        {isEditingThisRow ? (
                          <Input
                            type="number"
                            min="1"
                            value={currentEditData.count}
                            onChange={(e) =>
                              setCurrentEditData((d) => ({
                                ...d,
                                count: parseInt(e.target.value) || 1,
                              }))
                            }
                            className="h-7 w-16 mx-auto text-xs px-1"
                          />
                        ) : (
                          count
                        )}
                      </TableCell>
                      {!isCompanyPatient && (
                        <TableCell className="text-center py-2">
                          {isEditingThisRow ? (
                            <Select
                              value={String(currentEditData.discount_per)}
                              onValueChange={(val) =>
                                setCurrentEditData((d) => ({
                                  ...d,
                                  discount_per: parseInt(val),
                                }))
                              }
                              dir={i18n.dir()}
                            >
                              <SelectTrigger className="h-7 w-24 mx-auto text-xs px-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {discountOptions.map((opt) => (
                                  <SelectItem key={opt} value={String(opt)}>
                                    {opt}%
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            `${discountPer}%`
                          )}
                        </TableCell>
                      )}
                      {isCompanyPatient && (
                        <TableCell className="text-center py-2">
                          {isEditingThisRow ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={currentEditData.endurance ?? ""}
                              onChange={(e) =>
                                setCurrentEditData((d) => ({
                                  ...d,
                                  endurance: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="h-7 w-20 mx-auto text-xs px-1"
                            />
                          ) : (
                            formatNumber(endurance)
                          )}
                        </TableCell>
                      )}
                    
                        <TableCell className="text-center py-2 font-semibold">
                          {formatNumber(netPrice)}
                        </TableCell>
                      
                      <TableCell className="text-center py-2 text-green-600 dark:text-green-500">
                        {formatNumber(rs.amount_paid)}
                      </TableCell>
                      {!isCompanyPatient && (
                        <TableCell
                          className={`text-center py-2 font-semibold ${
                            balance > 0.009
                              ? "text-red-600 dark:text-red-500"
                              : "text-green-600 dark:text-green-500"
                          }`}
                        >
                          {formatNumber(balance)}
                        </TableCell>
                      )}
                      <TableCell className="text-right py-2">
                        <div className="flex gap-0.5 justify-end">
                          {isEditingThisRow ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSaveEdit(rs.id)}
                                disabled={
                                  updateMutation.isPending &&
                                  updateMutation.variables?.rsId === rs.id
                                }
                                className="h-7 w-7"
                              >
                                {updateMutation.isPending &&
                                updateMutation.variables?.rsId === rs.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-7 w-7"
                              >
                                <XCircle className="h-4 w-4 text-slate-500" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {balance > 0.009 && !rs.done && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setPayingService(rs);
                                    // handlePrintReceipt();
                                  }}
                                  className="h-7 w-7 text-green-600 hover:text-green-700"
                                  title={t("common:pay")}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleManageServiceCosts(rs)}
                                className="h-7 w-7"
                                title={t("services:manageCostsButton")}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              {/* {!rs.is_paid && !rs.done && ( */}
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEdit(rs)}
                                  className="h-7 w-7"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setServiceToDelete(rs.id)}
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleManageDeposits(rs)}
                                className="h-7 w-7"
                                title={t(
                                  "payments:manageDepositsDialog.triggerButtonTooltip"
                                )}
                              >
                                <PackageOpen  className="h-4 w-4 text-blue-600" />{" "}
                                {/* Example Icon */}
                              </Button>
                              {/* )} */}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
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
