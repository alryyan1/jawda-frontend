// src/pages/audit/InsuranceAuditPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

import InsuranceAuditExportFiltersDialog, { type AuditExportFilters } from '@/components/audit/InsuranceAuditExportFiltersDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Loader2, FileSearch, ShieldAlert, ShieldCheck, FileWarning, Filter, FileText, Download, FileSpreadsheet } from 'lucide-react';

import type { DoctorVisit } from '@/types/visits';
import type { PaginatedResponse } from '@/types/common';
import { listAuditableVisits, exportAuditPdf, exportAuditExcel, type AuditListFilters } from '@/services/insuranceAuditService';
import InsuranceAuditFiltersDialog, { type InsuranceAuditFilterValues } from '@/components/audit/InsuranceAuditFiltersDialog';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface ExtendedDoctorVisit extends DoctorVisit {
  auditRecord?: {
    status: string;
  };
}

type ExtendedInsuranceAuditFilterValues = Omit<InsuranceAuditFilterValues, 'date_range'> & {
  date_from?: string;
  date_to?: string;
};

interface AuditListFiltersWithStringId extends Omit<AuditListFilters, 'company_id'> {
  company_id: string;
}

const InsuranceAuditPage: React.FC = () => {
  const { t, i18n } = useTranslation(['audit', 'common']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;
  const [isExportFiltersDialogOpen, setIsExportFiltersDialogOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | false>(false);

  const [filters, setFilters] = useState<AuditListFiltersWithStringId>({
    company_id: '',
    audit_status: 'pending_review',
    date_from: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    date_to: format(new Date(), 'yyyy-MM-dd'),
  });

  const auditListQueryKey = ['insuranceAuditList', currentPage, filters] as const;

  const { data: paginatedVisits, isLoading, error, isFetching } = useQuery<PaginatedResponse<ExtendedDoctorVisit>, Error>({
    queryKey: auditListQueryKey,
    queryFn: () => listAuditableVisits({ 
      ...filters, 
      page: currentPage,
      company_id: Number(filters.company_id)
    }),
    enabled: !!filters.company_id,
    placeholderData: keepPreviousData,
  });

  const handleApplyFilters = (newFiltersFromDialog: ExtendedInsuranceAuditFilterValues) => {
    setCurrentPage(1);
    setFilters({
      company_id: String(newFiltersFromDialog.company_id),
      patient_name: newFiltersFromDialog.patient_name,
      audit_status: newFiltersFromDialog.audit_status,
      date_from: newFiltersFromDialog.date_from || format(new Date(), 'yyyy-MM-dd'),
      date_to: newFiltersFromDialog.date_to || format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleExport = async (exportFilters: AuditExportFilters, formatType: 'pdf' | 'excel') => {
    setIsExporting(formatType);
    try {
      const blob = formatType === 'pdf' 
        ? await exportAuditPdf({
            company_id: Number(exportFilters.company_id),
            date_from: exportFilters.date_from,
            date_to: exportFilters.date_to,
          })
        : await exportAuditExcel(exportFilters);

      // Download blob
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${formatType}-${format(new Date(), 'yyyy-MM-dd')}.${formatType}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('audit:export.success', {type: formatType.toUpperCase()}));
    } catch (err: unknown) {
      const error = err as ApiError;
      toast.error(t('audit:export.error'), { description: error.response?.data?.message || error.message });
    } finally {
      setIsExporting(false);
      setIsExportFiltersDialogOpen(false);
    }
  };

  const getAuditStatusBadge = (visit: ExtendedDoctorVisit): React.ReactNode => {
    const status = visit.auditRecord?.status || 'pending_review';
    switch (status) {
      case 'verified':
        return <Badge variant="success" className="text-xs"><ShieldCheck className="h-3 w-3 ltr:mr-1 rtl:ml-1"/>{t('audit:status.verified')}</Badge>;
      case 'needs_correction':
        return <Badge variant="secondary" className="text-xs"><FileWarning className="h-3 w-3 ltr:mr-1 rtl:ml-1"/>{t('audit:status.needs_correction')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs"><ShieldAlert className="h-3 w-3 ltr:mr-1 rtl:ml-1"/>{t('audit:status.rejected')}</Badge>;
      case 'pending_review':
      default:
        return <Badge variant="outline" className="text-xs">{t('audit:status.pending_review')}</Badge>;
    }
  };

  const visits = paginatedVisits?.data || [];
  const meta = paginatedVisits?.meta;

  return (
    <TooltipProvider>
      <div className="container mx-auto py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FileSearch className="h-7 w-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">{t('audit:pageTitle')}</h1>
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setIsFiltersDialogOpen(true)} className="h-9">
              <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> {t('audit:filters.titleShort')}
            </Button>
             <Button variant="outline" size="sm" onClick={() => setIsExportFiltersDialogOpen(true)} disabled={isExporting !== false} className="h-9">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileSpreadsheet className="h-4 w-4"/>} 
                <span className="ltr:ml-2 rtl:mr-2 hidden sm:inline">{t('common:export')}</span>
             </Button>
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setIsFiltersDialogOpen(true)} className="h-9">
              <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> {t('audit:filters.titleShort')}
            </Button>
             <Button variant="outline" size="sm" onClick={() => handleExport({
               company_id: filters.company_id,
               date_from: filters.date_from || '',
               date_to: filters.date_to || ''
             }, 'pdf')} disabled={isExporting === 'pdf' || !filters.company_id} className="h-9">
                {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileText className="h-4 w-4"/>} 
                <span className="ltr:ml-2 rtl:mr-2 hidden sm:inline">{t('common:exportPdf')}</span>
             </Button>
             <Button variant="outline" size="sm" onClick={() => handleExport({
               company_id: filters.company_id,
               date_from: filters.date_from || '',
               date_to: filters.date_to || ''
             }, 'excel')} disabled={isExporting === 'excel' || !filters.company_id} className="h-9">
                {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>} 
                <span className="ltr:ml-2 rtl:mr-2 hidden sm:inline">{t('common:exportExcel')}</span>
             </Button>
          </div>
        </div>

        {isFetching && <div className="text-sm text-muted-foreground mb-2 text-center">{t('common:updatingList')}</div>}
        
        {!filters.company_id && !isLoading && (
            <Card className="text-center py-10 text-muted-foreground">
                <CardContent>{t('audit:selectCompanyPrompt')}</CardContent>
            </Card>
        )}

        {filters.company_id && isLoading && !isFetching && (
          <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        )}
        {filters.company_id && error && (
          <p className="text-destructive p-4 text-center">{t('common:error.fetchFailedExt', { entity: t('audit:auditableVisits'), message: error.message })}</p>
        )}
        {filters.company_id && !isLoading && !error && visits.length === 0 && (
          <Card className="text-center py-10 text-muted-foreground">
            <CardContent>{t('audit:noVisitsFound')}</CardContent>
          </Card>
        )}

        {filters.company_id && !isLoading && !error && visits.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">{t('audit:table.visitId')}</TableHead>
                  <TableHead>{t('audit:table.patientName')}</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">{t('audit:table.visitDate')}</TableHead>
                  <TableHead className="hidden md:table-cell text-center">{t('audit:table.doctorName')}</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">{t('audit:table.companyName')}</TableHead>
                  <TableHead className="text-center">{t('audit:table.auditStatus')}</TableHead>
                  <TableHead className="text-center">{t('common:actions.openMenu')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-center align-middle">{visit.id}</TableCell>
                    <TableCell className="font-medium align-middle">{visit.patient?.name || t('common:unknown')}</TableCell>
                    <TableCell className="hidden sm:table-cell text-center align-middle">
                      {visit.visit_date ? format(parseISO(visit.visit_date), 'P', { locale: dateLocale }) : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center align-middle">{visit.doctor?.name || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-center align-middle">{visit.patient?.company?.name || '-'}</TableCell>
                    <TableCell className="text-center align-middle">{getAuditStatusBadge(visit)}</TableCell>
                    <TableCell className="text-center align-middle">
                      <Button variant="outline" size="xs" asChild>
                        <Link to={`/settings/insurance-audit/visit/${visit.id}`}>
                          {t('audit:actions.auditDetails')}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {filters.company_id && meta && meta.last_page > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>
              {t('common:previous')}
            </Button>
            <span className="mx-2 text-sm">{t('common:page')} {currentPage} {t('common:of')} {meta.last_page}</span>
            <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching}>
              {t('common:next')}
            </Button>
          </div>
        )}
      </div>

      <InsuranceAuditFiltersDialog
        isOpen={isFiltersDialogOpen}
        onOpenChange={setIsFiltersDialogOpen}
        currentFilters={filters}
        onApplyFilters={handleApplyFilters}
      />
      
      {/* NEW: Export Filters Dialog */}
      <InsuranceAuditExportFiltersDialog
        isOpen={isExportFiltersDialogOpen}
        onOpenChange={setIsExportFiltersDialogOpen}
        onExport={handleExport}
        isExporting={isExporting !== false}
      />
    </TooltipProvider>
  );
};

export default InsuranceAuditPage;