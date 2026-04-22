import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getServicePriceHistory } from "@/services/serviceService";

interface Props {
  serviceId: number;
  serviceName: string;
  open: boolean;
  onClose: () => void;
}

const ServicePriceHistoryDialog: React.FC<Props> = ({ serviceId, serviceName, open, onClose }) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["servicePriceHistory", serviceId],
    queryFn: () => getServicePriceHistory(serviceId),
    enabled: open,
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        سجل تغييرات السعر
        <Typography variant="body2" color="text.secondary">
          {serviceName}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={3}>
            لا توجد تغييرات مسجلة
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center">السعر القديم</TableCell>
                <TableCell align="center">السعر الجديد</TableCell>
                <TableCell align="center">التغيير</TableCell>
                <TableCell align="center">المستخدم</TableCell>
                <TableCell align="center">التاريخ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((entry) => {
                const increased = entry.new_price > entry.old_price;
                const diff = entry.new_price - entry.old_price;
                return (
                  <TableRow key={entry.id}>
                    <TableCell align="center">{entry.old_price.toFixed(2)}</TableCell>
                    <TableCell align="center">{entry.new_price.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={increased
                          ? <TrendingUp size={14} />
                          : <TrendingDown size={14} />}
                        label={`${increased ? "+" : ""}${diff.toFixed(2)}`}
                        color={increased ? "error" : "success"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">{entry.user_name}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      {entry.changed_at}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServicePriceHistoryDialog;
