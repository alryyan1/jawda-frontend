import React from "react";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  Phone, 
  CalendarDays, 
  User, 
  UserCircle2, 
  Clock,
  Shield,
  Printer,
  CreditCard
} from "lucide-react";
import { 
  Card as MuiCard, 
  CardContent as MuiCardContent, 
  Box, 
  Chip, 
  Typography,
  Avatar,
  Paper,
  LinearProgress,
  Tooltip
} from "@mui/material";
import dayjs from "dayjs";
import { useAuth } from "@/contexts/AuthContext";

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
  onAuthenticationToggle?: () => void;
}

const ItemRow: React.FC<{
  label: string;
  value?: React.ReactNode;
  icon?: React.ElementType;
  isLast?: boolean;
}> = ({ label, value, icon: Icon, isLast = false }) => (
  <>
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        py: 1, 
        px: 0.5,
        borderRadius: 1,
        '&:hover': {
          backgroundColor: 'action.hover',
          transition: 'background-color 0.2s ease-in-out'
        }
      }}
    >
      <Avatar 
        sx={{ 
          width: 24, 
          height: 24, 
          bgcolor: 'primary.light', 
          mr: 1.5,
          '& .MuiAvatar-root': {
            fontSize: '0.75rem'
          }
        }}
      >
        {Icon ? <Icon size={12} color="white" /> : null}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary', 
            fontWeight: 500,
            flex: '0 0 auto',
            mr: 2
          }}
        >
          {label}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: '0 0 auto',
            minWidth: 0,
            maxWidth: '60%'
          }}
          title={typeof value === 'string' ? value : undefined}
        >
          {value ?? "-"}
        </Typography>
      </Box>
    </Box>
    {!isLast && (
      <Box 
        sx={{ 
          height: '1px', 
          bgcolor: 'divider', 
          mx: 2,
          opacity: 0.5
        }} 
      />
    )}
  </>
);

const StatusIcon: React.FC<{ 
  label: string; 
  status?: StatusItem; 
  icon?: React.ElementType;
  onClick?: () => void;
  isClickable?: boolean;
}> = ({ label, status, icon: Icon, onClick, isClickable = false }) => {
  const isCompleted = status?.done;
   console.log(label,'label',status)
  return (
    <Tooltip title={isClickable ? (isCompleted ? "انقر لإلغاء المصادقة (مدير)" : "انقر للمصادقة (مدير)") : label}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 1,
          borderRadius: 2,
          border: 1,
          borderColor: isCompleted ? 'success.light' : 'divider',
          backgroundColor: isCompleted ? 'success.light' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          width: 50,
          height: 50,
          position: 'relative',
          cursor: isClickable ? 'pointer' : 'default',
          '&:hover': {
            boxShadow: 2,
            transform: 'translateY(-2px)',
            borderColor: isCompleted ? 'success.main' : 'primary.light',
            ...(isClickable && {
              borderColor: isCompleted ? 'error.main' : 'success.main',
              backgroundColor: isCompleted ? 'error.light' : 'success.light'
            })
          }
        }}
        onClick={isClickable ? onClick : undefined}
      >
      <Avatar 
        sx={{ 
          width: 32, 
          height: 32, 
          bgcolor: isCompleted ? 'success.main' : 'grey.300',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)'
          }
        }}
      >
        {Icon ? <Icon size={18} color="white" /> : null}
      </Avatar>
      <CheckCircle2 
        size={12} 
        color={isCompleted ? '#4caf50' : '#9e9e9e'}
        style={{ 
          transition: 'color 0.2s ease-in-out',
          position: 'absolute',
          top: 2,
          right: 2
        }}
      />
    </Box>
    </Tooltip>
  );
};

const PatientDetailsLabEntry: React.FC<PatientDetailsLabEntryProps> = ({
  visitId,
  patientName,
  doctorName,
  date,
  phone,
  registeredBy,
  age,
  statuses,
  className,
  onAuthenticationToggle
}) => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some(role => role.name === 'admin') || false;
  const completedSteps = Object.values(statuses || {}).filter(status => status?.done).length;
  const totalSteps = Object.keys(statuses || {}).length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <MuiCard 
      dir="rtl" 
      className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300", className)}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          transform: 'translateY(-2px)',
          transition: 'transform 0.2s ease-in-out'
        }
      }}
    >
      {/* Enhanced Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 1,
          px: 2,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '0.5px', fontSize: '1.1rem' }}>
            #{visitId ?? "-"}
          </Typography>
          <Chip 
            label={`${completedSteps}/${totalSteps}`}
            size="small"
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              color: 'white',
              fontWeight: 600,
              backdropFilter: 'blur(10px)',
              height: 20,
              fontSize: '0.7rem'
            }}
          />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'center', fontSize: '1.2rem' }}>
          {patientName || "-"}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage}
          sx={{ 
            mt: 1, 
            height: 4, 
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.2)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 2,
              background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)'
            }
          }}
        />
      </Box>

      <MuiCardContent sx={{ p: 2 }}>
        {/* Patient Information Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1.5, 
            mb: 2, 
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}
        >
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600, 
              mb: 1, 
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: '0.9rem'
            }}
          >
            <User size={16} />
            معلومات المريض
          </Typography>

          <Box>
            <ItemRow label="الطبيب" value={doctorName || "-"} icon={User} />
            <ItemRow label="التاريخ" value={dayjs(date).format('DD/MM/YYYY') || "-"} icon={CalendarDays} />
            <ItemRow label="الهاتف" value={phone || "-"} icon={Phone} />
            <ItemRow label="سُجل بواسطة" value={registeredBy || "-"} icon={UserCircle2} />
            <ItemRow label="العمر" value={age ?? "-"} icon={Clock} isLast={true} />
          </Box>
        </Paper>

        {/* Status Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1.5, 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}
        >
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600, 
              mb: 1, 
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: '0.9rem'
            }}
          >
            <Shield size={16} />
            حالة العملية
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1, 
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'nowrap',
              overflow: 'hidden'
            }}
          >
            <StatusIcon 
              label="الدفع" 
              status={statuses?.payment} 
              icon={CreditCard}
            />
            <StatusIcon 
              label="جمع العينة" 
              status={statuses?.collected} 
              icon={Clock}
            />
            <StatusIcon 
              label="طباعة النتائج" 
              status={statuses?.print} 
              icon={Printer}
            />
            <StatusIcon 
              label="المصادقة" 
              status={statuses?.authentication} 
              icon={Shield}
              onClick={onAuthenticationToggle}
              isClickable={isAdmin}
            />
          </Box>
        </Paper>
      </MuiCardContent>
    </MuiCard>
  );
};

export default PatientDetailsLabEntry;


