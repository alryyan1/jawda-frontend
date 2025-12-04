// src/pages/communication/whatsapp-cloud/PhoneNumbersTable.tsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Chip,
} from "@mui/material";
import { Refresh, ContentCopy } from "@mui/icons-material";
import type { WhatsAppCloudPhoneNumbersResponse } from "@/services/whatsappCloudApiService";

interface PhoneNumbersTableProps {
  phoneNumbers: WhatsAppCloudPhoneNumbersResponse | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  onCopy: (text: string) => void;
}

const PhoneNumbersTable: React.FC<PhoneNumbersTableProps> = ({
  phoneNumbers,
  isLoading,
  onRefresh,
  onCopy,
}) => {
  return (
    <Card>
      <CardHeader
        title="Phone Numbers"
        subheader="View all phone numbers associated with your WABA"
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={onRefresh}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
          >
            Refresh
          </Button>
        }
      />
      <CardContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : phoneNumbers?.success && phoneNumbers.data?.data ? (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Display Number</TableCell>
                  <TableCell>Verified Name</TableCell>
                  <TableCell>Quality Rating</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {phoneNumbers.data.data.map((phone) => (
                  <TableRow key={phone.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="caption" component="code">
                          {phone.id}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => onCopy(phone.id)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>{phone.display_phone_number || "-"}</TableCell>
                    <TableCell>{phone.verified_name || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={phone.quality_rating || "N/A"}
                        color={
                          phone.quality_rating === "GREEN"
                            ? "success"
                            : phone.quality_rating === "YELLOW"
                            ? "warning"
                            : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              {phoneNumbers?.error || "No phone numbers found. Click Refresh to load."}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PhoneNumbersTable;

