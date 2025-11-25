import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ProcessedComposerData, ProcessingStats, RawCsvRow } from '../types';

export const MANDATORY_COLUMN = "Song Composer(s)";

// Reference list of known composers
const KNOWN_COMPOSERS = [
  "Almos Balla",
  "Andrew Meschac",
  "Utkarsh Vaishnav",
  "Fotis Mylonas",
  "Moises Abraham Monasterio",
  "Gustavo Dias Leffa",
  "Ion Purice",
  "Oybek Jabborov",
  "Anderson Santos de Paula",
  "Noel Ivan Montemayor",
  "LATIN HOUSE GANG",
  "Andrew Sho Neville",
  "Jesus Enrique Fernandez Sanchez",
  "Milton Sabas Martinez Santos",
  "Andres Romario Rubio Manzano",
  "Ian Michael Bernal Moreira",
  "Raul Ivan Garcia Marin",
  "Jesus Alberto Lopez Vazquez",
  "Norinobu Yu",
  "Jorge Pardo Cordero"
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
  
  // If no match found in known list, try to extract the first name
  // Split by & or common separators and take the first meaningful part
  const parts = rawComposerText.split(/\s*&\s*/);
  if (parts.length > 0) {
    const firstPart = parts[0].trim();
    
    // Check if this first part matches any known composer (partial match)
    for (const knownComposer of KNOWN_COMPOSERS) {
      const normalizedKnown = normalizeForComparison(knownComposer);
      const normalizedFirst = normalizeForComparison(firstPart);
      
      if (normalizedKnown.includes(normalizedFirst) || normalizedFirst.includes(normalizedKnown)) {
        return knownComposer;
      }
    }
    
    return firstPart; // Return the first part if no match
  }
  
  return rawComposerText.trim() || "Unknown Composer";
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

        // Filter columns
        const filteredRow: RawCsvRow = {};
        columnsToKeep.forEach(col => {
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
  return Papa.unparse(rows, {
    delimiter: "\t",
    header: true,
    columns: columns
  });
};