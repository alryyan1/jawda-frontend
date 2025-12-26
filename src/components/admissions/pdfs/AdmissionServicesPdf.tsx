import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getAmiriFont } from '@/lib/pdfFonts';
import type { Admission, AdmissionRequestedService } from '@/types/admissions';
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
});

interface AdmissionServicesPdfProps {
  admission: Admission;
  services: AdmissionRequestedService[];
  settings: PdfSetting | null;
}

export default function AdmissionServicesPdf({
  admission,
  services,
  settings,
}: AdmissionServicesPdfProps) {
  const totalDebit = services.reduce((sum, s) => sum + (s.total_price || 0), 0);
  const totalCredit = services.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
  const totalBalance = totalDebit - totalCredit;

  const fontFamily = settings?.font_family || 'Amiri';
  const fontName = fontFamily === 'Amiri' ? getAmiriFont() : fontFamily;
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
    totalRow: {
      flexDirection: 'row',
      padding: 8,
      fontSize: fontSize + 1,
      fontWeight: 'bold',
      backgroundColor: '#f5f5f5',
      marginTop: 5,
    },
  });

  return (
    <Document>
      <Page size="A4" style={dynamicStyles.page}>
        <PdfHeader settings={settings} />
        <Text style={dynamicStyles.title}>تقرير الخدمات المطلوبة</Text>

        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>معلومات التنويم</Text>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>المريض:</Text>
            <Text style={staticStyles.value}>{admission.patient?.name || '-'}</Text>
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
          <Text style={dynamicStyles.sectionTitle}>الخدمات المطلوبة</Text>
          <View style={staticStyles.table}>
            <View style={dynamicStyles.tableHeader}>
              <Text style={staticStyles.tableCell}>الخدمة</Text>
              <Text style={staticStyles.tableCell}>السعر</Text>
              <Text style={staticStyles.tableCell}>العدد</Text>
              <Text style={staticStyles.tableCell}>المدفوع</Text>
              <Text style={staticStyles.tableCell}>المتبقي</Text>
            </View>
            {services.map((service) => (
              <View key={service.id} style={dynamicStyles.tableRow}>
                <Text style={staticStyles.tableCell}>{service.service?.name || '-'}</Text>
                <Text style={staticStyles.tableCell}>{formatNumber(service.price || 0)}</Text>
                <Text style={staticStyles.tableCell}>{service.count || 1}</Text>
                <Text style={staticStyles.tableCell}>{formatNumber(service.amount_paid || 0)}</Text>
                <Text style={staticStyles.tableCell}>
                  {formatNumber((service.total_price || 0) - (service.amount_paid || 0))}
                </Text>
              </View>
            ))}
            <View style={dynamicStyles.totalRow}>
              <Text style={staticStyles.tableCell}>الإجمالي</Text>
              <Text style={staticStyles.tableCell}>{formatNumber(totalDebit)}</Text>
              <Text style={staticStyles.tableCell}></Text>
              <Text style={staticStyles.tableCell}>{formatNumber(totalCredit)}</Text>
              <Text style={staticStyles.tableCell}>{formatNumber(totalBalance)}</Text>
            </View>
          </View>
        </View>
        <PdfFooter settings={settings} />
      </Page>
    </Document>
  );
}

