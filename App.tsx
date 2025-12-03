import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';

import FileUpload from './components/FileUpload';
import ComposerCard from './components/ArtistCard';
import ColumnSelector from './components/ColumnSelector';
import { parseFileToRawData, processRawData, generateCsvContent, MANDATORY_COLUMN, ESSENTIAL_COLUMNS } from './services/processor';
import { AppState, ProcessedComposerData, ProcessingStats, RawCsvRow } from './types';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [appState, setAppState] = useState<AppState>('IDLE');
  
  // Data States
  const [rawData, setRawData] = useState<RawCsvRow[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  
  const [processedData, setProcessedData] = useState<ProcessedComposerData[]>([]);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setAppState('PROCESSING'); // Show loading while reading headers
    
    try {
      // 1. Parse file just to get headers and raw data
      const { headers, data } = await parseFileToRawData(selectedFile);
      
      if (!headers.includes(MANDATORY_COLUMN)) {
        alert(`Error: The file is missing the required column: "${MANDATORY_COLUMN}"`);
        setAppState('IDLE');
        setFile(null);
        return;
      }

      setAvailableColumns(headers);
      setRawData(data);
      
      // Default: Select only essential columns that exist in the file
      // Use trimmed comparison to handle whitespace variations in CSV headers
      const essentialColumnsInFile = headers.filter(col => 
        ESSENTIAL_COLUMNS.some(essential => col.trim() === essential.trim())
      );
      setSelectedColumns(essentialColumnsInFile);
      
      setAppState('COLUMN_SELECTION');
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Failed to read the file. Please check format.");
      setAppState('IDLE');
      setFile(null);
    }
  };

  const handleToggleColumn = (col: string) => {
    if (col === MANDATORY_COLUMN) return; // Cannot uncheck mandatory

    setSelectedColumns(prev => {
      if (prev.includes(col)) {
        return prev.filter(c => c !== col);
      } else {
        return [...prev, col];
      }
    });
  };

  const handleProcess = async () => {
    setAppState('PROCESSING');
    
    // Simulate a minimum loading time for better UX feeling
    const minTime = new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const [result] = await Promise.all([
        processRawData(rawData, selectedColumns),
        minTime
      ]);
      
      setProcessedData(result.data);
      setStats(result.stats);
      setAppState('COMPLETED');
      triggerToast();
    } catch (error) {
      console.error("Error processing data:", error);
      alert("Failed to process data.");
      setAppState('IDLE');
    }
  };

  const handleReset = () => {
    setFile(null);
    setAppState('IDLE');
    setRawData([]);
    setAvailableColumns([]);
    setSelectedColumns([]);
    setProcessedData([]);
    setStats(null);
  };

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDownloadAllZip = async () => {
    const zip = new JSZip();
    
    processedData.forEach(composer => {
      const content = generateCsvContent(composer.rows, selectedColumns);
      zip.file(composer.filename, content);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `royalties_split_composers_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100">
      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-50 flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="font-medium">Export completed successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Split Royalties by Good Life
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Upload your master CSV or XLSX file. Select the columns you need, and we'll group them by Composer automatically.
          </p>
        </div>

        {/* Input Section */}
        {appState === 'IDLE' && (
          <div className="mb-12">
            <FileUpload 
              onFileSelect={handleFileSelect} 
              selectedFile={file} 
              onClear={handleReset} 
            />
          </div>
        )}

        {/* Loading State */}
        <AnimatePresence>
          {appState === 'PROCESSING' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center mb-12"
            >
              <div className="flex items-center space-x-3 px-8 py-4 bg-white text-slate-600 rounded-2xl border border-slate-200 shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="font-medium">Reading file & processing...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Column Selection Section */}
        <AnimatePresence>
           {appState === 'COLUMN_SELECTION' && (
             <ColumnSelector 
                columns={availableColumns}
                selectedColumns={selectedColumns}
                onToggleColumn={handleToggleColumn}
                onProcess={handleProcess}
             />
           )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {appState === 'COMPLETED' && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-100/50 rounded-[2rem] p-8 md:p-10 border border-slate-200/60"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Processed Results</h2>
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <span className="bg-white px-3 py-1 rounded-full border border-slate-200">
                      {stats?.totalComposers} Composers
                    </span>
                    <span className="bg-white px-3 py-1 rounded-full border border-slate-200">
                      {stats?.totalRows} Rows
                    </span>
                    <span className="bg-white px-3 py-1 rounded-full border border-slate-200">
                      {stats?.processingTimeMs}ms
                    </span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button 
                    onClick={handleReset}
                    className="px-5 py-2.5 text-slate-600 font-medium hover:bg-white rounded-xl transition-colors"
                  >
                    Start Over
                  </button>
                  <button 
                    onClick={handleDownloadAllZip}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-md shadow-indigo-200 transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Download ZIP</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {processedData.map((composer, index) => (
                  <ComposerCard 
                    key={composer.composerName} 
                    data={composer} 
                    index={index} 
                    columns={selectedColumns} 
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;