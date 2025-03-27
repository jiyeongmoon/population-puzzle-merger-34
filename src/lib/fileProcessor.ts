
// This is a client-side simulation of file processing
// In a real implementation, this would be handled by a server with Python/Pandas

import { toast } from "sonner";

interface PopulationRecord {
  code: string;
  var: string;
  value: string;
  year: string;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  blobUrl?: string;
}

/**
 * Parse the contents of a population data file
 */
const parseFileContent = (content: string, year: string): PopulationRecord[] => {
  // Split the content by lines and filter out empty lines
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Parse each line into a record
  return lines.map(line => {
    const parts = line.split('^');
    return {
      code: parts[0] || '',
      var: parts[1] || '',
      value: parts[2] || '',
      year
    };
  });
};

/**
 * Extract the year from a filename using regex
 */
const extractYearFromFilename = (filename: string): string => {
  const yearMatch = filename.match(/\d{4}/);
  return yearMatch ? yearMatch[0] : 'Unknown';
};

/**
 * Process multiple files and generate an Excel-like CSV output
 */
export const processFiles = async (files: File[]): Promise<ProcessingResult> => {
  try {
    if (!files.length) {
      return { success: false, message: 'No files provided' };
    }

    // Sort files by year for processing
    const sortedFiles = [...files].sort((a, b) => {
      const yearA = extractYearFromFilename(a.name);
      const yearB = extractYearFromFilename(b.name);
      return yearA.localeCompare(yearB);
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Process each file and collect the records
    let allRecords: PopulationRecord[] = [];
    
    for (const file of sortedFiles) {
      const content = await file.text();
      const year = extractYearFromFilename(file.name);
      
      if (year === 'Unknown') {
        toast.error(`Could not extract year from file: ${file.name}`);
        continue;
      }
      
      const records = parseFileContent(content, year);
      allRecords = [...allRecords, ...records];
      
      // Simulate incremental processing
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Create a map to organize data by code and variable
    const pivotMap = new Map<string, Record<string, string>>();
    const years = new Set<string>();
    
    // Populate the map and collect unique years
    allRecords.forEach(record => {
      const key = `${record.code}-${record.var}`;
      years.add(record.year);
      
      if (!pivotMap.has(key)) {
        pivotMap.set(key, {
          code: record.code,
          var: record.var
        });
      }
      
      const entry = pivotMap.get(key);
      if (entry) {
        entry[`year_${record.year}`] = record.value;
      }
    });
    
    // Convert map to array for output
    const outputRows = Array.from(pivotMap.values());
    
    // Sort years for column headers
    const sortedYears = Array.from(years).sort();
    
    // Create CSV header
    const headers = ['code', 'var', ...sortedYears.map(y => `year_${y}`)];
    const csvContent = [
      headers.join(','),
      ...outputRows.map(row => {
        return headers.map(header => row[header] || '').join(',');
      })
    ].join('\n');
    
    // Create a Blob for the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Simulate final processing
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      message: 'Files processed successfully',
      blobUrl
    };
    
  } catch (error) {
    console.error('Error processing files:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Trigger download of the processed data
 */
export const downloadResult = (blobUrl: string) => {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'Combined_Population_Data.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
