// src/pages/users/UsersListPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getUsers, deleteUser } from '@/services/userService';
import { User, PaginatedUsersResponse } from '@/types/users';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Edit, Loader2, ShieldCheck, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext'; // To get current user ID

export default function UsersListPage() {
  const { t, i18n } = useTranslation(['users', 'common']);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const { user: currentUser } = useAuth(); // Get the currently logged-in user

  const { data: paginatedData, isLoading, error, isFetching } = useQuery({
    queryKey: ['users', currentPage],
    queryFn: () => getUsers(currentPage),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success(t('users:deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(t('users:deleteError'), { description: err.response?.data?.message || err.message || t('common:error.generic') });
    },
  });

  const handleDelete = (userId: number, username: string) => {
    if (currentUser && currentUser.id === userId) {
      toast.error(t('users:errorCannotDeleteSelf', "You cannot delete your own account."));
      return;
    }
    if (window.confirm(t('users:deleteConfirmText', { username }))) {
      deleteMutation.mutate(userId);
    }
  };

  if (isLoading && !isFetching) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('users:loadingUsers')}</div>;
  if (error) return <p className="text-destructive p-4">{t('users:errorFetchingUsers', { message: error.message })}</p>;

  const users = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('users:pageTitle')}</h1>
        {/* TODO: Add permission check for this button */}
        <Button asChild size="sm"><Link to="/users/new">{t('users:addUserButton')}</Link></Button>
      </div>
      {isFetching && <div className="text-sm text-muted-foreground mb-2">{t('common:updatingList')}</div>}
      
      {users.length === 0 && !isLoading ? (
        <div className="text-center py-10 text-muted-foreground">{t('users:noUsersFound')}</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">{t('users:table.id')}</TableHead>
                <TableHead className="text-center">{t('users:table.name')}</TableHead>
                <TableHead className="hidden sm:table-cell text-center">{t('users:table.username')}</TableHead>
                <TableHead className="text-center">{t('users:table.roles')}</TableHead>
                <TableHead className="text-right">{t('users:table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-center">{user.id}</TableCell>
                  <TableCell className="font-medium text-center">{user.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-center">{user.username}</TableCell>
                  <TableCell className="text-center">
                    {user.roles?.map(role => (
                      <Badge key={role.id} variant="outline" className="ltr:mr-1 rtl:ml-1 mb-1">{role.name}</Badge>
                    ))}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu dir={i18n.dir()}>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* TODO: Add permission check for edit */}
                        <DropdownMenuItem asChild><Link to={`/users/${user.id}/edit`} className="flex items-center w-full"><Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> {t('common:edit')}</Link></DropdownMenuItem>
                        {currentUser && currentUser.id !== user.id && ( // Don't show delete for self
                          <>
                            <DropdownMenuSeparator />
                            {/* TODO: Add permission check for delete */}
                            <DropdownMenuItem onClick={() => handleDelete(user.id, user.name)} className="text-destructive focus:text-destructive flex items-center w-full" disabled={deleteMutation.isPending && deleteMutation.variables === user.id}>
                              {deleteMutation.isPending && deleteMutation.variables === user.id ? <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />}
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