import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { cn } from '../utils/cn';
import { MANDATORY_COLUMN } from '../services/processor';

interface ColumnSelectorProps {
  columns: string[];
  selectedColumns: string[];
  onToggleColumn: (col: string) => void;
  onProcess: () => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({ 
  columns, 
  selectedColumns, 
  onToggleColumn,
  onProcess 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm w-full max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Select Columns</h2>
        <p className="text-slate-500">
          Choose which columns to keep in the exported files. 
          <br />
          <span className="text-indigo-600 font-medium">{MANDATORY_COLUMN}</span> is required for grouping.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {columns.map((col) => {
          const isSelected = selectedColumns.includes(col);
          const isLocked = col === MANDATORY_COLUMN;

          return (
            <div 
              key={col}
              onClick={() => !isLocked && onToggleColumn(col)}
              className={cn(
                "flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                isLocked 
                  ? "bg-slate-50 border-slate-200 opacity-80 cursor-not-allowed" 
                  : isSelected 
                    ? "bg-blue-50 border-blue-200 shadow-sm" 
                    : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center mr-3 transition-colors",
                isSelected || isLocked ? "bg-blue-500 text-white" : "bg-slate-200 text-transparent"
              )}>
                {isLocked ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
              </div>
              <span className={cn(
                "text-sm font-medium truncate",
                isSelected ? "text-blue-900" : "text-slate-600"
              )}>
                {col}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-4 border-t border-slate-100">
        <button
          onClick={onProcess}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          Process Selected Columns
        </button>
      </div>
    </motion.div>
  );
};

export default ColumnSelector;