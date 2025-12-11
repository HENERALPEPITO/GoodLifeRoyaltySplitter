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

// Normalize text for comparison (remove accents, lowercase, trim, remove special chars)
const normalizeForComparison = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Find the actual composer name from a potentially messy string
const findActualComposer = (rawComposerText: string): string => {
  const normalized = normalizeForComparison(rawComposerText);
  
  // Try to find a match from known composers
  for (const knownComposer of KNOWN_COMPOSERS) {
    const normalizedKnown = normalizeForComparison(knownComposer);
    
    // Check if the known composer name appears in the raw text
    // This handles cases like "Goodlife Fotis Mylonas" matching "Fotis Mylonas"
    if (normalized.includes(normalizedKnown)) {
      return knownComposer; // Return the clean, standardized name
    }
  }
  
  // If no match found in known list, place in outliers
  return OUTLIERS_GROUP;
};

// Detect CSV delimiter by analyzing the first few lines
const detectDelimiter = (text: string): string => {
  const firstLines = text.split('\n').slice(0, 3).join('\n');
  const semicolonCount = (firstLines.match(/;/g) || []).length;
  const commaCount = (firstLines.match(/,/g) || []).length;
  
  // If semicolons are more common, it's likely European format
  return semicolonCount > commaCount ? ';' : ',';
};

// Convert European number format (comma as decimal) to standard format (dot as decimal)
const normalizeNumber = (value: string): string => {
  if (typeof value !== 'string') return value;
  
  // Check if it looks like a European number (has comma as decimal separator)
  // Examples: "1.234,56" or "1234,56"
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(value.trim())) {
    // European format: remove thousand separators (dots), replace comma with dot
    return value.replace(/\./g, '').replace(',', '.');
  }
  
  return value;
};

// Helper to read file to raw data
export const parseFileToRawData = (file: File): Promise<{ headers: string[], data: RawCsvRow[] }> => {
  return new Promise((resolve, reject) => {
    const isCsv = file.name.endsWith('.csv');

    if (isCsv) {
      // Read file as text first to detect delimiter
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const delimiter = detectDelimiter(text);
        
        Papa.parse<RawCsvRow>(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: delimiter,
          dynamicTyping: false, // Keep as strings to handle European numbers
          complete: (results) => {
            if (results.meta.fields) {
              // Normalize number formats in the data
              const normalizedData = results.data.map(row => {
                const normalizedRow: RawCsvRow = {};
                Object.keys(row).forEach(key => {
                  const value = row[key];
                  // Normalize numbers in amount/count columns
                  if (key.toLowerCase().includes('amount') || 
                      key.toLowerCase().includes('count') ||
                      key.toLowerCase().includes('gross')) {
                    normalizedRow[key] = normalizeNumber(String(value));
                  } else {
                    normalizedRow[key] = value;
                  }
                });
                return normalizedRow;
              });
              
              resolve({ headers: results.meta.fields, data: normalizedData });
            } else {
              reject(new Error("Could not detect headers in CSV file."));
            }
          },
          error: (error) => reject(error)
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    } else {
      // Handle XLSX
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json<RawCsvRow>(worksheet, { 
            defval: "",
            raw: false // Get formatted strings to preserve number formatting
          });
          
          if (jsonData.length > 0) {
            const headers = Object.keys(jsonData[0]);
            
            // Normalize number formats
            const normalizedData = jsonData.map(row => {
              const normalizedRow: RawCsvRow = {};
              Object.keys(row).forEach(key => {
                const value = row[key];
                if (key.toLowerCase().includes('amount') || 
                    key.toLowerCase().includes('count') ||
                    key.toLowerCase().includes('gross')) {
                  normalizedRow[key] = normalizeNumber(String(value));
                } else {
                  normalizedRow[key] = value;
                }
              });
              return normalizedRow;
            });
            
            resolve({ headers, data: normalizedData });
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
          
          // Replace the composer field with the standardized name
          if (outputColumnName === "COMPOSER") {
            filteredRow[outputColumnName] = composer;
          } else {
            filteredRow[outputColumnName] = cellValue;
          }
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