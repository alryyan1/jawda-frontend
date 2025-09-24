import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert
} from '@mui/material';

interface JsonParamsDialogProps {
  open: boolean;
  initialJson: unknown;
  onClose: () => void;
  onSave: (value: unknown) => void;
}

const JsonParamsDialog: React.FC<JsonParamsDialogProps> = ({ open, initialJson, onClose, onSave }) => {
  const [text, setText] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      try {
        setText(initialJson ? JSON.stringify(initialJson, null, 2) : '{\n\n}');
        setErrorText(null);
      } catch {
        setText('');
        setErrorText('تعذر تحميل البيانات الحالية');
      }
    }
  }, [open, initialJson]);

  const saveDebounced = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = () => {
    try {
      const value = text.trim() ? JSON.parse(text) : null;
      onSave(value);
    } catch {
      setErrorText('صيغة JSON غير صحيحة');
    }
  };

  const handleChangeText = (value: string) => {
    setText(value);
    if (saveDebounced.current) clearTimeout(saveDebounced.current);
    saveDebounced.current = setTimeout(() => {
      handleSave();
    }, 600);
  };

  const handleMuiClose = (_event: object, reason: string) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') return; // prevent accidental close on paste/esc
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleMuiClose} fullWidth maxWidth="xl" PaperProps={{ sx: { width: '90vw' } }} disableEscapeKeyDown>
      <DialogTitle>تحرير باراميترات JSON</DialogTitle>
      <DialogContent dividers sx={{ direction: 'ltr' }}>
        {errorText && (
          <Alert severity="error" sx={{ mb: 2 }}>{errorText}</Alert>
        )}
        <TextField
          value={text}
          onChange={(e) => handleChangeText(e.target.value)}
          multiline
          minRows={16}
          fullWidth
          error={!!errorText}
          helperText={errorText || 'يمكنك إدخال كائنات، مصفوفات، وقيم بسيطة'}
          inputProps={{ style: { direction: 'ltr' } }}
          InputProps={{ sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">إلغاء</Button>
        <Button onClick={handleSave} variant="contained">حفظ</Button>
      </DialogActions>
    </Dialog>
  );
};

export default JsonParamsDialog;


