import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FlaskConical, Plus } from 'lucide-react';
import type { DoctorVisit } from '@/types/visits';
import type { LabRequest } from '@/types/visits';
import AddLabTestsDialog from '../AddLabTestsDialog';

interface LabResultsSectionProps {
  visit: DoctorVisit | undefined;
}

const LabResultsSection: React.FC<LabResultsSectionProps> = ({ visit }) => {
  const [addOpen, setAddOpen] = useState(false);
  const labRequests: LabRequest[] = (visit?.lab_requests as LabRequest[]) ?? [];

  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Header with Add button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          طلبات المختبر ({labRequests.length})
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<Plus size={14} />}
          onClick={() => setAddOpen(true)}
          sx={{ fontSize: '0.75rem', py: 0.5 }}
        >
          إضافة فحص
        </Button>
      </Box>

      {/* Add dialog */}
      <AddLabTestsDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        visitId={visit.id}
      />

      {labRequests.length === 0 && (
        <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
          <FlaskConical size={36} />
          <Typography>لا توجد طلبات مختبر — اضغط "إضافة فحص" لطلب فحص جديد</Typography>
        </Box>
      )}

      {labRequests.map((req: any) => {
        const testName = req.main_test?.main_test_name ?? req.main_test_name ?? `طلب #${req.id}`;
        const isAuthorized = req.result_auth === true || req.result_auth === 1;
        const isPaid = req.is_paid === true || req.is_paid === 1;
        const childTests = req.main_test?.child_tests ?? req.child_tests ?? [];

        return (
          <Accordion
            key={req.id}
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                  {testName}
                </Typography>
                <Chip
                  label={isAuthorized ? 'معتمد' : 'معلق'}
                  size="small"
                  color={isAuthorized ? 'success' : 'default'}
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
                <Chip
                  label={isPaid ? 'مدفوع' : 'غير مدفوع'}
                  size="small"
                  color={isPaid ? 'success' : 'warning'}
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 1 }}>
              {childTests.length > 0 ? (
                <Table size="small">
                  <TableBody>
                    {childTests.map((child: any) => (
                      <TableRow key={child.id} hover>
                        <TableCell sx={{ fontSize: '0.75rem', borderBottom: 'none', py: 0.5 }}>
                          {child.child_test_name ?? child.name ?? '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', borderBottom: 'none', py: 0.5, fontWeight: 600 }}>
                          {child.result ?? child.result_value ?? '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', borderBottom: 'none', py: 0.5, color: 'text.secondary' }}>
                          {child.unit?.name ?? child.unit ?? ''}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', borderBottom: 'none', py: 0.5, color: 'text.secondary' }}>
                          {child.normal_range ?? ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="caption" color="text.disabled">
                  لا توجد نتائج بعد
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default LabResultsSection;
