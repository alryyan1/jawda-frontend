import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Chip,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Container,
  Stack,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  ContentCopy,
  Download,
  Delete,
  Description,
  Visibility,
  Send,
  Wifi,
  WifiOff,
} from '@mui/icons-material';
import HL7MessagesTable from '@/components/hl7/HL7MessagesTable';
import socketService, { type HL7TestResult } from '@/services/socketService';

interface HL7Segment {
  name: string;
  fields: string[];
  description?: string;
}

interface ParsedHL7Message {
  segments: HL7Segment[];
  messageType: string;
  messageControlId: string;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  timestamp: string;
  error?: string;
}

interface OBXResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
}

const HL7ParserPage: React.FC = () => {
  const [rawMessage, setRawMessage] = useState('');
  const [parsedMessage, setParsedMessage] = useState<ParsedHL7Message | null>(null);
  const [obxResults, setObxResults] = useState<OBXResult[]>([]);
  const [isResultsOpen, setIsResultsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [testResult, setTestResult] = useState<HL7TestResult | null>(null);

  // Socket connection management
  useEffect(() => {
    const connectToSocket = async () => {
      try {
        setIsConnecting(true);
        await socketService.connect();
        setIsConnected(true);
        setSnackbar({
          open: true,
          message: 'Connected to HL7 testing server',
          severity: 'success'
        });
      } catch (error) {
        console.error('Failed to connect to socket:', error);
        setIsConnected(false);
        setSnackbar({
          open: true,
          message: 'Failed to connect to HL7 testing server',
          severity: 'error'
        });
      } finally {
        setIsConnecting(false);
      }
    };

    connectToSocket();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Handle socket connection status changes
  // useEffect(() => {
  //   const checkConnection = () => {
  //     setIsConnected(socketService.isConnected());
  //   };

  //   const interval = setInterval(checkConnection, 1000);
  //   return () => clearInterval(interval);
  // }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await socketService.connect();
      setIsConnected(true);
      setSnackbar({
        open: true,
        message: 'Connected to HL7 testing server',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      setSnackbar({
        open: true,
        message: 'Failed to connect to HL7 testing server',
        severity: 'error'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    socketService.disconnect();
    setIsConnected(false);
    setSnackbar({
      open: true,
      message: 'Disconnected from HL7 testing server',
      severity: 'info'
    });
  };

  const handleSendToServer = async () => {
    if (!rawMessage.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter an HL7 message to send',
        severity: 'error'
      });
      return;
    }

    if (!isConnected) {
      setSnackbar({
        open: true,
        message: 'Not connected to HL7 testing server',
        severity: 'error'
      });
      return;
    }

    try {
      setIsSending(true);
      setTestResult(null);
      // socketService.connect();
      console.log(socketService,'socketService',socketService.isConnected(),'isConnected');
      const result = await socketService.sendHL7Message(rawMessage);
      setTestResult(result);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'HL7 message sent successfully',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Failed to send HL7 message',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error sending HL7 message:', error);
      setSnackbar({
        open: true,
        message: 'Error sending HL7 message',
        severity: 'error'
      });
    } finally {
      setIsSending(false);
    }
  };

  const parseHL7Message = (message: string): ParsedHL7Message | null => {
    try {
      if (!message.trim()) {
        throw new Error('Please enter an HL7 message');
      }

      // Clean the message - remove extra whitespace and normalize line endings
      const cleanMessage = message.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
      
      if (!cleanMessage.includes('MSH')) {
        throw new Error('Invalid HL7 message: Missing MSH segment');
      }

      const lines = cleanMessage.split('\n').filter(line => line.trim());
      const segments: HL7Segment[] = [];
      
      let messageType = '';
      let messageControlId = '';
      let sendingApplication = '';
      let sendingFacility = '';
      let receivingApplication = '';
      let receivingFacility = '';
      let timestamp = '';

      for (const line of lines) {
        const segmentName = line.substring(0, 3);
        const fields = line.split('|');
        
        // Parse MSH segment for message metadata
        if (segmentName === 'MSH') {
          messageType = fields[8] || '';
          messageControlId = fields[9] || '';
          sendingApplication = fields[2] || '';
          sendingFacility = fields[3] || '';
          receivingApplication = fields[4] || '';
          receivingFacility = fields[5] || '';
          timestamp = fields[6] || '';
        }

        const segment: HL7Segment = {
          name: segmentName,
          fields: fields.slice(1), // Remove the segment name from fields
          description: getSegmentDescription(segmentName)
        };

        segments.push(segment);
      }

      return {
        segments,
        messageType,
        messageControlId,
        sendingApplication,
        sendingFacility,
        receivingApplication,
        receivingFacility,
        timestamp
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to parse HL7 message');
    }
  };

  const getSegmentDescription = (segmentName: string): string => {
    const descriptions: { [key: string]: string } = {
      'MSH': 'Message Header',
      'EVN': 'Event Type',
      'PID': 'Patient Identification',
      'PV1': 'Patient Visit',
      'OBR': 'Observation Request',
      'OBX': 'Observation/Result',
      'NTE': 'Notes and Comments',
      'SPM': 'Specimen',
      'ORC': 'Common Order',
      'DG1': 'Diagnosis',
      'AL1': 'Patient Allergy Information',
      'PR1': 'Procedures',
      'IN1': 'Insurance',
      'GT1': 'Guarantor',
      'NK1': 'Next of Kin',
      'PV2': 'Patient Visit - Additional Info',
      'ZDS': 'Custom Segment'
    };
    return descriptions[segmentName] || 'Unknown Segment';
  };

  const handleParse = () => {
    setError(null);
    try {
      const parsed = parseHL7Message(rawMessage);
      setParsedMessage(parsed);
      setObxResults(extractObxResults(parsed?.segments || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse message');
      setParsedMessage(null);
      setObxResults([]);
    }
  };

  const handleClear = () => {
    setRawMessage('');
    setParsedMessage(null);
    setError(null);
    setObxResults([]);
  };

  const handleSelectMessage = (message: string) => {
    setRawMessage(message);
    // Auto-parse the selected message
    setTimeout(() => {
      handleParse();
    }, 100);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(rawMessage);
  };

  const handleDownloadMessage = () => {
    const blob = new Blob([rawMessage], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hl7_message_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadSampleMessage = () => {
    const sampleMessage = `MSH|^~\\&|LAB|HOSPITAL|LIS|CLINIC|20240101120000||ORU^R01^ORU_R01|12345|P|2.5.1
PID|1||123456789^^^MRN^MR||DOE^JOHN^MIDDLE||19900101|M|||123 MAIN ST^^CITY^ST^12345||555-1234|||S||123456789
PV1|1|I|ICU^101^01|||DOC123^SMITH^JANE^MD|||||||||1|||||||||||||||||||||||||20240101120000
OBR|1|12345^LAB|LAB123^CBC^L|||20240101120000|||||||||DOC123^SMITH^JANE^MD|||||20240101120000|||F||||||
OBX|1|NM|WBC^White Blood Cell Count^LN||7.5|10*3/uL|4.0-11.0|N|||F|||20240101120000
OBX|2|NM|RBC^Red Blood Cell Count^LN||4.5|10*6/uL|4.0-5.5|N|||F|||20240101120000
OBX|3|NM|HGB^Hemoglobin^LN||14.0|g/dL|12.0-16.0|N|||F|||20240101120000`;
    setRawMessage(sampleMessage);
  };

  const formatFieldValue = (field: string): string => {
    if (!field) return '';
    
    // Handle component separators (^)
    if (field.includes('^')) {
      return field.split('^').join(' ^ ');
    }
    
    // Handle repetition separators (~)
    if (field.includes('~')) {
      return field.split('~').join(' ~ ');
    }
    
    return field;
  };

  const extractObxResults = (segments: HL7Segment[]): OBXResult[] => {
    const results: OBXResult[] = [];
    for (const segment of segments) {
      if (segment.name !== 'OBX') continue;
      // According to HL7 v2.x OBX fields:
      // 1: Set ID, 2: Value Type, 3: Observation Identifier, 5: Observation Value,
      // 6: Units, 7: References Range
      const observationIdentifier = segment.fields[2] || '';
      const observationValue = segment.fields[4] || '';
      const units = segment.fields[5] || '';
      const referenceRange = segment.fields[6] || '';

      const getTextFromCoded = (coded: string): string => {
        // Prefer the text part if available (identifier^text^codingSystem)
        const parts = coded.split('^');
        if (parts.length >= 2 && parts[1]) return parts[1];
        return parts[0] || coded;
      };

      const getUnitText = (unitField: string): string => {
        const parts = unitField.split('^');
        // Prefer text, fallback to code
        if (parts.length >= 2 && parts[1]) return parts[1];
        return parts[0] || unitField;
      };

      results.push({
        testName: getTextFromCoded(observationIdentifier),
        value: observationValue,
        unit: getUnitText(units),
        referenceRange: referenceRange,
      });
    }
    return results;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              HL7 Message Parser
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Parse and analyze HL7 messages with detailed field breakdown
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <HL7MessagesTable onSelectMessage={handleSelectMessage} />
            <Button
              variant="outlined"
              size="small"
              onClick={loadSampleMessage}
            >
              Load Sample
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={!obxResults.length}
              onClick={() => setIsResultsOpen(true)}
            >
              <Visibility sx={{ mr: 1 }} />
              Show Results ({obxResults.length})
            </Button>
            
            {/* Socket Connection Controls */}
            <Divider orientation="vertical" flexItem />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isConnected ? (
                <Chip
                  icon={<Wifi />}
                  label="Connected"
                  color="success"
                  size="small"
                />
              ) : (
                <Chip
                  icon={<WifiOff />}
                  label="Disconnected"
                  color="error"
                  size="small"
                />
              )}
              {isConnecting ? (
                <CircularProgress size={16} />
              ) : isConnected ? (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleConnect}
                >
                  Connect
                </Button>
              )}
            </Box>
            
            <Divider orientation="vertical" flexItem />
            <Button
              variant="contained"
              color="primary"
              size="small"
              disabled={!rawMessage.trim() || !isConnected || isSending}
              onClick={handleSendToServer}
              startIcon={isSending ? <CircularProgress size={16} /> : <Send />}
            >
              {isSending ? 'Sending...' : 'Send to Server'}
            </Button>
            
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Copy message">
              <IconButton
                onClick={handleCopyMessage}
                disabled={!rawMessage}
                size="small"
              >
                <ContentCopy />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download message">
              <IconButton
                onClick={handleDownloadMessage}
                disabled={!rawMessage}
                size="small"
              >
                <Download />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear all">
              <IconButton
                onClick={handleClear}
                disabled={!rawMessage && !parsedMessage}
                size="small"
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* Input Section */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description />
                  <Typography variant="h6">HL7 Message Input</Typography>
                </Box>
              }
            />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  multiline
                  rows={16}
                  placeholder="Paste your HL7 message here..."
                  value={rawMessage}
                  onChange={(e) => setRawMessage(e.target.value)}
                  variant="outlined"
                  fullWidth
                  sx={{
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleParse}
                  disabled={!rawMessage.trim()}
                  fullWidth
                >
                  Parse Message
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Parsed Output Section */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardHeader title="Parsed Message" />
            <CardContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {parsedMessage && (
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <Stack spacing={3}>
                    {/* Message Metadata */}
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Message Information
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Type:
                          </Typography>
                          <Chip label={parsedMessage.messageType} size="small" />
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Control ID:
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {parsedMessage.messageControlId}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            From:
                          </Typography>
                          <Typography variant="body2">
                            {parsedMessage.sendingApplication}@{parsedMessage.sendingFacility}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            To:
                          </Typography>
                          <Typography variant="body2">
                            {parsedMessage.receivingApplication}@{parsedMessage.receivingFacility}
                          </Typography>
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography variant="body2" color="text.secondary">
                            Timestamp:
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {parsedMessage.timestamp}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Divider />

                    {/* Segments */}
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Segments
                      </Typography>
                      <Stack spacing={2}>
                        {parsedMessage.segments.map((segment, segmentIndex) => (
                          <Paper key={segmentIndex} variant="outlined" sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Chip
                                label={segment.name}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: 'monospace' }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                {segment.description}
                              </Typography>
                            </Box>
                            <Stack spacing={0.5}>
                              {segment.fields.map((field, fieldIndex) => (
                                <Box key={fieldIndex} sx={{ display: 'flex', gap: 1 }}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontFamily: 'monospace', minWidth: '2rem' }}
                                  >
                                    {fieldIndex + 1}:
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                                  >
                                    {formatFieldValue(field)}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              )}

              {!parsedMessage && !error && (
                <Box
                  sx={{
                    height: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Description sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                    <Typography>Parsed message will appear here</Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* OBX Results Dialog */}
      <Dialog
        open={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>OBX Results</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Test</TableCell>
                  <TableCell>Result</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Reference Range</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {obxResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {result.testName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {result.value}
                      </Typography>
                    </TableCell>
                    <TableCell>{result.unit}</TableCell>
                    <TableCell>{result.referenceRange}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog
        open={!!testResult}
        onClose={() => setTestResult(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>HL7 Server Test Result</DialogTitle>
        <DialogContent>
          {testResult && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={testResult.success ? 'Success' : 'Error'}
                  color={testResult.success ? 'success' : 'error'}
                  size="small"
                />
                {testResult.message && (
                  <Typography variant="body2" color="text.secondary">
                    {testResult.message}
                  </Typography>
                )}
              </Box>
              
              {testResult.error && (
                <Alert severity="error">
                  {testResult.error}
                </Alert>
              )}
              
              {testResult.response && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Server Response:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}
                    >
                      {testResult.response}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HL7ParserPage;
