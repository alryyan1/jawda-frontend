import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Phone, CalendarDays, User, Receipt, UserCircle2 } from "lucide-react";
import { Card as MuiCard, CardContent as MuiCardContent, Box, Chip, Divider, Typography } from "@mui/material";

interface StatusItem {
  done?: boolean;
  time?: string | null;
  by?: string | null;
}

export interface PatientDetailsLabEntryProps {
  visitId: number | null;
  patientName?: string | null;
  doctorName?: string | null;
  date?: string | null;
  phone?: string | null;
  paymentMethod?: string | null;
  registeredBy?: string | null;
  age?: string | number | null;
  statuses?: {
    payment?: StatusItem;
    collected?: StatusItem;
    print?: StatusItem;
    authentication?: StatusItem;
  };
  className?: string;
}

const ItemRow: React.FC<{
  label: string;
  value?: React.ReactNode;
  icon?: React.ElementType;
}> = ({ label, value, icon: Icon }) => (
  <Box className="grid grid-cols-[18px_auto_1fr] items-center py-1 gap-x-2">
    <div className="h-4 w-4 text-muted-foreground flex items-center justify-center">
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
    </div>
    <Typography variant="caption" className="text-muted-foreground whitespace-nowrap">
      {label}
    </Typography>
    <Typography variant="caption" className="font-medium truncate" title={typeof value === 'string' ? value : undefined}>
      {value ?? "-"}
    </Typography>
  </Box>
);

const StatusRow: React.FC<{ label: string; status?: StatusItem }> = ({
  label,
  status,
}) => (
  <Box className="flex items-center justify-between py-1">
    <Typography variant="caption" className="text-muted-foreground">
      {label}
    </Typography>
    <Box className="flex items-center gap-1.5">
      {status?.time ? (
        <Chip size="small" variant="outlined" label={status.time} className="text-[10px]" />
      ) : null}
      <CheckCircle2 className="text-green-600" size={16} />
    </Box>
  </Box>
);

const PatientDetailsLabEntry: React.FC<PatientDetailsLabEntryProps> = ({
  visitId,
  patientName,
  doctorName,
  date,
  phone,
  paymentMethod,
  registeredBy,
  age,
  statuses,
  className,
}) => {
  return (
    <MuiCard dir="rtl" className={cn("shadow-sm", className)}>
      <Box
        className="text-center text-white"
        sx={{
          backgroundImage:
            "linear-gradient(140deg, #EADEDB 0%, #BC70A4 50%, #BFD641 75%)",
          borderBottom: "1px solid #EEE",
          py: 0.5,
        }}
      >
        <Typography variant="subtitle1" className="font-bold tracking-wide">
          {visitId ?? "-"}
        </Typography>
      </Box>
      <MuiCardContent className="px-3 py-2">
        <Box className="text-center mb-2">
          <Typography variant="subtitle2" className="text-primary font-semibold">
            {patientName || "-"}
          </Typography>
        </Box>

        <Box>
          <ItemRow label="الطبيب" value={doctorName || "-"} icon={User} />
          <ItemRow label="التاريخ" value={date || "-"} icon={CalendarDays} />
          <ItemRow label="الهاتف" value={phone || "-"} icon={Phone} />
          <ItemRow label="السداد" value={paymentMethod || "-"} icon={Receipt} />
          <ItemRow label="سُجل بواسطه" value={registeredBy || "-"} icon={UserCircle2} />
          <ItemRow label="العمر" value={age ?? "-"} />
        </Box>

        <Divider className="my-2" />
        <Box className="flex items-center gap-2 mb-1">
          <Typography variant="subtitle2" className="text-sm font-semibold">
            Status
          </Typography>
          <div className="flex-1 h-px bg-border" />
        </Box>
        <Box className="space-y-1">
          <StatusRow label="Payment" status={statuses?.payment} />
          <StatusRow label="Collected" status={statuses?.collected} />
          <StatusRow label="Print" status={statuses?.print} />
          <Box className="flex items-center justify-between py-1">
            <Typography variant="caption" className="text-muted-foreground">
              Authentication
            </Typography>
            <CheckCircle2 className="text-green-600" size={16} />
          </Box>
        </Box>
      </MuiCardContent>
    </MuiCard>
  );
};

export default PatientDetailsLabEntry;


