// src/pages/communication/whatsapp-cloud/MessageHistoryCard.tsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Paper,
} from "@mui/material";
import { CheckCircle, Cancel as CancelIcon } from "@mui/icons-material";

export interface MessageHistoryItem {
  id: string;
  type: "text" | "template" | "document" | "image";
  to: string;
  content: string;
  timestamp: Date;
  success: boolean;
  message_id?: string;
  error?: string;
}

interface MessageHistoryCardProps {
  messages: MessageHistoryItem[];
}

const MessageHistoryCard: React.FC<MessageHistoryCardProps> = ({ messages }) => {
  if (messages.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Message History"
        subheader="Recent messages sent through this interface"
      />
      <CardContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 400, overflowY: "auto" }}>
          {messages.map((item) => (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{ p: 2 }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Chip label={item.type} size="small" variant="outlined" />
                  <Typography variant="body2" fontWeight="medium">
                    {item.to}
                  </Typography>
                  {item.success ? (
                    <CheckCircle sx={{ color: "green", fontSize: 16 }} />
                  ) : (
                    <CancelIcon sx={{ color: "red", fontSize: 16 }} />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                  {item.content}
                </Typography>
                {item.message_id && (
                  <Typography variant="caption" color="text.secondary">
                    ID: {item.message_id}
                  </Typography>
                )}
                {item.error && (
                  <Typography variant="caption" color="error">
                    {item.error}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {item.timestamp.toLocaleString()}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MessageHistoryCard;

