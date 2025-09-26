import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileUpload } from './components/FileUpload';
import { QRCodeGrid } from './components/QRCodeGrid';
import { ExportButtons } from './components/ExportButtons';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Alert, AlertDescription } from './components/ui/alert';
import { Info } from 'lucide-react';

interface QRCodeItem {
  id: string;
  data: string;
  rowData: Record<string, any>;
}

export default function App() {
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      // const sheetName = workbook.SheetNames[0];
      // const worksheet = workbook.Sheets[sheetName];
      // const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const baseUrl = "https://qrid-viewer.onrender.com/";
      const generatedUrls = (rows as Record<string, any>[]).map(row => {
        const rowStr = Object.entries(row)
          .map(([key, value]) => `${key}=${value}`)
          .join("; ") + ";";
        return baseUrl + rowStr;
      });


      // const newQrCodes: QRCodeItem[] = jsonData.map((row: any, index) => {
      //   // Convert row data to QR code string
      //   const qrData = Object.entries(row)
      //     .map(([key, value]) => `${key}: ${value}`)
      //     .join('\n');

      //   return {
      //     id: `qr-${index}`,
      //     data: qrData,
      //     rowData: row as Record<string, any>
      //   };
      // });

      const newQrCodes: QRCodeItem[] = generatedUrls.map((url, index) => ({
        id: `qr-${index + 1}`,
        data: url,
        rowData: (rows as Record<string, any>[])[index] ?? {}
      }));

      setQrCodes(newQrCodes);

    } catch (error) {
      console.error('Error processing Excel file:', error);
      alert('Error processing Excel file. Please make sure it\'s a valid Excel file.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl">Qrid</h1>
          <p className="text-muted-foreground">
            Upload an Excel file and convert each row into a QR code
          </p>
        </div>

        {/* Controls */}
        <Card>
          {/* <CardHeader>
            <CardTitle></CardTitle>
          </CardHeader> */}
          <div></div>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <FileUpload
                onFileUpload={processExcelFile}
                hasData={qrCodes.length > 0}
              />
              <ExportButtons
                qrCodes={qrCodes}
                disabled={isProcessing}
              />
            </div>

            {fileName && (
              <div className="text-sm text-muted-foreground">
                Current file: <span className="font-medium">{fileName}</span>
                {qrCodes.length > 0 && (
                  <span className="ml-2">
                    ({qrCodes.length} QR code{qrCodes.length !== 1 ? 's' : ''} generated)
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Upload an Excel file (.xlsx or .xls) to generate QR codes from each row.
          </AlertDescription>
        </Alert>

        {/* QR Code Grid */}
        <Card>
          <CardHeader>
            <CardTitle>QR Codes ({qrCodes.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isProcessing ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground">Processing Excel file...</p>
                </div>
              </div>
            ) : (
              <QRCodeGrid qrCodes={qrCodes} />
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Each QR code stores the data from its Excel row.</p>
        </div>
      </div>
    </div>
  );
}