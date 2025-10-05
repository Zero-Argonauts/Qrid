import React from 'react';
import { Button } from './ui/button';
import { Download, FileImage, FileText, Link } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

interface QRCodeItem {
  id: string;
  data: string;
  rowData: Record<string, any>;
}

interface ExportButtonsProps {
  qrCodes: QRCodeItem[];
  disabled?: boolean;
}

export function ExportButtons({ qrCodes, disabled = false }: ExportButtonsProps) {
  const exportImages = async () => {
    if (qrCodes.length === 0) return;

    const zip = new JSZip();
    
    for (let i = 0; i < qrCodes.length; i++) {
      const qrCode = qrCodes[i];
      try {
        const dataUrl = await QRCode.toDataURL(qrCode.data, {
          width: 400,
          margin: 2,
        });
        const base64Data = dataUrl.split(',')[1];
        zip.file(`qr-code-${i + 1}.png`, base64Data, { base64: true });
      } catch (error) {
        console.error(`Error generating QR code ${i + 1}:`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr-codes.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (qrCodes.length === 0) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const qrSize = 50;
    const marginX = 20;
    const marginY = 30;
    const itemSpacing = 80; // Space between each QR code + details block

    pdf.setFontSize(16);
    pdf.text('QR Codes Export', pageWidth / 2, 20, { align: 'center' });

    let currentY = marginY;

    for (let i = 0; i < qrCodes.length; i++) {
      const qrCode = qrCodes[i];
      
      // Check if we need a new page
      if (currentY + itemSpacing > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }

      try {
        // Generate QR code
        const dataUrl = await QRCode.toDataURL(qrCode.data, {
          width: 200,
          margin: 2,
        });
        
        // Add QR code
        pdf.addImage(dataUrl, 'PNG', marginX, currentY, qrSize, qrSize);
        
        // Add label below QR code - use first column value as primary identifier
        const firstEntry = Object.entries(qrCode.rowData)[0];
        if (firstEntry) {
          const [columnName, columnValue] = firstEntry;
          pdf.setFontSize(10);
          pdf.text(`${columnName}: ${columnValue}`, marginX, currentY + qrSize + 8);
        }
        
        // Add row details next to QR code
        const detailsX = marginX + qrSize + 10;
        const detailsY = currentY - 10;
        
        pdf.setFontSize(10);
        
        // Add row data details
        pdf.setFontSize(8);
        let detailY = detailsY + 15;
        const maxWidth = pageWidth - detailsX - 10;
        
        Object.entries(qrCode.rowData).forEach(([key, value]) => {
          const text = `${key}: ${value}`;
          const lines = pdf.splitTextToSize(text, maxWidth);
          
          lines.forEach((line: string) => {
            if (detailY < pageHeight - 20) {
              pdf.text(line, detailsX, detailY);
              detailY += 4;
            }
          });
        });
        
        currentY += itemSpacing;
        
      } catch (error) {
        console.error(`Error adding QR code ${i + 1} to PDF:`, error);
        currentY += itemSpacing;
      }
    }

    pdf.save('qr-codes.pdf');
  };

  const exportSimplePDF = async () => {
    if (qrCodes.length === 0) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const qrSize = 45; // Slightly smaller to fit 4 rows
    const qrPerRow = 3;
    const qrPerPage = 12; // 4 rows × 3 columns
    const marginX = 15;
    const marginY = 15;
    const textHeight = 8; // Height for text below QR code

    // Calculate spacing for 3 QR codes per row
    const availableWidth = pageWidth - 2 * marginX;
    const qrWithSpacing = availableWidth / qrPerRow;
    const qrStartX = marginX + (qrWithSpacing - qrSize) / 2;
    
    // Calculate vertical spacing for 4 rows per page
    const availableHeight = pageHeight - 2 * marginY;
    const rowSpacing = (availableHeight - textHeight * 4) / 4; // 4 rows, accounting for text

    let currentY = marginY;
    let qrCount = 0;

    for (let i = 0; i < qrCodes.length; i++) {
      const qrCode = qrCodes[i];
      const colIndex = i % qrPerRow;
      const rowIndex = Math.floor(i / qrPerRow) % 4; // 4 rows per page
      
      // Check if we need a new page (every 12 QR codes)
      if (qrCount >= qrPerPage) {
        pdf.addPage();
        currentY = marginY;
        qrCount = 0;
      }

      try {
        // Calculate X position for this QR code (3 per row)
        const currentX = qrStartX + colIndex * qrWithSpacing;
        
        // Calculate Y position for this row
        const rowY = currentY + rowIndex * (qrSize + textHeight + 3);
        
        // Generate QR code
        const dataUrl = await QRCode.toDataURL(qrCode.data, {
          width: 200,
          margin: 2,
        });
        
        // Add QR code
        pdf.addImage(dataUrl, 'PNG', currentX, rowY, qrSize, qrSize);
        
        // Add column name and value with a little padding below QR code
        const firstEntry = Object.entries(qrCode.rowData)[0];
        if (firstEntry) {
          const [columnName, columnValue] = firstEntry;
          pdf.setFontSize(7); // Slightly smaller font
          const text = `${columnName}: ${columnValue}`;
          const textWidth = pdf.getTextWidth(text);
          const textX = currentX + (qrSize - textWidth) / 2;
          pdf.text(text, textX, rowY + qrSize + 2); // 4 units below QR code for a little padding
        }
        
        qrCount++;
        
      } catch (error) {
        console.error(`Error adding QR code ${i + 1} to PDF:`, error);
      }
    }

    pdf.save('qr-codes-simple.pdf');
  };

  const exportURL = () => {
    if (qrCodes.length === 0) return;

    const data = {
      qrCodes: qrCodes.map((qr, index) => ({
        id: index + 1,
        data: qr.data,
        rowData: qr.rowData
      })),
      timestamp: new Date().toISOString(),
      total: qrCodes.length
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr-codes-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-3 md:flex-row xs:flex-col sm:w-auto xs:w-full">
      <Button
        onClick={exportImages}
        disabled={disabled || qrCodes.length === 0}
        variant="outline"
        className="flex items-center gap-2 cursor-pointer"
      >
        <FileImage size={16} />
        Export QR Images
      </Button>
      
      <Button
        onClick={exportPDF}
        disabled={disabled || qrCodes.length === 0}
        variant="outline"
        className="flex items-center gap-2 cursor-pointer"
      >
        <FileText size={16} />
        Export PDF
      </Button>
      
      <Button
        onClick={exportSimplePDF}
        disabled={disabled || qrCodes.length === 0}
        variant="outline"
        className="flex items-center gap-2 cursor-pointer"
      >
        <FileText size={16} />
        Print QR Codes
      </Button>
      
      <Button
        onClick={exportURL}
        disabled={disabled || qrCodes.length === 0}
        variant="outline"
        className="flex items-center gap-2 cursor-pointer"
      >
        <Link size={16} />
        Export JSON
      </Button>
    </div>
  );
}