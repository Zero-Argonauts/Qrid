import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';

export default function FixedExcelQRExporter() {
  const [urls, setUrls] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [qrImages, setQrImages] = useState([]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name.replace(/\.[^/.]+$/, ""));

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      console.log('Original data:', rows);
      setOriginalData(rows);

      const baseUrl = "http://bar-code-backend.onrender.com/assets/";
      const generatedUrls = rows.map(row => {
        const rowStr = Object.entries(row)
          .map(([key, value]) => `${key}=${value}`)
          .join("; ") + ";";  // Note: Added space after semicolon
        return baseUrl + rowStr;  // Direct concatenation without encoding
      });

      setUrls(generatedUrls);

      // Generate QR code images using qrcode library
      await generateAllQRImages(generatedUrls);

    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please make sure it\'s a valid Excel file.');
    }
  };

  // Generate QR code as data URL using qrcode library
  const generateQRCodeImage = async (text) => {
    try {
      // Generate QR code as data URL
      const dataURL = await QRCode.toDataURL(text, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Convert data URL to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  // Generate all QR images
  const generateAllQRImages = async (urlList) => {
    const images = [];
    for (let i = 0; i < urlList.length; i++) {
      try {
        const blob = await generateQRCodeImage(urlList[i]);
        images.push(blob);
      } catch (error) {
        console.error(`Error generating QR code for URL ${i}:`, error);
        // Create a placeholder image if QR generation fails
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Error', 100, 90);
        ctx.fillText(`ID: ${i + 1}`, 100, 120);

        canvas.toBlob((blob) => {
          images.push(blob);
        }, 'image/png');
      }
    }
    setQrImages(images);
  };

  // Export to Excel with QR code images
  const exportToExcelWithQRImages = async () => {
    if (urls.length === 0) {
      alert('Please load an Excel file first');
      return;
    }

    setIsProcessing(true);

    try {
      const excelData = [];

      for (let i = 0; i < originalData.length; i++) {
        const row = originalData[i];
        const url = urls[i];
        const qrBlob = qrImages[i];

        // Convert blob to base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(qrBlob);
        });

        excelData.push({
          'ID': i + 1,
          ...row,
          'Generated_URL': url,
          'QR_Image_Base64': base64,
          'QR_Note': 'Copy base64 data to decode image'
        });
      }

      // Create Excel file
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data with QR Images");

      // Set column widths
      const columnKeys = Object.keys(excelData[0]);
      const colWidths = columnKeys.map(key => {
        if (key === 'Generated_URL') return { wch: 50 };
        if (key === 'QR_Image_Base64') return { wch: 30 };
        if (key === 'QR_Note') return { wch: 25 };
        if (key === 'ID') return { wch: 5 };
        return { wch: 15 };
      });
      worksheet['!cols'] = colWidths;

      // Export file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}_with_qr_images.xlsx`;
      link.click();

      alert('Excel file with QR images exported successfully!');

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export QR images as separate files
  const exportQRImagesAsFiles = async () => {
    if (qrImages.length === 0) {
      alert('No QR images to export');
      return;
    }

    setIsProcessing(true);

    try {
      // Create a zip-like structure by downloading individual files
      for (let i = 0; i < qrImages.length; i++) {
        const blob = qrImages[i];
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `qr_code_${i + 1}.png`;

        // Add delay to prevent browser blocking multiple downloads
        setTimeout(() => {
          link.click();
        }, i * 500);
      }

      alert(`Started download of ${qrImages.length} QR code images`);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  // Fixed PDF export with working QR codes
  const exportToPDFWithQR = async () => {
    if (urls.length === 0) {
      alert('Please load an Excel file first');
      return;
    }

    setIsProcessing(true);

    try {
      // Create HTML content that properly renders QR codes
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>QR Code Report - ${fileName}</title>
    <style>
        @media print {
            @page { 
                margin: 15mm; 
                size: A4;
            }
            .page-break { 
                page-break-before: always; 
            }
            .no-print { 
                display: none !important; 
            }
        }
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            line-height: 1.4;
            background: white;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        .record { 
            border: 1px solid #ddd; 
            margin: 15px 0; 
            padding: 15px; 
            border-radius: 5px;
            display: flex;
            gap: 15px;
            align-items: flex-start;
            background: white;
            break-inside: avoid;
        }
        .qr-section { 
            flex-shrink: 0; 
            text-align: center;
            width: 140px;
        }
        .qr-container { 
            width: 120px; 
            height: 120px; 
            border: 1px solid #ccc;
            background: white;
            margin: 0 auto 8px auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .qr-image {
            max-width: 110px;
            max-height: 110px;
        }
        .data-section { 
            flex: 1; 
        }
        .record-title { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 10px;
            color: #333;
        }
        .data-field { 
            margin: 5px 0; 
            font-size: 12px;
        }
        .field-name { 
            font-weight: bold; 
            color: #555;
            display: inline-block;
            min-width: 100px;
        }
        .url { 
            margin-top: 10px; 
            font-size: 9px; 
            color: #666; 
            word-break: break-all;
            background: #f8f9fa;
            padding: 8px;
            border-radius: 3px;
            border-left: 3px solid #007bff;
        }
        .summary { 
            background: #f0f8ff; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px;
            border: 1px solid #b3d9ff;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 1000;
        }
        .print-button:hover {
            background: #0056b3';
        }
        .instructions {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">🖨️ Print to PDF</button>
    
    <div class="header">
        <h1>QR Code Report</h1>
        <p><strong>Source File:</strong> ${fileName}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total Records:</strong> ${originalData.length}</p>
    </div>

    <div class="instructions no-print">
        <h3>📋 Instructions:</h3>
        <p><strong>To create PDF:</strong> Click "Print to PDF" button or use Ctrl+P (Cmd+P on Mac) and select "Save as PDF"</p>
        <p><strong>QR Codes:</strong> Each QR code below contains the full URL for the corresponding record</p>
    </div>

    <div class="summary">
        <h3>Summary</h3>
        <p>This report contains ${originalData.length} records with corresponding QR codes. Each QR code encodes a unique URL containing the record data.</p>
        <p><strong>QR Code Status:</strong> ✅ All QR codes generated and embedded</p>
    </div>

${await Promise.all(originalData.map(async (row, index) => {
        const qrBlob = qrImages[index];
        const qrDataURL = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(qrBlob);
        });

        return `
    <div class="record ${index > 0 && index % 2 === 0 ? 'page-break' : ''}">
        <div class="qr-section">
            <div class="qr-container">
                <img src="${qrDataURL}" class="qr-image" alt="QR Code ${index + 1}" />
            </div>
            <div style="font-size: 11px; font-weight: bold; color: #666;">QR #${index + 1}</div>
        </div>
        <div class="data-section">
            <div class="record-title">Record #${index + 1}</div>
            ${Object.entries(row).map(([key, value]) => `
                <div class="data-field">
                    <span class="field-name">${key}:</span>
                    <span>${value}</span>
                </div>
            `).join('')}
            <div class="url">
                <strong>🔗 Generated URL:</strong><br>
                ${urls[index]}
            </div>
        </div>
    </div>
  `;
      })).then(records => records.join(''))}

    <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px;">
        <p>Report generated on ${new Date().toLocaleString()}</p>
        <p>Total QR Codes: ${originalData.length} | Source: ${fileName}</p>
    </div>
</body>
</html>`;

      // Create and download the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}_qr_report.html`;
      link.click();

      alert('✅ PDF-ready HTML report generated! Open the file and use "Print to PDF" for best results.');

    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className='flex flex-col items-center mt-10'>
      <h1>
        XLSX-QR-CODE-GENERATOR
      </h1>

      {/* File Input */}
      <div className="flex flex-col items-center">
        <div className="mt-10">
          <input
            type="file"
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className='hidden'
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className='border p-4 rounded-xl hover:cursor-pointer'
          >
            Click to upload Excel file (.xlsx, .xls)
          </label>
        </div>
        {fileName && (
          <p className="mt-10"><b>Loaded</b>: {fileName}</p>
        )}
      </div>

      {/* Export Buttons */}
      {urls.length > 0 && (
        <div className="">

          <div className="flex flex-col lg:flex-row [&>button]:m-4 mt-5">

            <button
              onClick={exportToExcelWithQRImages}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Excel + QR Data'}
            </button>

            <button
              onClick={exportQRImagesAsFiles}
              disabled={isProcessing}
            >
              Export QR Images
            </button>

            <button
              onClick={exportToPDFWithQR}
              disabled={isProcessing}
            >
              Export PDF
            </button>

            <button
              onClick={() => {
                const textContent = urls.map((url, index) => `${index + 1}. ${url}`).join('\n');
                const blob = new Blob([textContent], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${fileName}_urls.txt`;
                link.click();
              }}
              className=""
            >
              Export URLs
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      {urls.length > 0 && (
        <div className="mt-5">
          <span className="">
            Generated {urls.length} QR codes from {originalData.length} records ✅
          </span>
        </div>
      )}

      {/* QR Code Preview */}
      {urls.length > 0 && (
        <div>
          <h2 className="">
            QR Code Preview
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {urls.map((url, index) => (
              <div key={index} className="rounded-lg p-5">
                <div className="flex justify-center mb-4">
                  <QRCodeSVG
                    value={url}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <div className="text-center space-y-2">
                  <div className="font-semibold text-lg">
                    QR #{index + 1}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {Object.entries(originalData[index] || {})
                      .slice(0, 1)
                      .map(([key, value]) => `${value}`)
                      .join('')}
                  </div>
                  <button
                    onClick={() => {
                      if (qrImages[index]) {
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(qrImages[index]);
                        link.download = `qr_code_${index + 1}.png`;
                        link.click();
                      }
                    }}
                    className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}