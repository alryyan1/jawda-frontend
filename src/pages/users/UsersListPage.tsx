// src/pages/users/UsersListPage.tsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getUsers, deleteUser } from "@/services/userService";
import type { User, PaginatedUsersResponse } from "@/types/users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  UserPlus,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function UsersListPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Placeholder permissions - replace with actual checks
  const canCreateUsers = true;
  const canEditUsers = true;
  const canDeleteUsers = true;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm] = useState("");

  // Debounce search term if needed, for now direct query
  const filters = useMemo(() => ({ search: searchTerm }), [searchTerm]);

  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedUsersResponse, Error>({
    queryKey: ["users", currentPage, filters],
    queryFn: () => getUsers(currentPage, filters),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("تم حذف المستخدم بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      const errorResponse = err as Error & { response?: { data?: { message?: string } } };
      toast.error("خطأ أثناء حذف المستخدم.", {
        description:
          errorResponse.response?.data?.message ||
          err.message ||
          "حدث خطأ غير متوقع.",
      });
    },
  });

  const handleDelete = (userToDelete: User) => {
    if (currentUser && currentUser.id === userToDelete.id) {
      toast.error("لا يمكنك حذف نفسك");
      return;
    }
    // Add more checks, e.g., cannot delete last super admin
    if (
      userToDelete.roles?.some((role) => role.name === "Super Admin") &&
      paginatedData?.data.filter((u: User) =>
        u.roles?.some((r) => r.name === "Super Admin")
      ).length === 1
    ) {
      toast.error("لا يمكن حذف آخر مشرف في النظام");
      return;
    }

    if (
      window.confirm(
        `هل أنت متأكد أنك تريد حذف المستخدم ${userToDelete.name}؟`
      )
    ) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  if (isLoading && !isFetching && currentPage === 1 && !paginatedData) {
    // More specific initial loading
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">جارٍ تحميل المستخدمين...</p>
      </div>
    );
  }
  if (error)
    return (
      <p className="text-destructive p-6 text-center">
        {`فشل تحميل إدارة المستخدمين: ${error.message}`}
      </p>
    );

  const users = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="container mx-auto py-4 sm:py-6 lg:py-8">
        <CardHeader className="px-0 pt-0 mb-4 sm:mb-6">
          {" "}
          {/* Use CardHeader for title section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl sm:text-3xl">
                إدارة المستخدمين
              </CardTitle>
            </div>
            <div className="flex sm:flex-row flex-col w-full sm:w-auto gap-2">
              {/* Search Input - Consider debouncing if list is very large */}
              {/* <Input 
                type="search" 
                placeholder="ابحث بالاسم أو اسم المستخدم..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full sm:w-64"
              /> */}
              {canCreateUsers && (
                <Button asChild size="sm" className="h-9 w-full sm:w-auto">
                  <Link to="/users/new" className="flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" /> إضافة مستخدم جديد
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isFetching && (
          <div className="text-center text-sm text-muted-foreground mb-2">
            <Loader2 className="inline h-4 w-4 animate-spin ltr:mr-1 rtl:ml-1" />
            جاري تحديث القائمة...
          </div>
        )}

        {users.length === 0 && !isLoading && !isFetching ? (
          <Card className="text-center py-12">
            <CardContent className="flex flex-col items-center gap-3 text-muted-foreground">
              <UsersIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" />
              <p className="font-medium">
                {searchTerm
                  ? "لم يتم العثور على نتائج"
                  : "لم يتم العثور على مستخدمين."}
              </p>
              {canCreateUsers && !searchTerm && (
                <Button asChild size="sm" className="mt-2">
                  <Link to="/users/new">إضافة مستخدم جديد</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center hidden sm:table-cell">
                    م
                  </TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead className="hidden md:table-cell text-center">
                    اسم المستخدم
                  </TableHead>
                  <TableHead className="text-center">
                    الأدوار
                  </TableHead>
                  <TableHead className="text-center w-[120px]">
                    الحالة
                  </TableHead>
                  <TableHead className="text-right w-[80px]">
                    إجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow
                    key={user.id}
                    className={cn(
                      !user.is_active &&
                        "opacity-50 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                    )}
                    data-testid={`user-row-${user.id}`}
                  >
                    <TableCell className="text-center hidden sm:table-cell py-2.5">
                      {user.id}
                    </TableCell>
                    <TableCell className="font-medium py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span>{user.name}</span>
                        {user.is_supervisor && (
                          <Tooltip>
                            <TooltipTrigger>
                              <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>مشرف</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {currentUser?.id === user.id && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4 leading-tight"
                          >
                            أنت
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center py-2.5">
                      {user.username}
                    </TableCell>
                    <TableCell className="text-center py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {user.roles?.slice(0, 2).map((role) => (
                          <Badge
                            key={role.id}
                            variant="outline"
                            className="text-xs px-1.5 py-0.5"
                          >
                            {role.name}
                          </Badge>
                        ))}
                        {user.roles && user.roles.length > 2 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                className="text-xs px-1.5 py-0.5"
                              >
                                +{user.roles.length - 2}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {user.roles
                                .slice(2)
                                .map((r) => r.name)
                                .join(", ")}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-2.5">
                      {user.is_active ? (
                        <Badge
                          variant="success"
                          className="text-xs px-1.5 py-0.5 font-normal items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />{" "}
                          نشط
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="text-xs px-1.5 py-0.5 font-normal items-center gap-1"
                        >
                          <XCircle className="h-3 w-3" />{" "}
                          غير نشط
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <DropdownMenu dir={i18n.dir()}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={
                              deleteMutation.isPending &&
                              deleteMutation.variables === user.id
                            }
                          >
                            {deleteMutation.isPending &&
                            deleteMutation.variables === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                            <span className="sr-only">
                              فتح القائمة
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {canEditUsers && (
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/users/${user.id}/edit`}
                                className="flex items-center w-full"
                              >
                                <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
                                تعديل
                              </Link>
                            </DropdownMenuItem>
                          )}

                          {/* Delete action (conditionally rendered and disabled) */}
                          {canDeleteUsers &&
                            currentUser &&
                            currentUser.id !== user.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user)}
                                  className="text-destructive focus:text-destructive flex items-center w-full"
                                  disabled={
                                    deleteMutation.isPending &&
                                    deleteMutation.variables === user.id
                                  }
                                >
                                  <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
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
          <div className="flex items-center justify-center sm:justify-end gap-2 mt-6">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isFetching}
              size="sm"
              variant="outline"
            >
              السابق
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {`صفحة ${meta.current_page} من ${meta.last_page}`}
              })}
            </span>
            <Button
              onClick={() =>
                setCurrentPage((p) => Math.min(meta.last_page, p + 1))
              }
              disabled={currentPage === meta.last_page || isFetching}
              size="sm"
              variant="outline"
            >
              التالي
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
