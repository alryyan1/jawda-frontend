// src/pages/communication/WhatsAppCloudApiPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Box, Typography, Button, Tabs, Tab, Container } from "@mui/material";
import { Message, Refresh } from "@mui/icons-material";
import {
  sendWhatsAppCloudText,
  sendWhatsAppCloudTemplate,
  sendWhatsAppCloudDocument,
  sendWhatsAppCloudImage,
  getWhatsAppCloudPhoneNumbers,
  isWhatsAppCloudConfigured,
  type WhatsAppCloudResponse,
  type WhatsAppCloudPhoneNumbersResponse,
  type WhatsAppCloudConfigResponse,
  type WhatsAppCloudTextPayload,
  type WhatsAppCloudTemplatePayload,
  type WhatsAppCloudDocumentPayload,
  type WhatsAppCloudImagePayload,
} from "@/services/whatsappCloudApiService";
import ConfigurationStatusCard from "./whatsapp-cloud/ConfigurationStatusCard";
import TextMessageForm from "./whatsapp-cloud/TextMessageForm";
import TemplateMessageForm from "./whatsapp-cloud/TemplateMessageForm";
import DocumentMessageForm from "./whatsapp-cloud/DocumentMessageForm";
import ImageMessageForm from "./whatsapp-cloud/ImageMessageForm";
import PhoneNumbersTable from "./whatsapp-cloud/PhoneNumbersTable";
import MessageHistoryCard, {
  type MessageHistoryItem,
} from "./whatsapp-cloud/MessageHistoryCard";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`whatsapp-tabpanel-${index}`}
      aria-labelledby={`whatsapp-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const WhatsAppCloudApiPage: React.FC = () => {
  const [messageHistory, setMessageHistory] = useState<MessageHistoryItem[]>(
    []
  );
  const [activeTab, setActiveTab] = useState(0);

  // Check configuration
  const { data: config, refetch: refetchConfig } = useQuery<
    WhatsAppCloudConfigResponse,
    Error
  >({
    queryKey: ["whatsappCloudConfig"],
    queryFn: isWhatsAppCloudConfigured,
    retry: 1,
  });

  // Get phone numbers
  const {
    data: phoneNumbers,
    isLoading: isLoadingPhoneNumbers,
    refetch: refetchPhoneNumbers,
  } = useQuery<WhatsAppCloudPhoneNumbersResponse, Error>({
    queryKey: ["whatsappCloudPhoneNumbers"],
    queryFn: () => getWhatsAppCloudPhoneNumbers(),
    enabled: false,
    retry: 1,
  });

  const addToHistory = (item: Omit<MessageHistoryItem, "id" | "timestamp">) => {
    const newItem: MessageHistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessageHistory((prev) => [newItem, ...prev].slice(0, 50));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Mutations
  const sendTextMutation = useMutation({
    mutationFn: sendWhatsAppCloudText,
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Text message sent successfully!");
        addToHistory({
          type: "text",
          to: variables.to,
          content: variables.text,
          success: true,
          message_id: data.message_id,
        });
      } else {
        toast.error(data.error || "Failed to send message");
        addToHistory({
          type: "text",
          to: variables.to,
          content: variables.text,
          success: false,
          error: data.error,
        });
      }
    },
    onError: (error: any, variables) => {
      toast.error(
        error.response?.data?.error || error.message || "Failed to send message"
      );
      addToHistory({
        type: "text",
        to: variables.to,
        content: variables.text,
        success: false,
        error: error.response?.data?.error || error.message,
      });
    },
  });

  const sendTemplateMutation = useMutation({
    mutationFn: sendWhatsAppCloudTemplate,
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Template message sent successfully!");
        addToHistory({
          type: "template",
          to: variables.to,
          content: `${variables.template_name} (${variables.language_code})`,
          success: true,
          message_id: data.message_id,
        });
      } else {
        toast.error(data.error || "Failed to send template");
        addToHistory({
          type: "template",
          to: variables.to,
          content: `${variables.template_name} (${variables.language_code})`,
          success: false,
          error: data.error,
        });
      }
    },
    onError: (error: any, variables) => {
      toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to send template"
      );
      addToHistory({
        type: "template",
        to: variables.to,
        content: `${variables.template_name} (${variables.language_code})`,
        success: false,
        error: error.response?.data?.error || error.message,
      });
    },
  });

  const sendDocumentMutation = useMutation({
    mutationFn: sendWhatsAppCloudDocument,
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Document sent successfully!");
        addToHistory({
          type: "document",
          to: variables.to,
          content: variables.document_url,
          success: true,
          message_id: data.message_id,
        });
      } else {
        toast.error(data.error || "Failed to send document");
        addToHistory({
          type: "document",
          to: variables.to,
          content: variables.document_url,
          success: false,
          error: data.error,
        });
      }
    },
    onError: (error: any, variables) => {
      toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to send document"
      );
      addToHistory({
        type: "document",
        to: variables.to,
        content: variables.document_url,
        success: false,
        error: error.response?.data?.error || error.message,
      });
    },
  });

  const sendImageMutation = useMutation({
    mutationFn: sendWhatsAppCloudImage,
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Image sent successfully!");
        addToHistory({
          type: "image",
          to: variables.to,
          content: variables.image_url,
          success: true,
          message_id: data.message_id,
        });
      } else {
        toast.error(data.error || "Failed to send image");
        addToHistory({
          type: "image",
          to: variables.to,
          content: variables.image_url,
          success: false,
          error: data.error,
        });
      }
    },
    onError: (error: any, variables) => {
      toast.error(
        error.response?.data?.error || error.message || "Failed to send image"
      );
      addToHistory({
        type: "image",
        to: variables.to,
        content: variables.image_url,
        success: false,
        error: error.response?.data?.error || error.message,
      });
    },
  });

  const handleSendText = (payload: WhatsAppCloudTextPayload) => {
    sendTextMutation.mutate(payload);
  };

  const handleSendTemplate = (payload: WhatsAppCloudTemplatePayload) => {
    sendTemplateMutation.mutate(payload);
  };

  const handleSendDocument = (payload: WhatsAppCloudDocumentPayload) => {
    sendDocumentMutation.mutate(payload);
  };

  const handleSendImage = (payload: WhatsAppCloudImagePayload) => {
    sendImageMutation.mutate(payload);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 4) {
      // Phone numbers tab
      refetchPhoneNumbers();
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{ py: 4, height: window.innerHeight - 100, overflow: "auto" }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Message sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                WhatsApp Cloud API
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Test, send, and manage WhatsApp Cloud API messages
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              refetchConfig();
              toast.info("Configuration refreshed");
            }}
            startIcon={<Refresh fontSize="small" />}
          >
            Refresh Config
          </Button>
        </Box>

        {/* Configuration Status */}
        <ConfigurationStatusCard
          config={config}
          onRefresh={refetchConfig}
          onCopy={copyToClipboard}
        />

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Text Message" />
            <Tab label="Template" />
            <Tab label="Document" />
            <Tab label="Image" />
            <Tab label="Phone Numbers" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <TextMessageForm
            onSubmit={handleSendText}
            isLoading={sendTextMutation.isPending}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <TemplateMessageForm
            onSubmit={handleSendTemplate}
            isLoading={sendTemplateMutation.isPending}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <DocumentMessageForm
            onSubmit={handleSendDocument}
            isLoading={sendDocumentMutation.isPending}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <ImageMessageForm
            onSubmit={handleSendImage}
            isLoading={sendImageMutation.isPending}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <PhoneNumbersTable
            phoneNumbers={phoneNumbers}
            isLoading={isLoadingPhoneNumbers}
            onRefresh={refetchPhoneNumbers}
            onCopy={copyToClipboard}
          />
        </TabPanel>

        {/* Message History */}
        <MessageHistoryCard messages={messageHistory} />
      </Box>
    </Container>
  );
};

export default WhatsAppCloudApiPage;
