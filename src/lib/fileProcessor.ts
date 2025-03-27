
// This is a client-side simulation of file processing
// In a real implementation, this would be handled by a server with Python/Pandas

import { toast } from "sonner";

interface PopulationRecord {
  region_code: string;
  year: string;
  data_code: string;
  value: string;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  blobUrl?: string;
}

/**
 * Parse the contents of a population data file
 */
const parseFileContent = (content: string): PopulationRecord[] => {
  // Split the content by lines and filter out empty lines
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Parse each line into a record
  return lines.map(line => {
    const parts = line.split('^');
    return {
      year: parts[0] || '',
      region_code: parts[1] || '',
      data_code: parts[2] || '',
      value: parts[3] || ''
    };
  });
};

/**
 * Process multiple files and generate an Excel-like CSV output
 */
export const processFiles = async (files: File[]): Promise<ProcessingResult> => {
  try {
    if (!files.length) {
      return { success: false, message: 'No files provided' };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Process each file and collect the records
    let allRecords: PopulationRecord[] = [];
    
    for (const file of files) {
      const content = await file.text();
      const records = parseFileContent(content);
      
      // Filter only rows with data_code = to_in_001
      const filteredRecords = records.filter(record => record.data_code === 'to_in_001');
      
      allRecords = [...allRecords, ...filteredRecords];
      
      // Simulate incremental processing
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Create a map to organize data by region_code and year
    const pivotMap = new Map<string, Record<string, string>>();
    const years = new Set<string>();
    
    // Populate the map and collect unique years
    allRecords.forEach(record => {
      const key = record.region_code;
      years.add(record.year);
      
      if (!pivotMap.has(key)) {
        pivotMap.set(key, {
          region_code: record.region_code
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
    const headers = ['region_code', ...sortedYears.map(y => `year_${y}`)];
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
  link.download = 'Combined_Population_by_Region.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
