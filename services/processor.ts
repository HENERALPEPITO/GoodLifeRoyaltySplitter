import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ProcessedComposerData, ProcessingStats, RawCsvRow } from '../types';

export const MANDATORY_COLUMN = "Song Composer(s)";

// Reference list of known composers
const KNOWN_COMPOSERS = [
  "Almos Balla",
  "MESHACH ANDRAWES",
  "FELIX SCHUBERT",
  "Utkarsh Vaishnav",
  "Fotis Mylonas",
  "Moises Abraham Monasterio",
  "Gustavo Dias Leffa",
  "Ion Purice",
  "Oybek Jabborov",
  "Anderson Santos de Paula",
  "Noel Ivan Montemayor",
  "Andrew Sho Neville",
  "Jesus Enrique Fernandez Sanchez",
  "Milton Sabas Martinez Santos",
  "Andres Romario Rubio Manzano",
  "LATIN HOUSE GANG",
  "Ian Michael Bernal Moreira",
  "Raul Ivan Garcia Marin",
  "Jesus Alberto Lopez Vazquez",
  "Norinobu Yu",
  "Jorge Pardo Cordero",
  "DMITRY BYSTROV"
];

const OUTLIERS_GROUP = "Good Life Composers Outliers";

// Column mapping from input to output
const COLUMN_MAPPING: { [key: string]: string } = {
  "Date From (MM/YYYY)": "Date From (MM/YYYY)",
  "Date To (MM/YYYY)": "Date To (MM/YYYY)",
  "Song Title": "TITLE",
  "Song Composer(s)": "COMPOSER",
  "Territory": "TERRITORY",
  "Exploitation Source Name": "SOURCE",
  "Usage Count": "COUNT",
  "Gross Amount": "GROSS AMOUNT",
  "Administration Amount": "ADMIN %",
  "Amount": "NET AMOUNT"
};

// Essential columns that should be selected by default
export const ESSENTIAL_COLUMNS = [
  "Date From (MM/YYYY)",
  "Date To (MM/YYYY)",
  "Song Title",
  "Song Composer(s)",
  "Territory",
  "Exploitation Source Name",
  "Usage Count",
  "Gross Amount",
  "Administration Amount",
  "Amount"
];

const normalizeFilename = (name: string): string => {
  return name.toLowerCase().replace(/ /g, "") + "_royalties.csv";
};

// Normalize text for comparison (remove accents, lowercase, trim)
const normalizeForComparison = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim();
};

// Find the actual composer name from a potentially messy string
const findActualComposer = (rawComposerText: string): string => {
  const normalized = normalizeForComparison(rawComposerText);
  
  // Try to find a match from known composers
  for (const knownComposer of KNOWN_COMPOSERS) {
    const normalizedKnown = normalizeForComparison(knownComposer);
    
    // Check if the known composer name appears in the raw text
    if (normalized.includes(normalizedKnown)) {
      return knownComposer; // Return the clean, known name
    }
  }
  
  // If no match found in known list, place in outliers
  return OUTLIERS_GROUP;
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
        // Get the raw composer text
        const rawComposer = row[MANDATORY_COLUMN];
        const rawComposerText = rawComposer ? String(rawComposer).trim() : "Unknown Composer";
        
        // Find the actual, normalized composer name
        const composer = findActualComposer(rawComposerText);
        
        if (!groupMap.has(composer)) {
          groupMap.set(composer, []);
        }

        // Filter columns and apply transformations
        const filteredRow: RawCsvRow = {};
        columnsToKeep.forEach(col => {
          const val = row[col];
          let cellValue = (val === null || val === undefined) ? "" : String(val);
          
          // Map column name for output
          const outputColumnName = COLUMN_MAPPING[col] || col;
          filteredRow[outputColumnName] = cellValue;
        });

        // Add ARTIST column (empty for now, can be filled later)
        filteredRow["ARTIST"] = "";

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

      // Sort: Outliers last, then alphabetically
      processedData.sort((a, b) => {
        if (a.composerName === OUTLIERS_GROUP) return 1;
        if (b.composerName === OUTLIERS_GROUP) return -1;
        return a.composerName.localeCompare(b.composerName);
      });

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
  // Map column names to output names and define the output order
  const outputOrder = [
    "Date From (MM/YYYY)",
    "Date To (MM/YYYY)", 
    "TITLE",
    "COMPOSER",
    "TERRITORY",
    "SOURCE",
    "COUNT",
    "GROSS AMOUNT",
    "ADMIN %",
    "NET AMOUNT",
    "ARTIST"
  ];
  
  return Papa.unparse(rows, {
    delimiter: "\t",
    header: true,
    columns: outputOrder
  });
};