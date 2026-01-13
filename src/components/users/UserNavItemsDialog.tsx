// src/components/users/UserNavItemsDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  Chip,
  Paper,
  List,
  ListItem,
  Divider,
  CircularProgress,
} from '@mui/material';
import { toast } from 'sonner';
import { updateUser } from '@/services/userService';
import type { User } from '@/types/users';
import { allMainNavItems, DEFAULT_NAV_ITEMS_BY_TYPE } from '@/components/AppLayout';
import type { NavItem } from '@/components/AppLayout';
import { Loader2 } from 'lucide-react';

interface UserNavItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess?: () => void;
}

const UserNavItemsDialog: React.FC<UserNavItemsDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}) => {
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize selected routes from user's nav_items or user_type defaults
  useEffect(() => {
    if (user) {
      if (user.nav_items && user.nav_items.length > 0) {
        // Use user's custom nav_items
        setSelectedRoutes([...user.nav_items]);
      } else if (user.user_type && DEFAULT_NAV_ITEMS_BY_TYPE[user.user_type]) {
        // Use defaults for user_type
        setSelectedRoutes([...DEFAULT_NAV_ITEMS_BY_TYPE[user.user_type]]);
      } else {
        // Empty for admin users
        setSelectedRoutes([]);
      }
    }
  }, [user, open]);

  const handleToggleRoute = (route: string) => {
    setSelectedRoutes((prev) => {
      if (prev.includes(route)) {
        return prev.filter((r) => r !== route);
      } else {
        return [...prev, route];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedRoutes(allMainNavItems.map((item: NavItem) => item.to));
  };

  const handleDeselectAll = () => {
    setSelectedRoutes([]);
  };

  const handleResetToDefaults = () => {
    if (user?.user_type && DEFAULT_NAV_ITEMS_BY_TYPE[user.user_type]) {
      setSelectedRoutes([...DEFAULT_NAV_ITEMS_BY_TYPE[user.user_type]]);
    } else {
      setSelectedRoutes([]);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateUser(user.id, {
        nav_items: selectedRoutes.length > 0 ? selectedRoutes : null,
      });
      toast.success('تم تحديث عناصر القائمة بنجاح');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating nav items:', error);
      toast.error('فشل في تحديث عناصر القائمة');
    } finally {
      setIsSaving(false);
    }
  };

  const defaultRoutes = user?.user_type ? DEFAULT_NAV_ITEMS_BY_TYPE[user.user_type] || [] : [];

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      dir="rtl"
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          إدارة عناصر القائمة
        </Typography>
        {user && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              إدارة عناصر القائمة للمستخدم: <strong>{user.name}</strong>
            </Typography>
            {user.user_type && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                نوع المستخدم: {user.user_type}
              </Typography>
            )}
          </Box>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleSelectAll}
          >
            تحديد الكل
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleDeselectAll}
          >
            إلغاء تحديد الكل
          </Button>
          {user?.user_type && defaultRoutes.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleResetToDefaults}
            >
              إعادة تعيين للافتراضي
            </Button>
          )}
        </Box>

        {/* Default routes reference (if user has user_type) */}
        {user?.user_type && defaultRoutes.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
              العناصر الافتراضية لنوع المستخدم ({user.user_type}):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {defaultRoutes.map((route: string) => {
                const navItem = allMainNavItems.find((item: NavItem) => item.to === route);
                return navItem ? (
                  <Chip
                    key={route}
                    label={navItem.label}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ) : null;
              })}
            </Box>
          </Paper>
        )}

        {/* Nav items list */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            minHeight: 0,
          }}
        >
          <List dense>
            {allMainNavItems.map((item: NavItem, index: number) => {
              const isSelected = selectedRoutes.includes(item.to);
              const isDefault = defaultRoutes.includes(item.to);
              const Icon = item.icon;

              return (
                <React.Fragment key={item.to}>
                  <ListItem
                    sx={{
                      px: 1,
                      py: 0.5,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      borderRadius: 1,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleRoute(item.to)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Icon style={{ width: 16, height: 16 }} />
                          <Typography variant="body2">{item.label}</Typography>
                          {isDefault && user?.user_type && (
                            <Typography variant="caption" color="text.secondary">
                              (افتراضي)
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ flex: 1, m: 0 }}
                    />
                  </ListItem>
                  {index < allMainNavItems.length - 1 && <Divider component="li" />}
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
          variant="outlined"
        >
          إلغاء
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="contained"
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserNavItemsDialog;
