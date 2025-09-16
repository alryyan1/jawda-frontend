import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Box,
  Container,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
  Chip,
  Divider,
} from "@mui/material";

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");

  const roles = user?.roles ?? [];
  // Aggregate direct permissions + permissions inherited from roles
  const directPermissions = user?.permissions ?? [];
  const rolePermissions = roles.flatMap((r) => r.permissions ?? []);
  const aggregatedPermissions = Array.from(
    new Map([...directPermissions, ...rolePermissions].map((p) => [p.id ?? p.name, p]))
  ).map(([, p]) => p);

  return (
    <Container maxWidth="lg" dir="rtl" sx={{ py: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>الملف الشخصي</Typography>
      <Paper elevation={0} sx={{ display: 'flex', gap: 2, p: 1 }}>
        {/* Left navigation */}
        <Paper elevation={1} sx={{ width: 240, flexShrink: 0 }}>
          <List component="nav">
            <ListItemButton selected={activeTab === 'roles'} onClick={() => setActiveTab('roles')}>
              <ListItemText primary="الأدوار" />
            </ListItemButton>
            <ListItemButton selected={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')}>
              <ListItemText primary="الصلاحيات" />
            </ListItemButton>
          </List>
        </Paper>

        {/* Right content */}
        <Paper elevation={1} sx={{ flex: 1, p: 2, minHeight: 300 }}>
          {activeTab === 'roles' ? (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>الأدوار</Typography>
              <Divider sx={{ mb: 2 }} />
              {roles.length === 0 ? (
                <Typography color="text.secondary">لا توجد أدوار مخصصة.</Typography>
              ) : (
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {roles.map((r) => (
                    <Chip key={r.id} label={r.name} variant="outlined" />
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>الصلاحيات</Typography>
              <Divider sx={{ mb: 2 }} />
              {aggregatedPermissions.length === 0 ? (
                <Typography color="text.secondary">لا توجد صلاحيات مخصصة.</Typography>
              ) : (
                <Box display="flex" flexDirection="column" gap={1}>
                  {aggregatedPermissions
                    .slice()
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map((p) => (
                    <Chip key={p.id} label={p.name} variant="outlined" sx={{ width: 'fit-content' }} />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Paper>
    </Container>
  );
};

export default ProfilePage;


