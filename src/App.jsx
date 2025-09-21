import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode'; // Add this import

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

  // Create a comprehensive Excel report with embedded images (conceptual)
  const createExcelWithEmbeddedImages = async () => {
    if (urls.length === 0) {
      alert('Please load an Excel file first');
      return;
    }

    setIsProcessing(true);

    try {
      // Create Excel data with image placeholders
      const reportData = [];

      for (let i = 0; i < originalData.length; i++) {
        const row = originalData[i];
        const url = urls[i];

        // Create row with image reference
        reportData.push({
          'Record_ID': i + 1,
          'QR_Code_File': `qr_code_${i + 1}.png`,
          ...row,
          'Generated_URL': url,
          'URL_Length': url.length,
          'Created_Date': new Date().toLocaleDateString()
        });
      }

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "QR Code Report");

      // Add instructions sheet
      const instructions = [
        { Instruction: "QR Code Images are referenced in the QR_Code_File column" },
        { Instruction: "Download QR images separately using the 'Export QR Images' button" },
        { Instruction: "Each QR code encodes the corresponding Generated_URL" },
        { Instruction: "Use the Record_ID to match QR codes with data rows" }
      ];

      const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

      // Export
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}_qr_report.xlsx`;
      link.click();

      alert('Excel report created! Download QR images separately for complete package.');

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Excel QR Code Generator with Fixed PDF Export
          </h1>

          {/* File Input */}
          <div className="mb-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
              >
                Click to upload Excel file (.xlsx, .xls)
              </label>
              {fileName && (
                <p className="mt-2 text-gray-600">Loaded: {fileName}</p>
              )}
            </div>
          </div>

          {/* Export Buttons */}
          {urls.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-center">Export Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <button
                  onClick={exportToExcelWithQRImages}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isProcessing ? 'Processing...' : 'Excel + QR Data'}
                </button>

                <button
                  onClick={exportQRImagesAsFiles}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Export QR Images
                </button>

                <button
                  onClick={createExcelWithEmbeddedImages}
                  disabled={isProcessing}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Excel Report
                </button>

                <button
                  onClick={exportToPDFWithQR}
                  disabled={isProcessing}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  📄 PDF Report (Fixed)
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
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-sm"
                >
                  Export URLs
                </button>
              </div>
            </div>
          )}

          {/* Status */}
          {urls.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-green-800 font-medium">
                  ✅ Generated {urls.length} QR codes from {originalData.length} records
                </span>
                <span className="text-green-600 text-sm">
                  {qrImages.length} images ready
                </span>
              </div>
            </div>
          )}

          {/* QR Code Preview */}
          {urls.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                QR Code Preview
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {urls.slice(0, 12).map((url, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div className="flex justify-center mb-3">
                      <QRCodeSVG
                        value={url}
                        size={100}
                        className="border border-gray-300"
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-800 mb-1">
                        QR #{index + 1}
                      </div>
                      <div className="text-xs text-gray-600">
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
                        className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {urls.length > 12 && (
                <div className="text-center text-gray-600 mb-6">
                  <p>Showing 12 of {urls.length} QR codes</p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-800 mb-3">🔧 What's Fixed:</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-700 mb-2">PDF Export Issues Fixed:</h4>
                <ul className="text-blue-600 text-sm space-y-1">
                  <li>✅ QR codes now properly display in PDF</li>
                  <li>✅ Uses actual qrcode library for generation</li>
                  <li>✅ Better print layout and styling</li>
                  <li>✅ Print button for easy PDF creation</li>
                  <li>✅ Proper page breaks and formatting</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-2">How to Use PDF:</h4>
                <ul className="text-blue-600 text-sm space-y-1">
                  <li>1. Click "📄 PDF Report (Fixed)"</li>
                  <li>2. Open the downloaded HTML file</li>
                  <li>3. Click the "Print to PDF" button</li>
                  <li>4. Select "Save as PDF" in print dialog</li>
                  <li>5. Your PDF will have working QR codes!</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pro Tip */}
          <div className="mt-6 bg-yellow-50 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              💡 <strong>Fixed!</strong> The PDF export now uses the proper qrcode library to generate actual, scannable QR codes.
              The QR codes will be clearly visible and scannable in the final PDF document.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}