// src/pages/communication/whatsapp-cloud/ImageMessageForm.tsx
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
import { Image as ImageIcon } from "@mui/icons-material";
import type { WhatsAppCloudImagePayload } from "@/services/whatsappCloudApiService";

interface ImageMessageFormData {
  to: string;
  image_url: string;
  caption?: string;
  access_token?: string;
  phone_number_id?: string;
}

interface ImageMessageFormProps {
  onSubmit: (data: WhatsAppCloudImagePayload) => void;
  isLoading: boolean;
}

const ImageMessageForm: React.FC<ImageMessageFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<ImageMessageFormData>({
    defaultValues: {
      to: "",
      image_url: "",
      caption: "",
      access_token: "",
      phone_number_id: "",
    },
  });

  const onFormSubmit = (data: ImageMessageFormData) => {
    const payload: WhatsAppCloudImagePayload = {
      to: data.to,
      image_url: data.image_url,
      ...(data.caption && { caption: data.caption }),
      ...(data.access_token && { access_token: data.access_token }),
      ...(data.phone_number_id && { phone_number_id: data.phone_number_id }),
    };
    onSubmit(payload);
    reset({
      to: data.to,
      image_url: "",
      caption: "",
      access_token: "",
      phone_number_id: "",
    });
  };

  return (
    <Card>
      <CardHeader
        title="Send Image"
        subheader="Send an image via URL"
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
              label="Image URL"
              type="url"
              placeholder="https://example.com/image.jpg"
              {...register("image_url")}
              fullWidth
            />
            <TextField
              label="Caption (Optional)"
              placeholder="Image caption"
              {...register("caption")}
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
              startIcon={isLoading ? <CircularProgress size={16} /> : <ImageIcon fontSize="small" />}
            >
              {isLoading ? "Sending..." : "Send Image"}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default ImageMessageForm;

