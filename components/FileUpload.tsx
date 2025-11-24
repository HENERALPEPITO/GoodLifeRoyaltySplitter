import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const isValidFile = (file: File) => {
    return file.name.endsWith('.csv') || file.name.endsWith('.xlsx');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files: File[] = Array.from(e.dataTransfer.files);
    const validFile = files.find(isValidFile);
    
    if (validFile) {
      onFileSelect(validFile);
    } else {
      alert("Please upload a valid .csv or .xlsx file");
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        onFileSelect(file);
      } else {
         alert("Please upload a valid .csv or .xlsx file");
      }
    }
  }, [onFileSelect]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "relative group cursor-pointer flex flex-col items-center justify-center w-full h-64 rounded-3xl border-2 border-dashed transition-all duration-300 ease-out",
              isDragging 
                ? "border-blue-500 bg-blue-50/50 scale-[1.02]" 
                : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input 
              id="file-upload" 
              type="file" 
              accept=".csv, .xlsx" 
              className="hidden" 
              onChange={handleFileInput}
            />
            
            <div className="p-4 rounded-full bg-slate-100 mb-4 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
            
            <p className="text-lg font-medium text-slate-700 mb-2">
              Drop your Royalties File here
            </p>
            <p className="text-sm text-slate-400">
              Supports .csv and .xlsx
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="selected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-2xl">
                {selectedFile.name.endsWith('.csv') ? (
                   <FileText className="w-8 h-8 text-green-600" />
                ) : (
                   <FileSpreadsheet className="w-8 h-8 text-green-600" />
                )}
               
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-lg truncate max-w-[200px] sm:max-w-md">
                  {selectedFile.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-red-500"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;