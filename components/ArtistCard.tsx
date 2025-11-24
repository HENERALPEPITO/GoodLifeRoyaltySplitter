import React from 'react';
import { Download, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProcessedComposerData } from '../types';
import { generateCsvContent } from '../services/processor';

interface ComposerCardProps {
  data: ProcessedComposerData;
  index: number;
  columns: string[];
}

const ComposerCard: React.FC<ComposerCardProps> = ({ data, index, columns }) => {
  const handleDownload = () => {
    const csvContent = generateCsvContent(data.rows, columns);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', data.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 hover:translate-y-[-2px] transition-all duration-300 overflow-hidden flex flex-col"
    >
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <User className="w-5 h-5 text-indigo-500" />
          </div>
          <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
            {data.rowCount} rows
          </span>
        </div>
        
        <h3 className="font-bold text-slate-800 text-lg mb-1 truncate" title={data.composerName}>
          {data.composerName}
        </h3>
        <p className="text-xs text-slate-400 font-mono truncate">
          {data.filename}
        </p>
      </div>

      <div className="bg-slate-50/50 p-3 border-t border-slate-100">
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-colors duration-200"
        >
          <Download className="w-4 h-4" />
          <span>Download CSV</span>
        </button>
      </div>
    </motion.div>
  );
};

export default ComposerCard;