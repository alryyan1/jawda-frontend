# HL7 Testing Troubleshooting Guide

## Issues Fixed

### 1. HL7 Library Error
**Error**: `Call to undefined method Aranyasen\HL7\Message::getFirstSegmentInstance()`

**Fix**: Changed `getFirstSegmentInstance('MSH')` to `getSegmentByIndex(0)` in `HL7MessageProcessor.php`

### 2. Socket Connection Issues
**Problem**: Connection not establishing properly

**Solutions**:
- Set `autoConnect: false` in socket service
- Use proper connection management in React component
- Added connection status monitoring

## Testing Steps

### Step 1: Test HL7 Server Directly
```bash
cd jawda-medical
node test-hl7-connection.js
```

This will test if the HL7 TCP server is working correctly.

### Step 2: Start All Services
```bash
# Terminal 1: Start HL7 TCP Server
cd jawda-medical
php artisan hl7:serve --port=6400

# Terminal 2: Start Realtime Server
cd jawda-medical/realtime-events
npm start

# Terminal 3: Start Frontend
cd jawda-frontend
npm run dev
```

### Step 3: Test Frontend Connection
1. Open browser to `http://localhost:5173`
2. Navigate to HL7 Parser page
3. Check connection status indicator
4. If not connected, click "Connect" button

### Step 4: Test Message Sending
1. Enter an HL7 message in the text area
2. Click "Send to Server"
3. Check the test result dialog for response

## Common Issues & Solutions

### Connection Refused
**Error**: `Connection refused` or `ECONNREFUSED`

**Solutions**:
- Ensure HL7 server is running: `php artisan hl7:serve --port=6400`
- Check if port 6400 is available: `netstat -an | grep 6400`
- Verify firewall settings

### Socket.IO Connection Failed
**Error**: Frontend can't connect to realtime server

**Solutions**:
- Ensure realtime server is running on port 4001
- Check CORS settings in realtime server
- Verify `VITE_REALTIME_SERVER_URL` environment variable

### HL7 Message Processing Error
**Error**: HL7 library errors or parsing failures

**Solutions**:
- Check HL7 message format
- Ensure message starts with `MSH` segment
- Verify field separators and encoding

### Timeout Issues
**Error**: `Timeout waiting for response`

**Solutions**:
- Increase timeout in socket service (currently 10 seconds)
- Check HL7 server response time
- Verify network connectivity

## Debug Information

### Frontend Debug
- Open browser DevTools Console
- Check for socket connection logs
- Monitor network requests to realtime server

### Backend Debug
- Check Laravel logs: `tail -f storage/logs/laravel.log`
- Monitor realtime server console output
- Check HL7 server command output

### Network Debug
```bash
# Check if ports are listening
netstat -tulpn | grep -E ':(4001|6400)'

# Test TCP connection
telnet localhost 6400

# Test HTTP connection
curl http://localhost:4001/health
```

## Environment Variables

Create `.env` file in frontend root:
```env
VITE_REALTIME_SERVER_URL=http://localhost:4001
```

For production, update the URL to match your server:
```env
VITE_REALTIME_SERVER_URL=http://your-server-ip:4001
```

## Sample HL7 Message for Testing

```
MSH|^~\\&|LAB|HOSPITAL|LIS|CLINIC|20240101120000||ORU^R01^ORU_R01|12345|P|2.5.1
PID|1||123456789^^^MRN^MR||DOE^JOHN^MIDDLE||19900101|M|||123 MAIN ST^^CITY^ST^12345||555-1234|||S||123456789
PV1|1|I|ICU^101^01|||DOC123^SMITH^JANE^MD|||||||||1|||||||||||||||||||||||||20240101120000
OBR|1|12345^LAB|LAB123^CBC^L|||20240101120000|||||||||DOC123^SMITH^JANE^MD|||||20240101120000|||F||||||
OBX|1|NM|WBC^White Blood Cell Count^LN||7.5|10*3/uL|4.0-11.0|N|||F|||20240101120000
OBX|2|NM|RBC^Red Blood Cell Count^LN||4.5|10*6/uL|4.0-5.5|N|||F|||20240101120000
OBX|3|NM|HGB^Hemoglobin^LN||14.0|g/dL|12.0-16.0|N|||F|||20240101120000
```

## Performance Tips

1. **Connection Pooling**: The current implementation creates new TCP connections for each message. For production, consider connection pooling.

2. **Message Queuing**: For high-volume scenarios, implement message queuing.

3. **Error Recovery**: Add automatic reconnection logic for production use.

4. **Logging**: Implement comprehensive logging for debugging production issues.

## Security Considerations

1. **Authentication**: Add authentication to the realtime server
2. **Rate Limiting**: Implement rate limiting for message sending
3. **Input Validation**: Validate HL7 messages before processing
4. **Network Security**: Use HTTPS/WSS in production
