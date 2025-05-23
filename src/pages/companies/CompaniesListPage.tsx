// src/pages/companies/CompaniesListPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getCompanies, deleteCompany } from "@/services/companyService";
import { Company } from "@/types/companies";
import { Button } from "@/components/ui/button";
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
import {
  MoreHorizontal,
  Trash2,
  Edit,
  Loader2,
  FileText,
  Building,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuthorization } from "@/hooks/useAuthorization"; // For permission checks

export default function CompaniesListPage() {
  const { t, i18n } = useTranslation(["companies", "common"]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const { can ,user} = useAuthorization(); // Get permission checking function
    console.log(user,'user')
  // TODO: Define these permissions in your backend and PermissionName type
  const canCreateCompany = can("create companies" );
  const canEditCompany = can("edit companies" );
  const canDeleteCompany = can("delete companies" );
  const canManageContracts = can("manage company_contracts" ); // Example permission for contracts
  console.log(canCreateCompany,'canCreateCompany','user',user)
  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["companies", currentPage],
    queryFn: () => getCompanies(currentPage),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      toast.success(t("companies:deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err: any) => {
      toast.error(
        t("common:error.deleteFailed", {
          entity: t("companies:entityName", "Company"),
        }),
        { description: err.response?.data?.message || err.message }
      );
    },
  });

  const handleDelete = (companyId: number, companyName: string) => {
    if (
      window.confirm(t("companies:deleteConfirmText", { name: companyName }))
    ) {
      deleteMutation.mutate(companyId);
    }
  };

  if (isLoading && !isFetching)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />{" "}
        {t("companies:loadingCompanies")}
      </div>
    );
  if (error)
    return (
      <p className="text-destructive p-4">
        {t("common:error.fetchFailedExt", {
          entity: t("companies:entityNamePlural", "Companies"),
          message: error.message,
        })}
      </p>
    );

  const companies = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Building className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t("companies:pageTitle")}
          </h1>
        </div>
        {canCreateCompany && (
          <Button asChild size="sm">
            <Link to="/settings/companies/new">{t("companies:addCompanyButton")}</Link>
          </Button>
        )}
      </div>
      {isFetching && (
        <div className="text-sm text-muted-foreground mb-2">
          {t("common:updatingList")}
        </div>
      )}

      {companies.length === 0 && !isLoading ? (
        <div className="text-center py-10 text-muted-foreground border rounded-lg bg-card">
          <Building className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p>
            {t("companies:noCompaniesFound", "No insurance companies found.")}
          </p>
          {canCreateCompany && (
            <Button asChild size="sm" className="mt-4">
              <Link to="/settings/companies/new">{t("companies:addCompanyButton")}</Link>
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] hidden sm:table-cell text-center">
                  {t("common:id")}
                </TableHead>
                <TableHead className="text-center">{t("companies:table.name")}</TableHead>
                <TableHead className="hidden md:table-cell text-center">
                  {t("companies:table.phone")}
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center">
                  {t("companies:table.email")}
                </TableHead>
                <TableHead className="text-center">
                  {t("companies:table.status")}
                </TableHead>
                <TableHead className="hidden sm:table-cell text-center">
                  {t("companies:table.contracts")}
                </TableHead>
                <TableHead className="text-center">
                  {t("companies:table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                    <TableCell className="hidden sm:table-cell text-center">
                    {company.id}
                    </TableCell>
                    <TableCell className="font-medium text-center">{company.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                    {company.phone || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                    {company.email || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                    <Badge
                      variant={company.status ? "default" : "destructive"}
                      className={
                      company.status
                        ? "bg-green-500/80 hover:bg-green-600"
                        : ""
                      }
                    >
                      {company.status
                      ? t("companies:table.active")
                      : t("companies:table.inactive")}
                    </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                    {company.contracted_services_count !== undefined
                      ? company.contracted_services_count
                      : "-"}
                    </TableCell>
                    <TableCell className="text-right text-center">
                    <DropdownMenu dir={i18n.dir()}>
                      <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">
                        {t("common:actions.openMenu")}
                        </span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                      {canManageContracts && (
                        <DropdownMenuItem asChild>
                        <Link
                          to={`/companies/${company.id}/contracts`}
                          className="flex items-center w-full"
                        >
                          <FileText className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
                          {t("companies:manageContractsButton")}
                        </Link>
                        </DropdownMenuItem>
                      )}
                      {canEditCompany && (
                        <DropdownMenuItem asChild>
                        <Link
                          to={`/companies/${company.id}/edit`}
                          className="flex items-center w-full"
                        >
                          <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
                          {t("common:edit")}
                        </Link>
                        </DropdownMenuItem>
                      )}
                      {canDeleteCompany && (
                        <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                          handleDelete(company.id, company.name)
                          }
                          className="text-destructive focus:text-destructive flex items-center w-full"
                          disabled={
                          deleteMutation.isPending &&
                          deleteMutation.variables === company.id
                          }
                        >
                          {deleteMutation.isPending &&
                          deleteMutation.variables === company.id ? (
                          <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin" />
                          ) : (
                          <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                          )}
                          {t("common:delete")}
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
        </Card>
      )}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-6">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={!meta.links.prev || isFetching}
            size="sm"
            variant="outline"
          >
            {t("common:pagination.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("common:pagination.pageInfo", {
              current: meta.current_page,
              total: meta.last_page,
            })}
          </span>
          <Button
            onClick={() =>
              setCurrentPage((p) => Math.min(meta.last_page, p + 1))
            }
            disabled={!meta.links.next || isFetching}
            size="sm"
            variant="outline"
          >
            {t("common:pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
