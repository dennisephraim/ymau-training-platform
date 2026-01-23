'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';

// Register fonts (using system fonts for now)
// You can add custom fonts later if needed

// Certificate data interface
interface CertificateData {
  studentName: string;
  courseName: string;

  issuedDate: string;
  verificationCode: string;
  qrCodeDataUrl: string;
  issuerName: string;
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  container: {
    flex: 1,
    border: '3pt solid #1e3a5f',
    borderRadius: 8,
    padding: 30,
    position: 'relative',
  },
  innerBorder: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    border: '1pt solid #c4a052',
    borderRadius: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    fontSize: 12,
    color: '#1e3a5f',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    color: '#1e3a5f',
    fontWeight: 'bold',
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 15,
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginBottom: 15,
  },
  presentedTo: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  studentName: {
    fontSize: 26,
    color: '#1e3a5f',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 10,
    color: '#444444',
    textAlign: 'center',
    lineHeight: 1.5,
    marginBottom: 6,
  },
  courseName: {
    fontSize: 16,
    color: '#1e3a5f',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 10,
  },
  signatureSection: {
    alignItems: 'center',
    width: '35%',
  },
  signatureLine: {
    width: '100%',
    borderBottom: '1pt solid #333333',
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#666666',
  },
  issuerName: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 3,
    fontFamily: 'Helvetica-Bold',
  },
  qrSection: {
    alignItems: 'center',
  },
  qrCode: {
    width: 55,
    height: 55,
    marginBottom: 3,
  },
  verificationCode: {
    fontSize: 7,
    color: '#666666',
    textAlign: 'center',
  },
  verificationLabel: {
    fontSize: 6,
    color: '#999999',
    textAlign: 'center',
    marginTop: 1,
  },
  dateSection: {
    alignItems: 'center',
    width: '35%',
  },
  date: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 3,
  },
  dateLabel: {
    fontSize: 9,
    color: '#666666',
  },
  decorativeCorner: {
    position: 'absolute',
    width: 25,
    height: 25,
  },
  topLeft: {
    top: 12,
    left: 12,
    borderTop: '2pt solid #c4a052',
    borderLeft: '2pt solid #c4a052',
  },
  topRight: {
    top: 12,
    right: 12,
    borderTop: '2pt solid #c4a052',
    borderRight: '2pt solid #c4a052',
  },
  bottomLeft: {
    bottom: 12,
    left: 12,
    borderBottom: '2pt solid #c4a052',
    borderLeft: '2pt solid #c4a052',
  },
  bottomRight: {
    bottom: 12,
    right: 12,
    borderBottom: '2pt solid #c4a052',
    borderRight: '2pt solid #c4a052',
  },
  logoTopLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 50,
    height: 50,
  },
  logoTopRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
  },
});

// Certificate PDF Document Component
export function CertificatePDF({ data }: { data: CertificateData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.container}>
          {/* Decorative inner border */}
          <View style={styles.innerBorder} />

          {/* Decorative corners */}
          <View style={[styles.decorativeCorner, styles.topLeft]} />
          <View style={[styles.decorativeCorner, styles.topRight]} />
          <View style={[styles.decorativeCorner, styles.bottomLeft]} />
          <View style={[styles.decorativeCorner, styles.bottomRight]} />

          {/* Logo in top corners */}
          <Image style={styles.logoTopLeft} src="/YMAU Crest.png" />
          <Image style={styles.logoTopRight} src="/YMAU Crest.png" />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>YALE MODEL AFRICAN UNION</Text>
            <Text style={styles.title}>Certificate of Completion</Text>
            <Text style={styles.subtitle}>Training Program Achievement</Text>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.presentedTo}>This is to certify that</Text>
            <Text style={styles.studentName}>{data.studentName}</Text>
            <Text style={styles.completionText}>
              has successfully completed all requirements for
            </Text>
            <Text style={styles.courseName}>{data.courseName}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {/* Date Section */}
            <View style={styles.dateSection}>
              <Text style={styles.date}>{data.issuedDate}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.dateLabel}>Date of Issue</Text>
            </View>

            {/* QR Code Section */}
            <View style={styles.qrSection}>
              {data.qrCodeDataUrl && (
                <Image style={styles.qrCode} src={data.qrCodeDataUrl} />
              )}
              <Text style={styles.verificationCode}>{data.verificationCode}</Text>
              <Text style={styles.verificationLabel}>Scan to verify</Text>
            </View>

            {/* Signature Section */}
            <View style={styles.signatureSection}>
              <Text style={styles.issuerName}>{data.issuerName}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Program Director</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export type { CertificateData };
