// src/pages/communication/whatsapp-cloud/DocumentMessageForm.tsx
import React from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  CircularProgress,
} from "@mui/material";
import { Description } from "@mui/icons-material";
import type { WhatsAppCloudDocumentPayload } from "@/services/whatsappCloudApiService";

interface DocumentMessageFormData {
  to: string;
  document_url: string;
  filename?: string;
  caption?: string;
  access_token?: string;
  phone_number_id?: string;
}

interface DocumentMessageFormProps {
  onSubmit: (data: WhatsAppCloudDocumentPayload) => void;
  isLoading: boolean;
}

const DocumentMessageForm: React.FC<DocumentMessageFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<DocumentMessageFormData>({
    defaultValues: {
      to: "",
      document_url: "",
      filename: "",
      caption: "",
      access_token: "",
      phone_number_id: "",
    },
  });

  const onFormSubmit = (data: DocumentMessageFormData) => {
    const payload: WhatsAppCloudDocumentPayload = {
      to: data.to,
      document_url: data.document_url,
      ...(data.filename && { filename: data.filename }),
      ...(data.caption && { caption: data.caption }),
      ...(data.access_token && { access_token: data.access_token }),
      ...(data.phone_number_id && { phone_number_id: data.phone_number_id }),
    };
    onSubmit(payload);
    reset({
      to: data.to,
      document_url: "",
      filename: "",
      caption: "",
      access_token: "",
      phone_number_id: "",
    });
  };

  return (
    <Card>
      <CardHeader
        title="Send Document"
        subheader="Send a document via URL (PDF, DOC, etc.)"
      />
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Phone Number"
              placeholder="249991961111 (without +)"
              {...register("to")}
              fullWidth
            />
            <TextField
              label="Document URL"
              type="url"
              placeholder="https://example.com/document.pdf"
              {...register("document_url")}
              fullWidth
            />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Filename (Optional)"
                placeholder="document.pdf"
                {...register("filename")}
                fullWidth
              />
              <TextField
                label="Caption (Optional)"
                placeholder="Document caption"
                {...register("caption")}
                fullWidth
              />
            </Box>
            <Divider />
            <Typography variant="subtitle2" fontWeight="medium">
              Optional Overrides
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Access Token (Optional)"
                type="password"
                placeholder="Override default access token"
                {...register("access_token")}
                fullWidth
              />
              <TextField
                label="Phone Number ID (Optional)"
                placeholder="Override default phone number ID"
                {...register("phone_number_id")}
                fullWidth
              />
            </Box>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              fullWidth
              startIcon={isLoading ? <CircularProgress size={16} /> : <Description fontSize="small" />}
            >
              {isLoading ? "Sending..." : "Send Document"}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default DocumentMessageForm;

