import React from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { Loader2, MoreHorizontal, Download, XCircle, CheckCircle, ShieldQuestion, Edit } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatNumber } from "@/lib/utils";

import type { DoctorShiftReportItem } from "@/types/reports";

type ProofingFlagKey = keyof Pick<
  DoctorShiftReportItem,
  | "is_cash_revenue_prooved"
  | "is_cash_reclaim_prooved"
  | "is_company_revenue_prooved"
  | "is_company_reclaim_prooved"
>;

interface DoctorShiftsReportTableProps {
  shifts: DoctorShiftReportItem[];
  isLoading: boolean;
  isFetching: boolean;
  isGeneratingSummaryPdfId: number | null;
  closeShiftMutation: {
    mutate: (id: number) => void;
    isPending: boolean;
    variables: number | undefined;
  };
  proofingFlagsMutation: {
    isPending: boolean;
  };
  canCloseShifts: boolean;
  canRecordEntitlementCost: boolean;
  canUpdateProofing: boolean;
  onDownloadSummaryPdf: (shift: DoctorShiftReportItem) => void;
  onOpenAddCostDialog: (shift: DoctorShiftReportItem) => void;
  onProofingAction: (shiftId: number, flagField: ProofingFlagKey, currentValue?: boolean) => void;
}

const DoctorShiftsReportTable: React.FC<DoctorShiftsReportTableProps> = ({
  shifts,
  isLoading,
  isFetching,
  isGeneratingSummaryPdfId,
  closeShiftMutation,
  proofingFlagsMutation,
  canCloseShifts,
  canRecordEntitlementCost,
  canUpdateProofing,
  onDownloadSummaryPdf,
  onOpenAddCostDialog,
  onProofingAction,
}) => {
  const { t, i18n } = useTranslation(["reports", "common", "clinic", "review"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  if (isLoading && !isFetching && shifts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (shifts.length === 0 && !isFetching) {
    return (
      <Card className="text-center py-10 text-muted-foreground mt-6">
        <div className="p-4">{t("common:noDataAvailableFilters")}</div>
      </Card>
    );
  }

  return (
    <Card className="mt-6 overflow-hidden">
      <ScrollArea className="h-[calc(100vh-420px)] w-full">
        <div className="min-w-[1200px]">
          <Table className="text-xs" dir={i18n.dir()}>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center min-w-[140px]">
                  {t("reports:doctorName")}
                </TableHead>
                <TableHead className="text-center hidden md:table-cell min-w-[110px]">
                  {t("reports:specialist")}
                </TableHead>
               
                <TableHead className="text-center min-w-[90px]">
                  {t("reports:totalEntitlement")}
                </TableHead>
                <TableHead className="text-center hidden md:table-cell min-w-[90px]">
                  {t("reports:cashEntitlement")}
                </TableHead>
                <TableHead className="text-center hidden md:table-cell min-w-[90px]">
                  {t("reports:insuranceEntitlement")}
                </TableHead>
                <TableHead className="text-center min-w-[70px]">
                  {t("common:status")}
                </TableHead>
                <TableHead className="text-center min-w-[100px] hidden xl:table-cell">
                  {t("reports:openedBy")}
                </TableHead>
                <TableHead className="text-center min-w-[100px] hidden xl:table-cell">
                  {t("reports:createdAt")}
                </TableHead>
                <TableHead className="text-right min-w-[110px] sticky right-0 bg-card z-10">
                  {t("common:actions.title")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((ds: DoctorShiftReportItem) => (
                <TableRow
                  key={ds.id}
                  className={
                    ds.status ? "bg-green-50/50 dark:bg-green-900/20" : ""
                  }
                >
                  <TableCell className="font-medium text-center">
                    {ds.doctor_name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {ds.doctor_specialist_name || "-"}
                  </TableCell>
                
                  <TableCell className="text-center font-semibold">
                    {formatNumber(ds.total_doctor_entitlement || 0)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {formatNumber(ds.cash_entitlement || 0)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {formatNumber(ds.insurance_entitlement || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={ds.status ? "success" : "outline"}
                      className={
                        ds.status
                          ? "border-green-600 bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300 dark:border-green-700"
                          : ""
                      }
                    >
                      {ds.status_text}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center hidden xl:table-cell">
                    {ds.user_name_opened || "-"}
                  </TableCell>
                  <TableCell className="text-center hidden xl:table-cell">
                    {ds.created_at ? format(parseISO(ds.created_at), "PP", {
                      locale: dateLocale,
                    }) : "-"}
                  </TableCell>
                  <TableCell className="text-right sticky right-0 bg-card z-10">
                    <DropdownMenu dir={i18n.dir()}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                    
                        <DropdownMenuItem
                          onClick={() => onDownloadSummaryPdf(ds)}
                          disabled={isGeneratingSummaryPdfId === ds.id}
                        >
                          {isGeneratingSummaryPdfId === ds.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          <span className="ltr:ml-2 rtl:mr-2">
                            {t("reports:actions.privateReport")}
                          </span>
                        </DropdownMenuItem>
                        {ds.status && canCloseShifts && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => closeShiftMutation.mutate(ds.id)}
                              disabled={
                                closeShiftMutation.isPending &&
                                closeShiftMutation.variables === ds.id
                              }
                              className="text-destructive focus:text-destructive"
                            >
                              {closeShiftMutation.isPending &&
                              closeShiftMutation.variables === ds.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                              <span className="ltr:ml-2 rtl:ml-2">
                                {t("clinic:doctorShifts.closeShiftButton")}
                              </span>
                            </DropdownMenuItem>
                          </>
                        )}
                        {canRecordEntitlementCost &&
                          (ds.total_doctor_entitlement ?? 0) > 0 &&
                          !ds.is_cash_reclaim_prooved &&
                          !ds.is_company_reclaim_prooved && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onOpenAddCostDialog(ds)}
                              >
                                <Edit className="h-3.5 w-3.5 ltr:mr-2 rtl:ml-2" />
                                {t("review.recordEntitlementAsCost")}
                              </DropdownMenuItem>
                            </>
                          )}
                        {canUpdateProofing && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                onProofingAction(
                                  ds.id,
                                  "is_cash_revenue_prooved",
                                  ds.is_cash_revenue_prooved
                                )
                              }
                              disabled={proofingFlagsMutation.isPending}
                            >
                              {ds.is_cash_revenue_prooved ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <ShieldQuestion className="h-3.5 w-3.5" />
                              )}{" "}
                              <span className="ltr:ml-2 rtl:mr-2">
                                {t("review.toggleCashRevenueProof")}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onProofingAction(
                                  ds.id,
                                  "is_cash_reclaim_prooved",
                                  ds.is_cash_reclaim_prooved
                                )
                              }
                              disabled={proofingFlagsMutation.isPending}
                            >
                              {ds.is_cash_reclaim_prooved ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <ShieldQuestion className="h-3.5 w-3.5" />
                              )}{" "}
                              <span className="ltr:ml-2 rtl:mr-2">
                                {t("review.toggleCashEntitlementProof")}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onProofingAction(
                                  ds.id,
                                  "is_company_revenue_prooved",
                                  ds.is_company_revenue_prooved
                                )
                              }
                              disabled={proofingFlagsMutation.isPending}
                            >
                              {ds.is_company_revenue_prooved ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <ShieldQuestion className="h-3.5 w-3.5" />
                              )}{" "}
                              <span className="ltr:ml-2 rtl:mr-2">
                                {t("review.toggleInsuranceRevenueProof")}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onProofingAction(
                                  ds.id,
                                  "is_company_reclaim_prooved",
                                  ds.is_company_reclaim_prooved
                                )
                              }
                              disabled={proofingFlagsMutation.isPending}
                            >
                              {ds.is_company_reclaim_prooved ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <ShieldQuestion className="h-3.5 w-3.5" />
                              )}{" "}
                              <span className="ltr:ml-2 rtl:mr-2">
                                {t("review.toggleInsuranceEntitlementProof")}
                              </span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </Card>
  );
};

export default DoctorShiftsReportTable; 