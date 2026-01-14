// src/pages/communication/whatsapp-cloud/ConfigurationStatusCard.tsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  IconButton,
  Alert,
  AlertTitle,
  CircularProgress,
} from "@mui/material";
import {
  CheckCircle,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  Phone as PhoneIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import type { WhatsAppCloudConfigResponse } from "@/services/whatsappCloudApiService";

interface ConfigurationStatusCardProps {
  config: WhatsAppCloudConfigResponse | undefined;
  onRefresh: () => void;
  onCopy: (text: string) => void;
}

const ConfigurationStatusCard: React.FC<ConfigurationStatusCardProps> = ({
  config,
  onRefresh,
  onCopy,
}) => {
  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <SettingsIcon fontSize="small" />
            <Typography variant="h6">Configuration Status</Typography>
          </Box>
        }
        action={
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        }
      />
      <CardContent>
        {config ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              {config.configured ? (
                <CheckCircle sx={{ color: "green", fontSize: 20 }} />
              ) : (
                <CancelIcon sx={{ color: "red", fontSize: 20 }} />
              )}
              <Typography variant="body1" fontWeight="medium">
                Service: {config.configured ? "Configured" : "Not Configured"}
              </Typography>
            </Box>
            {config.phone_number_id && (
              <Box display="flex" alignItems="center" gap={1}>
                <PhoneIcon fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Phone Number ID: {config.phone_number_id}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onCopy(config.phone_number_id || "")}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            {config.waba_id && (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary">
                  WABA ID: {config.waba_id}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onCopy(config.waba_id || "")}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            {!config.configured && (
              <Alert severity="warning">
                <AlertTitle>Configuration Required</AlertTitle>
                Please configure WhatsApp Cloud API credentials in your server's{" "}
                <code>.env</code> file:
                <code>WHATSAPP_CLOUD_API_TOKEN</code>,{" "}
                <code>WHATSAPP_CLOUD_PHONE_NUMBER_ID</code>,{" "}
                <code>WHATSAPP_CLOUD_WABA_ID</code>
              </Alert>
            )}
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={16} />
            <Typography variant="body2">Loading configuration...</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ConfigurationStatusCard;
