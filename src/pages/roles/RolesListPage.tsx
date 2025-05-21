
// src/pages/roles/RolesListPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getRoles, deleteRole } from '@/services/roleService';
import { Role, PaginatedRolesResponse, Permission } from '@/types/auth'; // Adjust path
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Edit, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function RolesListPage() {
  const { t, i18n } = useTranslation(['roles', 'common', 'permissions']); // Include permissions for display
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: paginatedData, isLoading, error, isFetching } = useQuery({
    queryKey: ['roles', currentPage],
    queryFn: () => getRoles(currentPage),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      toast.success(t('roles:deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || t('roles:deleteError');
      toast.error(message, { description: err.message && err.message !== message ? err.message : t('common:error.generic') });
    },
  });

  const handleDelete = (role: Role) => {
    // You might want to fetch role.users_count from backend to use in the confirmation message
    // For now, a generic message
    if (window.confirm(t('roles:deleteConfirmText', { roleName: role.name }))) {
      deleteMutation.mutate(role.id);
    }
  };

  const renderPermissions = (permissions?: Permission[]) => {
    if (!permissions || permissions.length === 0) return <span className="text-xs text-muted-foreground">{t('common:none')}</span>;
    const displayLimit = 3;
    const displayed = permissions.slice(0, displayLimit);
    const remaining = permissions.length - displayLimit;

    return (
      <div className="flex flex-wrap gap-1 items-center">
        {displayed.map(p => (
          <Badge key={p.id} variant="secondary" className="text-xs whitespace-nowrap">
            {t(`permissions:${p.name.replace(/ /g, '_')}`, p.name)}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="outline" className="text-xs">+{remaining} {t('common:more')}</Badge>
        )}
      </div>
    );
  };

  if (isLoading && !isFetching) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('roles:loadingRoles')}</div>;
  if (error) return <p className="text-destructive p-4">{t('roles:errorFetchingRoles', { message: error.message })}</p>;

  const roles = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('roles:pageTitle')}</h1>
        {/* TODO: Add permission check for this button (e.g., can('create roles')) */}
        <Button asChild size="sm"><Link to="/roles/new">{t('roles:addRoleButton')}</Link></Button>
      </div>
      {isFetching && <div className="text-sm text-muted-foreground mb-2">{t('common:updatingList')}</div>}
      
      {roles.length === 0 && !isLoading ? (
        <div className="text-center py-10 text-muted-foreground">{t('roles:noRolesFound')}</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] sm:w-[100px]">{t('roles:table.name')}</TableHead>
                <TableHead>{t('roles:table.permissions')}</TableHead>
                <TableHead className="text-right w-[100px]">{t('roles:table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{renderPermissions(role.permissions)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu dir={i18n.dir()}>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">{t('common:actions.openMenu')}</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* TODO: Add permission check for edit */}
                        <DropdownMenuItem asChild><Link to={`/roles/${role.id}/edit`} className="flex items-center w-full"><Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> {t('common:edit')}</Link></DropdownMenuItem>
                        {/* Prevent deleting critical roles like Super Admin */}
                        {role.name !== 'Super Admin' && ( 
                          <>
                            <DropdownMenuSeparator />
                            {/* TODO: Add permission check for delete */}
                            <DropdownMenuItem onClick={() => handleDelete(role)} className="text-destructive focus:text-destructive flex items-center w-full" disabled={deleteMutation.isPending && deleteMutation.variables === role.id}>
                              {deleteMutation.isPending && deleteMutation.variables === role.id ? <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />}
                              {t('common:delete')}
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
            <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching} size="sm" variant="outline">
                {t('common:pagination.previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
                {t('common:pagination.pageInfo', { current: meta.current_page, total: meta.last_page })}
            </span>
            <Button onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching} size="sm" variant="outline">
                {t('common:pagination.next')}
            </Button>
        </div>
      )}
    </div>
  );
}