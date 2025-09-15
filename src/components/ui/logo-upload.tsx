import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, Image as ImageIcon, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import settingService from '@/services/settingService';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  onLogoUpdate: (logoUrl: string | null) => void;
  disabled?: boolean;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  currentLogoUrl,
  onLogoUpdate,
  disabled = false,
}) => {
  const { t } = useTranslation(['settings', 'common']);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('settings:invalidFileType', { defaultValue: 'Please select a valid image file.' }));
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('settings:fileTooLarge', { defaultValue: 'File size must be less than 2MB.' }));
        return;
      }

      // Create preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await settingService.uploadLogo(file);
      onLogoUpdate(result.logo_url);
      toast.success(t('settings:logoUploadedSuccess', { defaultValue: 'Logo uploaded successfully!' }));
      
      // Clear preview and file input
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('settings:logoUploadFailed', { defaultValue: 'Failed to upload logo.' }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await settingService.deleteLogo();
      onLogoUpdate(null);
      toast.success(t('settings:logoDeletedSuccess', { defaultValue: 'Logo deleted successfully!' }));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('settings:logoDeleteFailed', { defaultValue: 'Failed to delete logo.' }));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayLogoUrl = previewUrl || currentLogoUrl;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="logo-upload">{t('settings:companyLogo', { defaultValue: 'Company Logo' })}</Label>
        <div className="mt-2 flex items-center gap-4">
          <div className="flex-1">
            <Input
              id="logo-upload"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={disabled || isUploading || isDeleting}
              className="cursor-pointer"
            />
          </div>
          {previewUrl && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleUpload}
                disabled={disabled || isUploading}
              >
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" />
                {t('common:upload')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={disabled || isUploading}
              >
                <X className="mr-2 h-4 w-4" />
                {t('common:cancel')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Logo Preview */}
      {displayLogoUrl && (
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 rounded-lg border">
            <AvatarImage
              src={displayLogoUrl}
              alt="Company Logo"
              className="object-cover"
            />
            <AvatarFallback className="rounded-lg bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {previewUrl ? t('settings:previewNewLogo', { defaultValue: 'Preview of new logo' }) : t('settings:currentLogo', { defaultValue: 'Current logo' })}
            </p>
            {currentLogoUrl && !previewUrl && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={disabled || isDeleting}
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common:delete')}
              </Button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t('settings:logoUploadHint', { 
          defaultValue: 'Upload a logo image (JPG, PNG, GIF, SVG). Maximum size: 2MB. This logo will appear on your POS receipts and invoices.' 
        })}
      </p>
    </div>
  );
}; 