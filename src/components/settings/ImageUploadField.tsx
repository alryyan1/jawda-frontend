import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { UploadCloud, Trash2 } from "lucide-react";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ImageUploadFieldProps {
  field: {
    onChange: (value: File | null) => void;
    value: File | null | undefined;
  };
  currentImageUrl: string | null | undefined;
  label: string;
  onClear: () => void;
  disabled?: boolean;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  field,
  currentImageUrl,
  label,
  onClear,
  disabled,
}) => {
  const { t } = useTranslation("settings");
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    field.onChange(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleClear = () => {
    field.onChange(null);
    setPreview(null);
    onClear();
  };

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <div className="flex flex-col gap-4">
          {preview ? (
            <div className="relative w-48 h-48">
              <img
                src={preview}
                alt={label}
                className="w-full h-full object-contain"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleClear}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center w-48 h-48 border-2 border-dashed rounded-lg">
              <label
                htmlFor={`${label}-upload`}
                className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t("uploadImage")}
                  </p>
                </div>
                <input
                  id={`${label}-upload`}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={disabled}
                />
              </label>
            </div>
          )}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};

export default ImageUploadField; 