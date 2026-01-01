import React, { useState } from 'react';
import { Download, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProcessedComposerData } from '../types';
import { generateCsvContentWithAdmin } from '../services/processor';

interface ComposerCardProps {
  data: ProcessedComposerData;
  index: number;
  columns: string[];
}

const ComposerCard: React.FC<ComposerCardProps> = ({ data, index, columns }) => {
  const [showModal, setShowModal] = useState(false);
  const [adminPercent, setAdminPercent] = useState('15');

  const handleDownload = () => {
    const percentage = parseFloat(adminPercent) || 0;
    const csvContent = generateCsvContentWithAdmin(data.rows, columns, percentage);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', data.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowModal(false);
  };

  return (
    <>
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
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-colors duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Select Admin %</span>
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full border border-slate-200"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Select Admin %</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-500 mb-6">
                Choose the administration percentage for <span className="font-semibold text-slate-800">{data.composerName}</span>
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Administration Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={adminPercent}
                    onChange={(e) => setAdminPercent(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-semibold">%</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                >
                  Download CSV
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ComposerCard;