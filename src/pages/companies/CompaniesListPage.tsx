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
import { useAuthorization } from "@/hooks/useAuthorization"; // For permission checks

export default function CompaniesListPage() {
  // i18n removed
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const { can ,user} = useAuthorization(); // Get permission checking function
    console.log(user,'user')
  // TODO: Define these permissions in your backend and PermissionName type
  const canCreateCompany = can("create companies" );
  const canEditCompany = can("edit companies" );
  const canDeleteCompany = can("delete companies" );
  const canManageContracts = can("manage company_contracts" ); // Example permission for contracts
  console.log(canCreateCompany,'canCreateCompany','user',user)
  console.log(canManageContracts,'canManageContracts','user',user)
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
      toast.success('تم حذف الشركة بنجاح');
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err: any) => {
      toast.error('فشل الحذف', { description: err.response?.data?.message || err.message });
    },
  });

  const handleDelete = (companyId: number, companyName: string) => {
    if (window.confirm(`هل تريد حذف الشركة "${companyName}"؟`)) {
      deleteMutation.mutate(companyId);
    }
  };

  if (isLoading && !isFetching)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />{" "}
        جاري تحميل الشركات...
      </div>
    );
  if (error)
    return (
      <p className="text-destructive p-4">حدث خطأ أثناء جلب الشركات: {error.message}</p>
    );

  const companies = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Building className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">الشركات</h1>
        </div>
        {canCreateCompany && (
          <Button asChild size="sm">
            <Link to="/settings/companies/new">إضافة شركة</Link>
          </Button>
        )}
      </div>
      {isFetching && (
        <div className="text-sm text-muted-foreground mb-2">جاري تحديث القائمة...</div>
      )}

      {companies.length === 0 && !isLoading ? (
        <div className="text-center py-10 text-muted-foreground border rounded-lg bg-card">
          <Building className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p>لا توجد شركات للعرض.</p>
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
                  المعرف
                </TableHead>
                <TableHead className="text-center">الإسم</TableHead>
                <TableHead className="hidden md:table-cell text-center">
                  الهاتف
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center">
                  تحمل الخدمات
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center">
                  تحمل المختبر
                </TableHead>
                <TableHead className="text-center">
                  الحالة
                </TableHead>
                <TableHead className="hidden sm:table-cell text-center">
                  العقود
                </TableHead>
                <TableHead className="text-center">
                  الإجراءات
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
                    {company.service_endurance || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                    {company.lab_endurance || "-"}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">
                        فتح القائمة
                        </span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canManageContracts && (
                        <DropdownMenuItem asChild>
                        <Link
                          to={`/settings/companies/${company.id}/contracts`}
                          className="flex items-center w-full"
                        >
                          <FileText className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
                          إدارة عقود الخدمات
                        </Link>
                        </DropdownMenuItem>
                        )}
                            {canManageContracts && (
                        <DropdownMenuItem asChild>
                        <Link
                          to={`/settings/companies/${company.id}/test-contracts`}
                          className="flex items-center w-full"
                        >
                          <FileText className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
                          إدارة عقود التحاليل
                        </Link>
                        </DropdownMenuItem>
                        )}
                      {canEditCompany && (
                        <DropdownMenuItem asChild>
                        <Link
                          to={`/settings/companies/${company.id}/edit`}
                          className="flex items-center w-full"
                        >
                          <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
                          تعديل
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
                          حذف
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
            disabled={currentPage <= 1 || isFetching}
            size="sm"
            variant="outline"
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {meta.current_page} من {meta.last_page}
          </span>
          <Button
            onClick={() =>
              setCurrentPage((p) => Math.min(meta.last_page, p + 1))
            }
            disabled={currentPage >= meta.last_page || isFetching}
            size="sm"
            variant="outline"
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
