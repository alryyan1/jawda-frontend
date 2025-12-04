// src/pages/communication/whatsapp-cloud/TextMessageForm.tsx
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
import type { WhatsAppCloudTextPayload } from "@/services/whatsappCloudApiService";

interface TextMessageFormData {
  to: string;
  text: string;
  access_token?: string;
  phone_number_id?: string;
}

interface TextMessageFormProps {
  onSubmit: (data: WhatsAppCloudTextPayload) => void;
  isLoading: boolean;
}

const TextMessageForm: React.FC<TextMessageFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<TextMessageFormData>({
    defaultValues: {
      to: "",
      text: "",
      access_token: "",
      phone_number_id: "",
    },
  });

  const onFormSubmit = (data: TextMessageFormData) => {
    const payload: WhatsAppCloudTextPayload = {
      to: data.to,
      text: data.text,
      ...(data.access_token && { access_token: data.access_token }),
      ...(data.phone_number_id && { phone_number_id: data.phone_number_id }),
    };
    onSubmit(payload);
    reset({ to: data.to, text: "", access_token: "", phone_number_id: "" });
  };

  return (
    <Card>
      <CardHeader
        title="Send Text Message"
        subheader="Send a plain text message via WhatsApp Cloud API"
      />
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Phone Number"
              placeholder="249991961111 (without +)"
              {...register("to")}
              helperText="Enter phone number in international format without + (e.g., 249991961111)"
              fullWidth
            />
            <TextField
              label="Message Text"
              placeholder="Enter your message..."
              {...register("text")}
              multiline
              rows={5}
              fullWidth
            />
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
              {isLoading ? "Sending..." : "Send Text Message"}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default TextMessageForm;

