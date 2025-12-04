// src/pages/communication/whatsapp-cloud/TemplateMessageForm.tsx
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
import { Send } from "@mui/icons-material";
import type { WhatsAppCloudTemplatePayload } from "@/services/whatsappCloudApiService";

interface TemplateMessageFormData {
  to: string;
  template_name: string;
  language_code: string;
  access_token?: string;
  phone_number_id?: string;
}

interface TemplateMessageFormProps {
  onSubmit: (data: WhatsAppCloudTemplatePayload) => void;
  isLoading: boolean;
}

const TemplateMessageForm: React.FC<TemplateMessageFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<TemplateMessageFormData>({
    defaultValues: {
      to: "",
      template_name: "hello_world",
      language_code: "en_US",
      access_token: "",
      phone_number_id: "",
    },
  });

  const onFormSubmit = (data: TemplateMessageFormData) => {
    const payload: WhatsAppCloudTemplatePayload = {
      to: data.to,
      template_name: data.template_name,
      language_code: data.language_code,
      ...(data.access_token && { access_token: data.access_token }),
      ...(data.phone_number_id && { phone_number_id: data.phone_number_id }),
    };
    onSubmit(payload);
    reset({
      to: data.to,
      template_name: "hello_world",
      language_code: "en_US",
      access_token: "",
      phone_number_id: "",
    });
  };

  return (
    <Card>
      <CardHeader
        title="Send Template Message"
        subheader="Send a pre-approved template message (like hello_world)"
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
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Template Name"
                placeholder="hello_world"
                {...register("template_name")}
                helperText="Name of your approved template"
                fullWidth
              />
              <TextField
                label="Language Code"
                placeholder="en_US"
                {...register("language_code")}
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
              startIcon={isLoading ? <CircularProgress size={16} /> : <Send fontSize="small" />}
            >
              {isLoading ? "Sending..." : "Send Template Message"}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default TemplateMessageForm;

