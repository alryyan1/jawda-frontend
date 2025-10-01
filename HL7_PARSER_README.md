# HL7 Message Parser

A new page has been added to the Jawda Medical system for parsing and analyzing HL7 messages.

## Features

- **Real-time Parsing**: Paste HL7 messages and see them parsed instantly
- **Detailed Field Breakdown**: Each segment and field is displayed with clear labels
- **Message Metadata**: Shows message type, control ID, sending/receiving applications, and timestamp
- **Sample Messages**: Load sample HL7 messages for testing
- **Export Options**: Copy or download parsed messages
- **Responsive Design**: Works on desktop and mobile devices

## How to Access

1. Navigate to the main application
2. Look for "محلل HL7" (HL7 Parser) in the sidebar navigation
3. Click to open the HL7 parser page

## How to Use

1. **Input HL7 Message**: Paste your HL7 message in the text area on the right
2. **Parse**: Click the "Parse Message" button
3. **View Results**: The parsed message will appear on the left with:
   - Message information (type, control ID, etc.)
   - Segments breakdown with field-by-field analysis
4. **Sample Data**: Click "Load Sample" to test with a sample HL7 message
5. **Export**: Use Copy or Download buttons to save your work

## Supported HL7 Segments

The parser recognizes and provides descriptions for common HL7 segments:

- **MSH**: Message Header
- **EVN**: Event Type
- **PID**: Patient Identification
- **PV1**: Patient Visit
- **OBR**: Observation Request
- **OBX**: Observation/Result
- **NTE**: Notes and Comments
- **SPM**: Specimen
- **ORC**: Common Order
- **DG1**: Diagnosis
- **AL1**: Patient Allergy Information
- **PR1**: Procedures
- **IN1**: Insurance
- **GT1**: Guarantor
- **NK1**: Next of Kin
- **PV2**: Patient Visit - Additional Info
- **ZDS**: Custom Segment

## Technical Details

- Built with React and TypeScript
- Uses Tailwind CSS for styling
- Responsive grid layout (2 columns on desktop, stacked on mobile)
- Real-time parsing with error handling
- Supports HL7 v2.5.1 format
- Handles component separators (^) and repetition separators (~)

## Route

The page is accessible at: `/hl7-parser`

## Permissions

Requires the `access hl7_parser` permission to view the page.
