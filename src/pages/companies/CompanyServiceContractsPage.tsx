// src/pages/companies/CompanyServiceContractsPage.tsx
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  PlusCircle,
  ArrowRightLeft,
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Save,
  Search,
} from "lucide-react"; // ArrowRightLeft can be for "Back" in RTL

import type {
  Company,
  CompanyServiceContract,
  CompanyServiceFormData,
} from "@/types/companies";
import {
  getCompanyById,
  updateCompanyServiceContract,
} from "@/services/companyService"; // To get company name
import {
  getCompanyContractedServices,
  removeServiceFromCompanyContract,
} from "@/services/companyService"; // Service functions related to contracts

import type { PaginatedResponse } from "@/services/doctorService";
import AddCompanyServiceDialog from "./AddCompanyServiceDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form";
// import EditCompanyServiceDialog from '@/components/companies/EditCompanyServiceDialog'; // For later

// TODO: Define these permissions in your backend and PermissionName type
// import { useAuthorization } from '@/hooks/useAuthorization';

// Zod schema for inline editing form (subset of CompanyServiceFormData)
const getInlineEditSchema = (t: Function) =>
  z.object({
    price: z
      .string()
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: t("common:validation.positiveNumber"),
      }),
    static_endurance: z
      .string()
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: t("common:validation.positiveNumber"),
      }),
    percentage_endurance: z
      .string()
      .refine(
        (val) =>
          !isNaN(parseFloat(val)) &&
          parseFloat(val) >= 0 &&
          parseFloat(val) <= 100,
        { message: "0-100" }
      ),
    static_wage: z
      .string()
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: t("common:validation.positiveNumber"),
      }),
    percentage_wage: z
      .string()
      .refine(
        (val) =>
          !isNaN(parseFloat(val)) &&
          parseFloat(val) >= 0 &&
          parseFloat(val) <= 100,
        { message: "0-100" }
      ),
    use_static: z.boolean(),
    approval: z.boolean(),
  });
type InlineEditFormValues = z.infer<ReturnType<typeof getInlineEditSchema>>;

