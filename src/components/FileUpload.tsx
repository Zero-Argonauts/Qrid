import React, { useRef } from 'react';
import { Button } from './ui/button';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  hasData: boolean;
}

export function FileUpload({ onFileUpload, hasData }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFileUpload(file);
    } else {
      alert('Please select a valid Excel file (.xlsx or .xls)');
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-2 sm:h-48 sm:w-48 md:h-auto md:w-auto xs:w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        onClick={handleButtonClick}
        variant={hasData ? "secondary" : "default"}
        className="flex items-center sm:h-48 sm:w-full md:h-auto md:w-auto xs:w-full cursor-pointer"
      >
        <FileSpreadsheet size={16} />
        Upload XLSX
      </Button>
    </div>
  );
}
