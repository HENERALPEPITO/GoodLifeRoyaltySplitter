import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ProcessedComposerData, ProcessingStats, RawCsvRow } from '../types';

export const MANDATORY_COLUMN = "Song Composer(s)";

const normalizeFilename = (name: string): string => {
  return name.toLowerCase().replace(/ /g, "") + "_royalties.csv";
};

// Helper to read file to raw data
export const parseFileToRawData = (file: File): Promise<{ headers: string[], data: RawCsvRow[] }> => {
  return new Promise((resolve, reject) => {
    const isCsv = file.name.endsWith('.csv');

    if (isCsv) {
      Papa.parse<RawCsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            resolve({ headers: results.meta.fields, data: results.data });
          } else {
            reject(new Error("Could not detect headers in CSV file."));
          }
        },
        error: (error) => reject(error)
      });
    } else {
      // Handle XLSX
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // raw: false ensures everything is treated as text/general to avoid date parsing issues initially
          const jsonData = XLSX.utils.sheet_to_json<RawCsvRow>(worksheet, { defval: "" });
          
          if (jsonData.length > 0) {
            const headers = Object.keys(jsonData[0]);
            resolve({ headers, data: jsonData });
          } else {
            reject(new Error("Excel file appears to be empty."));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    }
  });
};

export const processRawData = (
  rawData: RawCsvRow[], 
  columnsToKeep: string[]
): Promise<{ data: ProcessedComposerData[], stats: ProcessingStats }> => {
  return new Promise((resolve, reject) => {
    try {
      const startTime = performance.now();
      const groupMap = new Map<string, RawCsvRow[]>();

      rawData.forEach((row) => {
        // Group by Song Composer(s)
        // We cast to string to handle potential numbers from Excel parsing
        const rawComposer = row[MANDATORY_COLUMN];
        const composer = rawComposer ? String(rawComposer).trim() : "Unknown Composer";
        
        if (!groupMap.has(composer)) {
          groupMap.set(composer, []);
        }

        // Filter columns
        const filteredRow: RawCsvRow = {};
        columnsToKeep.forEach(col => {
          // Handle potential missing values or type mismatches
          const val = row[col];
          filteredRow[col] = (val === null || val === undefined) ? "" : String(val);
        });

        groupMap.get(composer)?.push(filteredRow);
      });

      // Convert Map to Array
      const processedData: ProcessedComposerData[] = Array.from(groupMap.entries()).map(([composerName, rows]) => {
        return {
          composerName,
          filename: normalizeFilename(composerName),
          rows,
          rowCount: rows.length
        };
      });

      // Sort alphabetically by composer for better UX
      processedData.sort((a, b) => a.composerName.localeCompare(b.composerName));

      const endTime = performance.now();
      
      resolve({
        data: processedData,
        stats: {
          totalRows: rawData.length,
          totalComposers: processedData.length,
          processingTimeMs: Math.round(endTime - startTime)
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const generateCsvContent = (rows: RawCsvRow[], columns: string[]): string => {
  // Use PapaParse unparse to create tab-separated content
  return Papa.unparse(rows, {
    delimiter: "\t",
    header: true,
    columns: columns
  });
};