export default function CompanyServiceContractsPage() {
  const { t, i18n } = useTranslation(["companies", "common", "services"]);
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRowId, setEditingRowId] = useState<number | null>(null); // service_id of the row being edited

  // const { can } = useAuthorization();
  // const canAddContract = can('create company_contracts' as any);
  // const canEditContract = can('edit company_contracts' as any);
  // const canDeleteContract = can('delete company_contracts' as any);
  const canEditContract = true; // Placeholder for permission
  const canDeleteContract = true; // Placeholder

  const inlineEditSchema = getInlineEditSchema(t);
  const inlineEditForm = useForm<InlineEditFormValues>({
    resolver: zodResolver(inlineEditSchema),
    defaultValues: {
      /* will be set when editing starts */
    },
  });

  // const [editingContract, setEditingContract] = useState<CompanyServiceContract | null>(null);

  // const { can } = useAuthorization();
  // const canAddContract = can('create company_contracts' as any);
  // const canEditContract = can('edit company_contracts' as any);
  // const canDeleteContract = can('delete company_contracts'as any);

  // Fetch Company details (mainly for the name in the title)
  const { data: company, isLoading: isLoadingCompany } = useQuery<
    Company,
    Error
  >({
    queryKey: ["company", companyId],
    queryFn: () => getCompanyById(Number(companyId)).then((res) => res.data),
    enabled: !!companyId,
  });

  const {
    data: paginatedContracts,
    isLoading: isLoadingContracts,
    error: contractsError,
    isFetching: isFetchingContracts,
  } = useQuery<PaginatedResponse<CompanyServiceContract>, Error>({
    queryKey: ["companyContractedServices", companyId, currentPage, searchTerm], // Add searchTerm to queryKey
    queryFn: () =>
      getCompanyContractedServices(Number(companyId),searchTerm, currentPage), // Pass searchTerm to service
    enabled: !!companyId,
    placeholderData: keepPreviousData,
  });

  const removeContractMutation = useMutation({
    mutationFn: (params: { companyId: number; serviceId: number }) =>
      removeServiceFromCompanyContract(params.companyId, params.serviceId),
    onSuccess: () => {
      toast.success(
        t(
          "companies:serviceContracts.removedSuccess",
          "Service removed from contract."
        )
      );
      queryClient.invalidateQueries({
        queryKey: ["companyContractedServices", companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["companyAvailableServices", companyId],
      }); // Also refetch available services
    },
    onError: (err: any) => {
      toast.error(
        t("common:error.deleteFailed", {
          entity: t(
            "companies:serviceContracts.contractEntityName",
            "Contract"
          ),
        }),
        { description: err.response?.data?.message || err.message }
      );
    },
  });
  const handleContractAdded = () => {
    // The dialog already invalidates 'companyContractedServices' and 'companyAvailableServices'
    // So, nothing specific needed here unless you want to set current page to 1 for instance
    // setCurrentPage(1);
  };
  const updateContractMutation = useMutation({
    mutationFn: (params: {
      serviceId: number;
      data: Partial<InlineEditFormValues>;
    }) =>
      updateCompanyServiceContract(
        Number(companyId),
        params.serviceId,
        params.data as Partial<CompanyServiceFormData>
      ), // Cast might be needed
    onSuccess: (updatedContractData) => {
      toast.success(
        t("companies:serviceContracts.updatedSuccess", "Contract updated!")
      );
      // Optimistically update the cache or invalidate
      queryClient.invalidateQueries({
        queryKey: ["companyContractedServices", companyId],
      });
      setEditingRowId(null); // Exit edit mode
      inlineEditForm.reset();
    },
    onError: (err: any) => {
      toast.error(
        t("common:error.saveFailed", {
          entity: t(
            "companies:serviceContracts.contractEntityName",
            "Contract"
          ),
        }),
        { description: err.response?.data?.message || err.message }
      );
    },
  });

  if (isLoadingCompany || (isLoadingContracts && !isFetchingContracts)) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (contractsError)
    return (
      <p className="text-destructive p-4">
        {t("common:error.fetchFailedExt", {
          entity: t("companies:serviceContracts.title"),
          message: contractsError.message,
        })}
      </p>
    );

  const contracts = paginatedContracts?.data || [];
  const meta = paginatedContracts?.meta;

  const BackButtonIcon = i18n.dir() === "rtl" ? ArrowRightLeft : ArrowLeft;

  const startEditing = (contract: CompanyServiceContract) => {
    setEditingRowId(contract.service_id);
    inlineEditForm.reset({
      price: String(contract.price),
      static_endurance: String(contract.static_endurance),
      percentage_endurance: String(contract.percentage_endurance),
      static_wage: String(contract.static_wage),
      percentage_wage: String(contract.percentage_wage),
      use_static: contract.use_static,
      approval: contract.approval,
    });
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    inlineEditForm.reset();
  };
  const handleRemoveContract = (serviceId: number, serviceName: string) => {
    if (
      window.confirm(
        t("companies:serviceContracts.removeConfirm", { serviceName })
      )
    ) {
      removeContractMutation.mutate({
        companyId: Number(companyId),
        serviceId,
      });
    }
  };

  const onInlineSave = (serviceId: number) => {
    inlineEditForm.handleSubmit((data) => {
      const submissionData: Partial<InlineEditFormValues> = {
        ...data,
        price: String(data.price), // Keep as string if service expects that, or parseFloat
        static_endurance: String(data.static_endurance),
        percentage_endurance: String(data.percentage_endurance),
        static_wage: String(data.static_wage),
        percentage_wage: String(data.percentage_wage),
      };
      updateContractMutation.mutate({ serviceId, data: submissionData });
    })(); // Immediately invoke the handleSubmit result
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/companies")}
          className="mb-4"
        >
          <BackButtonIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {t("common:backToList", { listName: t("companies:pageTitle") })}
        </Button>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl sm:text-3xl font-bold">
            {t("companies:serviceContracts.title", {
              companyName: company?.name || t("common:loading"),
            })}
          </CardTitle>
          <CardDescription>
            {t(
              "companies:serviceContracts.description",
              "Manage the services and their specific pricing included in this company's contract."
            )}
          </CardDescription>
        </CardHeader>
      </div>

      <div className="flex justify-end mb-4">
        {/* {canAddContract && ( */}
        <AddCompanyServiceDialog
          companyId={Number(companyId)}
          companyName={company?.name || ""}
          onContractAdded={handleContractAdded}
        />
        {/* )} */}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
        <div className="relative w-full sm:w-auto sm:max-w-xs">
          <Input
            type="search"
            placeholder={t("common:searchPlaceholder", "Search services...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10 rtl:pr-10" // Padding for icon
          />
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {isFetchingContracts && (
        <div className="text-sm text-muted-foreground mb-2">
          {t("common:updatingList")}
        </div>
      )}

      {contracts.length === 0 && !isLoadingContracts ? (
        <Card className="text-center py-10">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {t("companies:serviceContracts.noContracts")}
            </p>
            {/* {canAddContract && ( */}
            <AddCompanyServiceDialog
              companyId={Number(companyId)}
              companyName={company?.name || ""}
              onContractAdded={handleContractAdded}
              triggerButton={
                <Button size="sm" className="mt-4">
                  <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  {t("companies:serviceContracts.addContractButton")}
                </Button>
              }
            />
            {/* )} */}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] text-center">
                  {t("companies:serviceContracts.serviceName")}
                </TableHead>
                <TableHead className="w-[100px] text-center">
                  {t("companies:serviceContracts.price")}
                </TableHead>
                <TableHead className="w-[120px] text-center hidden md:table-cell">
                  {t("companies:serviceContracts.staticEndurance")}
                </TableHead>
                <TableHead className="w-[120px] text-center hidden md:table-cell">
                  {t("companies:serviceContracts.percentageEndurance")}
                </TableHead>
                <TableHead className="w-[120px] text-center hidden lg:table-cell">
                  {t("companies:serviceContracts.staticWage")}
                </TableHead>
                <TableHead className="w-[120px] text-center hidden lg:table-cell">
                  {t("companies:serviceContracts.percentageWage")}
                </TableHead>
                <TableHead className="w-[100px] text-center">
                  {t("companies:serviceContracts.useStatic")}
                </TableHead>
                <TableHead className="w-[100px] text-center">
                  {t("companies:serviceContracts.approval")}
                </TableHead>
                <TableHead className="text-right w-[120px]">
                  {t("common:actions.openMenu")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow
                  key={contract.contract_id || contract.service_id}
                  className={
                    editingRowId === contract.service_id ? "bg-muted/50" : ""
                  }
                >
                  <TableCell className="font-medium text-center">
                    {contract.service_name}
                    {contract.service_group_name && (
                      <span className="block text-xs text-muted-foreground">
                        {contract.service_group_name}
                      </span>
                    )}
                  </TableCell>

                  {/* Inline Editable Cells */}
                  {editingRowId === contract.service_id ? (
                    <>
                      <TableCell className="text-center">
                        <FormField
                          control={inlineEditForm.control}
                          name="price"
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className="h-8 text-sm"
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <FormField
                          control={inlineEditForm.control}
                          name="static_endurance"
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className="h-8 text-sm"
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <FormField
                          control={inlineEditForm.control}
                          name="percentage_endurance"
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              {...field}
                              className="h-8 text-sm"
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <FormField
                          control={inlineEditForm.control}
                          name="static_wage"
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className="h-8 text-sm"
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <FormField
                          control={inlineEditForm.control}
                          name="percentage_wage"
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              {...field}
                              className="h-8 text-sm"
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <FormField
                          control={inlineEditForm.control}
                          name="use_static"
                          render={({ field }) => (
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <FormField
                          control={inlineEditForm.control}
                          name="approval"
                          render={({ field }) => (
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-center">
                        {Number(contract.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {Number(contract.static_endurance).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {Number(contract.percentage_endurance).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {Number(contract.static_wage).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {Number(contract.percentage_wage).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {contract.use_static ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-slate-400 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={contract.approval ? "default" : "outline"}
                          className={
                            contract.approval
                              ? "bg-green-500/80 hover:bg-green-600"
                              : ""
                          }
                        >
                          {contract.approval
                            ? t("companies:serviceContracts.approved")
                            : t("companies:serviceContracts.notApproved")}
                        </Badge>
                      </TableCell>
                    </>
                  )}

                  <TableCell className="text-right">
                    {editingRowId === contract.service_id ? (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onInlineSave(contract.service_id)}
                          disabled={updateContractMutation.isPending}
                        >
                          {updateContractMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={cancelEditing}
                          disabled={updateContractMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu dir={i18n.dir()}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* {canEditContract && ( */}
                          <DropdownMenuItem
                            onClick={() => startEditing(contract)}
                          >
                            <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
                            {t("common:edit")}
                          </DropdownMenuItem>
                          {/* )} */}
                          {/* {canDeleteContract && ( */}
                          <DropdownMenuItem
                            onClick={() =>
                              handleRemoveContract(
                                contract.service_id,
                                contract.service_name
                              )
                            }
                            className="text-destructive focus:text-destructive"
                            disabled={
                              removeContractMutation.isPending &&
                              removeContractMutation.variables?.serviceId ===
                                contract.service_id
                            }
                          >
                            {/* ... delete icon and text ... */}
                            {removeContractMutation.isPending &&
                            removeContractMutation.variables?.serviceId ===
                              contract.service_id ? (
                              <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                            )}
                            {t("companies:serviceContracts.removeContract")}
                          </DropdownMenuItem>
                          {/* )} */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            {t("common:previous")}
          </Button>
          <span className="px-2 py-1 text-sm">
            {t("common:page")} {currentPage} {t("common:of")} {meta.last_page}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, meta.last_page))
            }
            disabled={currentPage === meta.last_page}
          >
            {t("common:next")}
          </Button>
        </div>
      )}

      {/* {editingContract && (
        <EditCompanyServiceDialog
            isOpen={!!editingContract}
            onOpenChange={() => setEditingContract(null)}
            companyId={Number(companyId)}
            contract={editingContract}
            onContractUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ['companyContractedServices', companyId] });
                setEditingContract(null);
            }}
        />
      )} */}
    </div>
  );
}
