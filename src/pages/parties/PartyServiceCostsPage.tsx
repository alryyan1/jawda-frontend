// src/pages/parties/PartyServiceCostsPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import _debounce from 'lodash/debounce';

import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Pagination,
} from "@mui/material";
import { Trash2, PlusCircle, ArrowRightLeft, FileText, Search } from "lucide-react";

import type { Party, PartyServiceCost, PartyServiceCostFormData } from "@/types/parties";
import {
  getPartyById,
  getPartyServiceCosts,
  updatePartyServiceCost,
  removeServiceFromPartyCosts,
} from "@/services/partyService";
import type { PaginatedResponse } from "@/types/common";
import AddPartyServiceCostDialog from "./AddPartyServiceCostDialog";
import ImportServicesByGroupDialog from "./ImportServicesByGroupDialog";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useDebounce } from "@/hooks/useDebounce";

type FormValues = {
  costs: {
    service_id: number;
    service_name: string;
    service_group_name?: string;
    price: string;
  }[];
};
type CostFormItem = FormValues["costs"][0];

export default function PartyServiceCostsPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const numericPartyId = Number(partyId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const form = useForm<FormValues>({ defaultValues: { costs: [] } });
  const { control, getValues, formState: { dirtyFields } } = form;
  const { fields, replace } = useFieldArray({ control, name: "costs" });

  useEffect(() => { setCurrentPage(1); }, [debouncedSearchTerm]);

  const partyServiceCostsQueryKey = ['partyServiceCosts', numericPartyId, currentPage, debouncedSearchTerm] as const;

  const { data: party, isLoading: isLoadingParty } = useQuery<Party, Error>({
    queryKey: ["party", numericPartyId],
    queryFn: () => getPartyById(numericPartyId).then((res) => res.data),
    enabled: !!partyId,
  });

  const {
    data: paginatedCosts,
    isLoading: isLoadingCosts,
    error: costsError,
    isFetching: isFetchingCosts,
  } = useQuery<PaginatedResponse<PartyServiceCost>, Error>({
    queryKey: partyServiceCostsQueryKey,
    queryFn: () =>
      getPartyServiceCosts(numericPartyId, currentPage, { search: debouncedSearchTerm }),
    enabled: !!partyId,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (paginatedCosts?.data) {
      const formattedData = paginatedCosts.data.map((c) => ({
        service_id: c.service_id,
        service_name: c.service_name,
        service_group_name: c.service_group_name,
        price: String(c.price),
      }));

      const currentValues = getValues('costs');
      const hasChanges = formattedData.length !== currentValues.length ||
        formattedData.some((item, index) => {
          const current = currentValues[index];
          return !current || item.service_id !== current.service_id || item.price !== current.price;
        });

      if (hasChanges) {
        replace(formattedData);
      }
    }
  }, [paginatedCosts, replace, getValues]);

  const updateMutation = useMutation({
    mutationFn: (params: { serviceId: number; data: Partial<PartyServiceCostFormData> }) =>
      updatePartyServiceCost(numericPartyId, params.serviceId, params.data),
    onSuccess: (updated) => {
      toast.success("تم الحفظ تلقائياً", { id: `autosave-${updated.data.service_id}` });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error("فشل في التحديث", { description: error.response?.data?.message });
      queryClient.invalidateQueries({ queryKey: partyServiceCostsQueryKey });
    },
  });

  const debouncedUpdate = useCallback(
    _debounce((index: number, fieldName: keyof CostFormItem) => {
      if (dirtyFields.costs?.[index]?.[fieldName]) {
        const fullRowData = getValues(`costs.${index}`);
        const payload: Partial<PartyServiceCostFormData> = {
          price: parseFloat(fullRowData.price),
        };
        toast.info("جاري الحفظ...", { id: `autosave-${fullRowData.service_id}-${fieldName}` });
        updateMutation.mutate({ serviceId: fullRowData.service_id, data: payload });
      }
    }, 200),
    [dirtyFields, getValues, updateMutation]
  );

  const removeCostMutation = useMutation({
    mutationFn: (params: { partyId: number; serviceId: number }) =>
      removeServiceFromPartyCosts(params.partyId, params.serviceId),
    onSuccess: () => {
      toast.success("تم إزالة سعر الخدمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["partyServiceCosts", numericPartyId] });
      queryClient.invalidateQueries({ queryKey: ["partyAvailableServices", numericPartyId] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error("فشل في الحذف", { description: error.response?.data?.message || error.message });
    },
  });

  const handleRemoveCost = (serviceId: number, serviceName: string) => {
    if (window.confirm(`هل تريد إزالة سعر الخدمة "${serviceName}"؟`)) {
      removeCostMutation.mutate({ partyId: numericPartyId, serviceId });
    }
  };

  if (isLoadingParty || (isLoadingCosts && !isFetchingCosts)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 10rem)' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }
  if (costsError)
    return (
      <Typography variant="body1" color="error" sx={{ p: 2 }}>
        فشل في جلب أسعار الخدمات: {costsError.message}
      </Typography>
    );

  const costs = paginatedCosts?.data || [];
  const meta = paginatedCosts?.meta;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" size="small" onClick={() => navigate("/settings/parties")} sx={{ mb: 1.5 }}>
          <ArrowRightLeft className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          العودة إلى قائمة الجهات
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          أسعار خدمات {party?.name || "جاري التحميل..."}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          إدارة أسعار الخدمات الخاصة بهذه الجهة.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box sx={{ position: 'relative', width: { xs: '100%', sm: 'auto' }, maxWidth: { sm: 280 }, minWidth: { sm: 180 } }}>
          <TextField
            type="search"
            placeholder="البحث في الخدمات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="h-4 w-4" />
                </InputAdornment>
              ),
            }}
            sx={{ width: '100%' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ImportServicesByGroupDialog
            partyId={numericPartyId}
            partyName={party?.name || ""}
            onImported={() => {}}
          />
          <AddPartyServiceCostDialog
            partyId={numericPartyId}
            partyName={party?.name || ""}
            onCostAdded={() => {}}
          />
        </Box>
      </Box>

      {isFetchingCosts && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          جاري تحديث القائمة...
        </Typography>
      )}

      {costs.length === 0 && !isLoadingCosts ? (
        <Card sx={{ textAlign: 'center', py: 3 }}>
          <CardContent>
            <FileText className="mx-auto h-8 w-8" style={{ opacity: 0.5, marginBottom: 8 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              لا توجد أسعار خدمات
            </Typography>
            <AddPartyServiceCostDialog
              partyId={numericPartyId}
              partyName={party?.name || ""}
              onCostAdded={() => {}}
              triggerButton={
                <Button size="small" sx={{ mt: 1 }}>
                  <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  إضافة سعر خدمة
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <form>
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 0.75, textAlign: 'center' }}>اسم الخدمة</TableCell>
                      <TableCell sx={{ py: 0.75, width: 140, textAlign: 'center' }}>السعر</TableCell>
                      <TableCell sx={{ py: 0.75, textAlign: 'center', width: 70 }}>إزالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoadingCosts && <TableRow><TableCell colSpan={3} sx={{ textAlign: 'center', height: 72 }}><CircularProgress size={20} /></TableCell></TableRow>}
                    {!isLoadingCosts && fields.length === 0 && <TableRow><TableCell colSpan={3} sx={{ textAlign: 'center', height: 72, color: 'text.secondary' }}>لا توجد أسعار خدمات</TableCell></TableRow>}
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell sx={{ py: 0.5, fontWeight: 'medium', textAlign: 'center' }}>
                          {field.service_name}
                          {field.service_group_name && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {field.service_group_name}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 0.5, textAlign: 'center' }}>
                          <Controller
                            name={`costs.${index}.price`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                type="number"
                                size="small"
                                inputProps={{ step: "0.01" }}
                                sx={{ width: '100%', '& input': { textAlign: 'center', py: 0.75 } }}
                                onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'price'); }}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const nextIndex = index + 1;
                                    if (nextIndex < fields.length) {
                                      const nextInput = document.querySelector(`input[name="costs.${nextIndex}.price"]`) as HTMLInputElement;
                                      if (nextInput) {
                                        nextInput.focus();
                                        nextInput.select();
                                      }
                                    }
                                  }
                                }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.5, textAlign: 'center' }}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveCost(field.service_id, field.service_name)}
                            disabled={removeCostMutation.isPending && removeCostMutation.variables?.serviceId === field.service_id}
                          >
                            {removeCostMutation.isPending && removeCostMutation.variables?.serviceId === field.service_id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </form>
          </CardContent>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={meta.last_page}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            showFirstButton
            showLastButton
            siblingCount={1}
            boundaryCount={1}
          />
        </Box>
      )}

      {meta && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          عرض {meta.from} إلى {meta.to} من أصل {meta.total} نتيجة
        </Typography>
      )}
    </Box>
  );
}
