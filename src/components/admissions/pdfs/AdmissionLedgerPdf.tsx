import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
// Font is registered dynamically based on settings
import type { Admission, AdmissionLedger } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import { formatNumber } from '@/lib/utils';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

// Static styles that don't depend on settings
const staticStyles = StyleSheet.create({
  section: {
    marginBottom: 15,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  value: {
    width: '70%',
    textAlign: 'right',
  },
  table: {
    marginTop: 10,
  },
  tableCell: {
    flex: 1,
    textAlign: 'right',
  },
  summaryCard: {
    flexDirection: 'row-reverse',
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  summaryLabel: {
    width: '50%',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  summaryValue: {
    width: '50%',
    textAlign: 'right',
  },
});

interface AdmissionLedgerPdfProps {
  admission: Admission;
  ledger: AdmissionLedger;
  settings: PdfSetting | null;
}

export default function AdmissionLedgerPdf({
  admission,
  ledger,
  settings,
}: AdmissionLedgerPdfProps) {
  const fontFamily = settings?.font_family || 'Amiri';
  const fontName = fontFamily; // Font is registered dynamically before PDF generation
  const fontSize = settings?.font_size || 10;

  const dynamicStyles = StyleSheet.create({
    page: {
      padding: 30,
      fontFamily: fontName,
      direction: 'rtl',
      textAlign: 'right',
      fontSize: fontSize,
    },
    title: {
      fontSize: fontSize + 10,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: fontSize + 4,
      fontWeight: 'bold',
      marginBottom: 8,
      borderBottom: '1 solid #000',
      paddingBottom: 4,
    },
    row: {
      flexDirection: 'row-reverse',
      marginBottom: 5,
      fontSize: fontSize,
    },
    tableHeader: {
      flexDirection: 'row-reverse',
      backgroundColor: '#f0f0f0',
      padding: 8,
      fontSize: fontSize,
      fontWeight: 'bold',
    },
    tableRow: {
      flexDirection: 'row-reverse',
      padding: 8,
      fontSize: fontSize - 1,
      borderBottom: '1 solid #e0e0e0',
    },
    creditAmount: {
      color: '#2e7d32',
      fontWeight: 'bold',
    },
    debitAmount: {
      color: '#c62828',
      fontWeight: 'bold',
    },
    summaryRow: {
      flexDirection: 'row-reverse',
      padding: 8,
      fontSize: fontSize + 1,
      fontWeight: 'bold',
      backgroundColor: '#f5f5f5',
      marginTop: 5,
    },
  });

  const { summary, entries } = ledger;

  return (
    <Document>
      <Page size="A4" style={dynamicStyles.page}>
        <PdfHeader settings={settings} />
        <Text style={dynamicStyles.title}>كشف الحساب</Text>

        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>معلومات التنويم</Text>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>المريض:</Text>
            <Text style={staticStyles.value}>{ledger.patient.name || admission.patient?.name || '-'}</Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>رقم التنويم:</Text>
            <Text style={staticStyles.value}>{admission.id || '-'}</Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>تاريخ التنويم:</Text>
            <Text style={staticStyles.value}>{admission.admission_date || '-'}</Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>الغرفة:</Text>
            <Text style={staticStyles.value}>
              {admission.room?.room_number || '-'}
              {admission.room?.room_type ? ` (${admission.room.room_type === 'vip' ? 'VIP' : 'عادي'})` : ''}
            </Text>
          </View>
        </View>

        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>ملخص الحساب</Text>
          <View style={staticStyles.summaryCard}>
            <Text style={staticStyles.summaryLabel}>إجمالي الدفعات (Credits):</Text>
            <Text style={[staticStyles.summaryValue, dynamicStyles.creditAmount]}>
              {formatNumber(summary.total_credits)}
            </Text>
          </View>
          <View style={staticStyles.summaryCard}>
            <Text style={staticStyles.summaryLabel}>إجمالي الخصومات (Debits):</Text>
            <Text style={[staticStyles.summaryValue, dynamicStyles.debitAmount]}>
              {formatNumber(summary.total_debits)}
            </Text>
          </View>
          <View style={[staticStyles.summaryCard, { backgroundColor: summary.balance >= 0 ? '#e8f5e9' : '#ffebee' }]}>
            <Text style={staticStyles.summaryLabel}>الرصيد الحالي:</Text>
            <Text style={[staticStyles.summaryValue, { 
              color: summary.balance >= 0 ? '#2e7d32' : '#c62828',
              fontWeight: 'bold',
            }]}>
              {formatNumber(summary.balance)}
            </Text>
          </View>
        </View>

        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>سجل المعاملات</Text>
          <View style={staticStyles.table}>
            <View style={dynamicStyles.tableHeader}>
              <Text style={[staticStyles.tableCell, { flex: 0.8 }]}>التاريخ</Text>
              <Text style={[staticStyles.tableCell, { flex: 0.6 }]}>الوقت</Text>
              <Text style={[staticStyles.tableCell, { flex: 1 }]}>النوع</Text>
              <Text style={[staticStyles.tableCell, { flex: 1.5 }]}>الوصف</Text>
              <Text style={[staticStyles.tableCell, { flex: 1 }]}>المبلغ</Text>
              <Text style={[staticStyles.tableCell, { flex: 0.8 }]}>طريقة الدفع</Text>
              <Text style={[staticStyles.tableCell, { flex: 1 }]}>الرصيد بعد</Text>
              <Text style={[staticStyles.tableCell, { flex: 1 }]}>المستخدم</Text>
            </View>
            {entries.length === 0 ? (
              <View style={dynamicStyles.tableRow}>
                <Text style={[staticStyles.tableCell, { textAlign: 'center', flex: 1 }]}>
                  لا توجد معاملات مسجلة
                </Text>
              </View>
            ) : (
              entries.map((entry, index) => (
                <View key={`${entry.id}-${index}`} style={dynamicStyles.tableRow}>
                  <Text style={[staticStyles.tableCell, { flex: 0.8 }]}>{entry.date}</Text>
                  <Text style={[staticStyles.tableCell, { flex: 0.6 }]}>{entry.time || '-'}</Text>
                  <Text style={[staticStyles.tableCell, { flex: 1 }]}>
                    {entry.type === 'credit' ? 'دفعة' : 'خصم'}
                  </Text>
                  <Text style={[staticStyles.tableCell, { flex: 1.5 }]}>{entry.description}</Text>
                  <Text style={[
                    staticStyles.tableCell,
                    { flex: 1 },
                    entry.type === 'credit' ? dynamicStyles.creditAmount : dynamicStyles.debitAmount
                  ]}>
                    {entry.amount >= 0 ? '+' : ''}{formatNumber(entry.amount)}
                  </Text>
                  <Text style={[staticStyles.tableCell, { flex: 0.8 }]}>
                    {entry.is_bank ? 'بنك' : 'نقدي'}
                  </Text>
                  <Text style={[staticStyles.tableCell, { flex: 1, fontWeight: 'bold' }]}>
                    {formatNumber(entry.balance_after)}
                  </Text>
                  <Text style={[staticStyles.tableCell, { flex: 1 }]}>{entry.user || '-'}</Text>
                </View>
              ))
            )}
          </View>
        </View>
        <PdfFooter settings={settings} />
      </Page>
    </Document>
  );
}


