import React from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { formatNumber } from '@/lib/utils';
import apiClient from '@/services/api';

interface UserMoneySummaryProps {
  shiftId: number;
  totalDenominations: number;
  userId: number;
}

interface IncomeSummaryData {
  user_id: number;
  user_name: string;
  shift_id: number;
  service_income: {
    total: number;
    bank: number;
    cash: number;
  };
  total: number;
  total_cash: number;
  total_bank: number;
  total_cash_expenses: number;
  total_bank_expenses: number;
  total_cost: number;
  net_cash: number;
  net_bank: number;
  expenses: {
    total_cash_expenses: number;
    total_bank_expenses: number;
  };
  lab_income: {
    total: number;
    bank: number;
    cash: number;
  };
}

const UserMoneySummary: React.FC<UserMoneySummaryProps> = ({
  shiftId,
  totalDenominations,
  userId
}) => {
  // Fetch income summary data from API
  const { data: responseData, isLoading, error } = useQuery<{ data: IncomeSummaryData }, Error>({
    queryKey: ['userIncomeSummary', shiftId],
    queryFn: async () => {
      const response = await apiClient.get(`/user/current-shift-income-summary?shift_id=${shiftId}&user_id=${userId}`);
      return response.data;
    },
    enabled: !!shiftId,
  });

  const incomeData = responseData?.data;

  // Show loading state
  if (isLoading) {
    return (
      <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ mt: 1 }}>جاري تحميل البيانات...</Typography>
      </Paper>
    );
  }

  // Show error state
  if (error || !incomeData) {
    return (
      <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="error">
          فشل في تحميل البيانات المالية
        </Typography>
      </Paper>
    );
  }

  // Calculate balances using the API response structure
  const cashBalance = incomeData.net_cash;
  const bankBalance = incomeData.net_bank;
  
  // Calculate difference (only for cash)
  const cashDifference = cashBalance - totalDenominations;
  console.log(incomeData,'incomeData');
  const rows = [
    {
      label: 'المتحصل',
      cash: incomeData.total_cash,
      bank: incomeData.total_bank
    },
    {
      label: 'المصروف',
      cash: incomeData.total_cash_expenses,
      bank: incomeData.total_bank_expenses
    },
    {
      label: 'الصافي',
      cash: cashBalance,
      bank: bankBalance
    },
    {
      label: 'الفئات',
      cash: totalDenominations,
      bank: null
    },
    {
      label: 'الفرق',
      cash: cashDifference,
      bank: null
    }
  ];

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
    
      
      {/* Table Header */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 1 }}>
        <Box></Box>
        <Typography variant="subtitle1" fontWeight={600} textAlign="center" color="primary">
          النقدي
        </Typography>
        <Typography variant="subtitle1" fontWeight={600} textAlign="center" color="primary">
          البنك
        </Typography>
      </Box>

      {/* Table Rows */}
      {rows.map((row, index) => (
        <Box 
          key={row.label}
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: 1, 
            py: 1,
            borderBottom: index < rows.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider'
          }}
        >
          {/* Label Column */}
          <Typography 
            variant="body1" 
            fontWeight={index === 2 ? 600 : 400} // Make "الصافي" bold
            sx={{ textAlign: 'right' }}
          >
            {row.label}
          </Typography>
          
          {/* Cash Column */}
          <Typography 
            variant="body1" 
            fontWeight={index === 2 ? 600 : 400} // Make balance bold
            textAlign="center"
            color={index === 4 && cashDifference !== 0 ? 'error.main' : 'text.primary'} // Highlight difference if not zero
          >
            {row.cash !== null ? formatNumber(row.cash, 0) : ''}
          </Typography>
          
          {/* Bank Column */}
          <Typography 
            variant="body1" 
            fontWeight={index === 2 ? 600 : 400} // Make balance bold
            textAlign="center"
          >
            {row.bank !== null ? formatNumber(row.bank, 0) : ''}
          </Typography>
        </Box>
      ))}

      {/* Highlight line under the difference if it's zero */}
      {cashDifference === 0 && (
        <Box 
          sx={{ 
            height: '2px', 
            bgcolor: 'brown', 
            width: '60%', 
            mx: 'auto', 
            mt: 1,
            borderRadius: 1
          }} 
        />
      )}
    </Paper>
  );
};

export default UserMoneySummary;
