import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { PdfSetting } from '@/types/pdfSettings';
import { getAmiriFont } from '@/lib/pdfFonts';

interface PdfFooterProps {
  settings: PdfSetting | null;
}

const PdfFooter: React.FC<PdfFooterProps> = ({ settings }) => {
  const fontFamily = settings?.font_family || 'Amiri';
  const fontName = fontFamily === 'Amiri' ? getAmiriFont() : fontFamily;
  const fontSize = settings?.font_size || 10;

  if (!settings?.footer_phone && !settings?.footer_address && !settings?.footer_email) {
    return null;
  }

  return (
    <View style={styles.footerContainer}>
      <View style={styles.footerContent}>
        {settings.footer_phone && (
          <Text style={[styles.footerText, { fontFamily: fontName, fontSize }]}>
            الهاتف: {settings.footer_phone}
          </Text>
        )}
        {settings.footer_email && (
          <Text style={[styles.footerText, { fontFamily: fontName, fontSize }]}>
            البريد الإلكتروني: {settings.footer_email}
          </Text>
        )}
        {settings.footer_address && (
          <Text style={[styles.footerText, { fontFamily: fontName, fontSize }]}>
            العنوان: {settings.footer_address}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerContent: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  footerText: {
    textAlign: 'right',
    color: '#666',
  },
});

export default PdfFooter;

