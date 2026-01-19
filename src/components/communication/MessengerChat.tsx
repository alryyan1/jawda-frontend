import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Fab,
  Drawer,
  IconButton,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Badge,
} from "@mui/material";
import { MessageCircle, X, Send, Check, CheckCheck, Phone } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import apiClient from "@/services/api";
import { toast } from "sonner";
import echo from "@/services/echoService";

// Types
interface WhatsAppMessage {
  id: number;
  from: string;
  to: string;
  body: string;
  type: string;
  direction: "incoming" | "outgoing";
  status: "sent" | "delivered" | "read" | "failed" | "received";
  created_at: string;
  message_id: string;
}

interface MessengerChatProps {
  initialPhoneNumber?: string | null;
}

const MessengerChat: React.FC<MessengerChatProps> = ({
  initialPhoneNumber,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // const queryClient = useQueryClient(); // Unused

  useEffect(() => {
    if (initialPhoneNumber) {
      // Format phone: remove spaces, +, -, etc.
      let cleaned = initialPhoneNumber.replace(/[^0-9]/g, "");

      // Remove leading zero if present
      if (cleaned.startsWith("0")) {
        cleaned = cleaned.substring(1);
      }

      // Prepend 249 if not present (assuming Sudan numbers for now as requested)
      // Check if it already starts with 249. If not, add it.
      // NOTE: This might need more robust logic for international numbers,
      // but fits the "REMOVE ZERO AND CONCATINATE 249" request.
      if (!cleaned.startsWith("249")) {
        cleaned = "249" + cleaned;
      }

      setPhoneNumber(cleaned);
      if (cleaned && !isOpen) {
        // Maybe auto-open if passed? For now let's just set it.
      }
    }
  }, [initialPhoneNumber]);

  // Fetch Chat History
  const {
    data: messages = [],
    isLoading,
    refetch,
  } = useQuery<WhatsAppMessage[]>({
    queryKey: ["whatsappMessages", phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return [];
      const res = await apiClient.get(`/whatsapp/messages/${phoneNumber}`);
      return res.data;
    },
    // Enable even if closed so we can show badge count
    enabled: !!phoneNumber && phoneNumber.length > 8,
    refetchInterval: 5000,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      // 1. Send to Cloud API (Stateless)
      const res = await apiClient.post("/whatsapp-cloud/send-text", {
        to: phoneNumber,
        text: text,
      });
      return res.data;
    },
    onSuccess: async (data, variables) => {
      // 2. Store to DB via Frontend (Stateful)
      try {
        await apiClient.post("/whatsapp/messages", {
          to: phoneNumber,
          type: "text",
          body: variables, // value of text
          status: "sent",
          direction: "outgoing",
          message_id: data.message_id,
        });
      } catch (err) {
        console.error("Failed to store outgoing message", err);
      }

      setMessageText("");
      refetch();
    },
    onError: (error: any) => {
      toast.error(
        "Failed to send message: " +
          (error.response?.data?.error || error.message),
      );
    },
  });

  const handleSend = () => {
    if (!phoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  // Realtime Listener for Incoming Messages (Frontend driven storage)
  useEffect(() => {
    if (!isOpen || !phoneNumber) return;

    const channel = echo.channel("whatsapp-updates");

    // Validating event name
    // Backend: broadcastAs() return 'message.received';
    // Echo adds '.' prefix for custom events automatically or we add it.

    // Status updates (delivered/read)
    channel.listen(".whatsapp.status.updated", (e: any) => {
      console.log("🔔 Status Update Received:", e);
      refetch();
    });

    // Incoming messages - Just update UI (Storage handled by Global Listener)
    channel.listen(".message.received", (payload: any) => {
      if (payload?.message?.phone_number_id !== "982254518296345") return;
      console.log("📩 Chat UI: Message Received Event:", payload);
      refetch();
    });

    return () => {
      channel.stopListening(".whatsapp.status.updated");
      channel.stopListening(".message.received");
    };
  }, [isOpen, phoneNumber, refetch]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="chat"
        onClick={() => setIsOpen(true)}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 90, // Adjusted to not overlap with other things if needed, or left
          zIndex: 1000,
          backgroundColor: "#25D366", // WhatsApp Green
          "&:hover": {
            backgroundColor: "#128C7E",
          },
        }}
      >
        <Badge badgeContent={messages.length} color="error" max={99}>
          <MessageCircle className="text-white" />
        </Badge>
      </Fab>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{
          sx: {
            width: "100%",
            maxWidth: 400,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            backgroundColor: "#075E54",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Phone size={20} />
            {initialPhoneNumber && initialPhoneNumber === phoneNumber ? (
              <Typography variant="h6">Chat with Patient</Typography>
            ) : (
              <TextField
                variant="standard"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: "white",
                    placeholderColor: "rgba(255,255,255,0.7)",
                  },
                }}
                sx={{ input: { color: "white" } }}
              />
            )}
          </Box>
          <IconButton onClick={() => setIsOpen(false)} sx={{ color: "white" }}>
            <X />
          </IconButton>
        </Box>

        {/* Message List */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 2,
            backgroundColor: "#e5ded8", // WhatsApp background color
            backgroundImage:
              "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", // Subtle pattern
            backgroundBlendMode: "overlay",
          }}
        >
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Typography
              variant="body2"
              color="textSecondary"
              align="center"
              sx={{
                mt: 4,
                backgroundColor: "rgba(255,255,255,0.8)",
                p: 1,
                borderRadius: 1,
              }}
            >
              No messages yet. Start the conversation!
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {messages.map((msg) => {
                const isOutgoing = msg.direction === "outgoing";
                return (
                  <Box
                    key={msg.id}
                    sx={{
                      alignSelf: isOutgoing ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      position: "relative",
                    }}
                  >
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1,
                        px: 2,
                        backgroundColor: isOutgoing ? "#dcf8c6" : "white",
                        borderRadius: 2,
                        borderTopRightRadius: isOutgoing ? 0 : 2,
                        borderTopLeftRadius: isOutgoing ? 2 : 0,
                      }}
                    >
                      <Typography variant="body1">{msg.body}</Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 0.5,
                          mt: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ fontSize: "0.65rem" }}
                        >
                          {formatTime(msg.created_at)}
                        </Typography>
                        {isOutgoing && (
                          <>
                            {msg.status === "sent" && (
                              <Check size={12} color="gray" />
                            )}
                            {msg.status === "delivered" && (
                              <CheckCheck size={12} color="gray" />
                            )}
                            {msg.status === "read" && (
                              <CheckCheck size={12} color="#2196f3" />
                            )}
                            {/* Fallback for old messages or if status unknown */}
                            {!["sent", "delivered", "read", "failed"].includes(
                              msg.status,
                            ) && <Check size={12} color="gray" />}
                          </>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>
          )}
        </Box>

        {/* Input Area */}
        <Box sx={{ p: 2, backgroundColor: "#f0f0f0", display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message..."
            size="small"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            sx={{ backgroundColor: "white" }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={sendMessageMutation.isPending || !messageText.trim()}
            sx={{
              backgroundColor: "#128C7E",
              color: "white",
              "&:hover": { backgroundColor: "#075E54" },
            }}
          >
            {sendMessageMutation.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <Send />
            )}
          </IconButton>
        </Box>
      </Drawer>
    </>
  );
};

export default MessengerChat;
