import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Stack,
  Pagination,
  InputAdornment,
} from '@mui/material';
import {
  Storage,
  Search,
  FilterList,
  Visibility,
  Delete,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { hl7Service, type HL7Message } from '@/services/hl7Service';
import { toast } from 'sonner';

interface HL7MessagesTableProps {
  onSelectMessage: (message: string) => void;
  trigger?: React.ReactNode;
}

const HL7MessagesTable: React.FC<HL7MessagesTableProps> = ({ 
  onSelectMessage, 
  trigger 
}) => {
  const [messages, setMessages] = useState<HL7Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  const loadMessages = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await hl7Service.getMessages(page, perPage);
      setMessages(response.data);
      setTotalPages(response.last_page);
      setTotalItems(response.total);
      setCurrentPage(response.current_page);
    } catch (err) {
      setError('Failed to load HL7 messages');
      console.error('Error loading HL7 messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, perPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadMessages(page);
    }
  };

  const handlePerPageChange = (newPerPage: string) => {
    setPerPage(parseInt(newPerPage));
    setCurrentPage(1);
  };

  const handleSelectMessage = (message: HL7Message) => {
    onSelectMessage(message.raw_message);
    setIsOpen(false);
    toast.success('Message loaded successfully');
  };

  const handleDeleteMessage = async (id: number) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await hl7Service.deleteMessage(id);
      toast.success('Message deleted successfully');
      loadMessages(currentPage);
    } catch (err) {
      toast.error('Failed to delete message');
      console.error('Error deleting message:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const getDeviceBadgeColor = (device?: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (!device) return 'default';
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes('maglumi')) return 'primary';
    if (deviceLower.includes('mindray')) return 'error';
    if (deviceLower.includes('bc')) return 'info';
    return 'default';
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = !searchTerm || 
      message.raw_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.patient_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.device?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDevice = deviceFilter === 'all' || message.device === deviceFilter;
    
    return matchesSearch && matchesDevice;
  });

  const uniqueDevices = Array.from(new Set(messages.map(m => m.device).filter(Boolean)));

  return (
    <>
      {trigger || (
        <Button
          variant="outlined"
          size="small"
          onClick={() => setIsOpen(true)}
          startIcon={<Storage />}
        >
          Load from Database
        </Button>
      )}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="xl"
        fullWidth
      >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Storage />
          <Typography variant="h6">HL7 Messages Database</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>

        <Stack spacing={3}>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search messages, patient ID, or device..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Device</InputLabel>
              <Select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                label="Device"
              >
                <MenuItem value="all">All Devices</MenuItem>
                {uniqueDevices.map(device => (
                  <MenuItem key={device} value={device || ''}>
                    {device}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Per Page</InputLabel>
              <Select
                value={perPage.toString()}
                onChange={(e) => handlePerPageChange(e.target.value)}
                label="Per Page"
              >
                <MenuItem value="10">10</MenuItem>
                <MenuItem value="25">25</MenuItem>
                <MenuItem value="50">50</MenuItem>
                <MenuItem value="100">100</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* Messages Table */}
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Typography color="text.secondary">Loading messages...</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Device</TableCell>
                      <TableCell>Message Type</TableCell>
                      <TableCell>Patient ID</TableCell>
                      <TableCell>Message Preview</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMessages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No messages found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMessages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {message.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {message.device ? (
                              <Chip
                                label={message.device}
                                size="small"
                                color={getDeviceBadgeColor(message.device)}
                                variant="outlined"
                              />
                            ) : (
                              <Typography color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {message.message_type ? (
                              <Chip
                                label={message.message_type}
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              <Typography color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {message.patient_id || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {truncateMessage(message.raw_message)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(message.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleSelectMessage(message)}
                                startIcon={<Visibility />}
                              >
                                Parse
                              </Button>
                              <Tooltip title="Delete message">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteMessage(message.id)}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalItems)} of {totalItems} messages
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="small"
                >
                  <ChevronLeft />
                </IconButton>
                <Typography variant="body2">
                  Page {currentPage} of {totalPages}
                </Typography>
                <IconButton
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  size="small"
                >
                  <ChevronRight />
                </IconButton>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default HL7MessagesTable;
