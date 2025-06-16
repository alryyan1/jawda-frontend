// src/components/lab/workstation/FieldStatusIndicator.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export type FieldSaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface FieldStatusIndicatorProps {
  status: FieldSaveStatus;
  size?: 'small' | 'medium';
}

const FieldStatusIndicator: React.FC<FieldStatusIndicatorProps> = React.memo(({ status, size = 'small' }) => {
  const { t } = useTranslation("common");
  const iconSize = size === 'small' ? '0.875rem' : '1rem'; // 14px or 16px

  if (status === 'saving') return <CircularProgress data-testid="saving-indicator" size={iconSize} thickness={5} sx={{ color: 'primary.main' }} />;
  if (status === 'success') return <CheckCircleOutlineIcon data-testid="success-indicator" sx={{ fontSize: iconSize, color: 'success.main' }} />;
  if (status === 'error') return <ErrorOutlineIcon data-testid="error-indicator" sx={{ fontSize: iconSize, color: 'error.main' }} />;
  return (
    <Tooltip title={String(t('autosaveTooltip', "Changes are saved automatically"))} placement="top" arrow>
      <InfoOutlinedIcon data-testid="idle-indicator" sx={{ fontSize: iconSize, color: 'action.disabled', cursor: 'help' }} />
    </Tooltip>
  );
});
FieldStatusIndicator.displayName = 'FieldStatusIndicator';

export default FieldStatusIndicator;