
import { toast } from "sonner";

interface PopulationRecord {
  region_code: string;
  year: string;
  data_code: string;
  value: string;
}

export type IndicatorType = 'population' | 'industry';

export interface ProcessingResult {
  success: boolean;
  message: string;
  blobUrl?: string;
  previewData?: {
    headers: string[];
    rows: Record<string, string>[];
  };
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
 * Process multiple files and generate a CSV output with UTF-8-sig encoding
 */
export const processFiles = async (files: File[], indicatorType: IndicatorType = 'population'): Promise<ProcessingResult> => {
  try {
    if (!files.length) {
      return { success: false, message: 'No files provided' };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Determine the data_code filter based on the indicator type
    const dataCodeFilter = indicatorType === 'population' ? 'to_in_001' : 'to_fa_010';
    
    // Process each file and collect the records
    let allRecords: PopulationRecord[] = [];
    
    for (const file of files) {
      const content = await file.text();
      const records = parseFileContent(content);
      
      // Filter only rows with the appropriate data_code
      const filteredRecords = records.filter(record => record.data_code === dataCodeFilter);
      
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
    
    // For population indicators, analyze population decline patterns
    if (indicatorType === 'population') {
      analyzePopulationDecline(outputRows, sortedYears);
    }
    
    // Create CSV headers based on indicator type
    let basicHeaders = ['region_code', ...sortedYears.map(y => `year_${y}`)];
    let analysisHeaders: string[] = [];
    
    if (indicatorType === 'population') {
      analysisHeaders = ['DeclineRate', 'Decline_20pct', 'ConsecutiveDecline'];
    }
    
    const headers = [...basicHeaders, ...analysisHeaders];
    
    const csvContent = [
      headers.join(','),
      ...outputRows.map(row => {
        return headers.map(header => row[header] || '').join(',');
      })
    ].join('\n');
    
    // Create a Blob for the CSV content with UTF-8-sig BOM
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const textEncoder = new TextEncoder();
    const csvContentEncoded = textEncoder.encode(csvContent);
    
    // Combine BOM and CSV content
    const combinedArray = new Uint8Array(BOM.length + csvContentEncoded.length);
    combinedArray.set(BOM);
    combinedArray.set(csvContentEncoded, BOM.length);
    
    // Determine file name based on indicator type
    const fileName = indicatorType === 'population' 
      ? 'Population_Decline_Analysis.csv' 
      : 'Industry_Economy_Pivot.csv';
    
    // Create the Blob with the combined array and UTF-8 encoding
    const blob = new Blob([combinedArray], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Prepare preview data
    let previewHeaders: string[] = [];
    
    if (indicatorType === 'population') {
      previewHeaders = [
        'region_code', 
        ...sortedYears.map(year => year), 
        'Decline Rate', 
        'Decline ≥20%', 
        'Consecutive Decline'
      ];
    } else {
      previewHeaders = ['region_code', ...sortedYears.map(year => year)];
    }
    
    const previewData = {
      headers: previewHeaders,
      rows: outputRows.map(row => {
        const newRow: Record<string, string> = {
          region_code: row.region_code
        };
        
        // Add years data with visual indicators for population data
        sortedYears.forEach(year => {
          const yearKey = `year_${year}`;
          const value = row[yearKey] || '';
          
          if (indicatorType === 'population') {
            // Add visual indicators for population data
            if (row[`${yearKey}_isMax`] === 'true') {
              newRow[year] = `${value} ▲`;
            } else if (row[`${yearKey}_declining`] === 'true') {
              newRow[year] = `${value} ▼`;
            } else {
              newRow[year] = value;
            }
          } else {
            // No visual indicators for industry data
            newRow[year] = value;
          }
        });
        
        // Add analysis columns for population data
        if (indicatorType === 'population') {
          newRow['Decline Rate'] = row['DeclineRate'] || '';
          newRow['Decline ≥20%'] = row['Decline_20pct'] || '';
          newRow['Consecutive Decline'] = row['ConsecutiveDecline'] || '';
        }
        
        return newRow;
      })
    };
    
    // Simulate final processing
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      message: indicatorType === 'population' 
        ? 'Population decline analysis completed' 
        : 'Industry-Economy data processing completed',
      blobUrl,
      previewData
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
 * Analyze population decline patterns
 */
const analyzePopulationDecline = (outputRows: Record<string, string>[], sortedYears: string[]) => {
  outputRows.forEach(row => {
    // Convert population values to numbers
    const populationByYear = new Map<string, number>();
    let maxPopulation = 0;
    let maxYear = '';
    
    sortedYears.forEach(year => {
      const yearKey = `year_${year}`;
      const populationValue = parseFloat(row[yearKey] || '0');
      
      if (!isNaN(populationValue)) {
        populationByYear.set(year, populationValue);
        
        if (populationValue > maxPopulation) {
          maxPopulation = populationValue;
          maxYear = year;
        }
      }
    });
    
    // Mark the max year in the row data
    if (maxYear) {
      row[`year_${maxYear}_isMax`] = 'true';
    }
    
    // Get the most recent year with data
    const availableYears = sortedYears.filter(year => {
      const yearKey = `year_${year}`;
      return row[yearKey] && !isNaN(parseFloat(row[yearKey]));
    });
    
    const mostRecentYear = availableYears.length ? availableYears[availableYears.length - 1] : '';
    const mostRecentPopulation = mostRecentYear ? parseFloat(row[`year_${mostRecentYear}`] || '0') : 0;
    
    // Calculate decline rate from peak to most recent
    let declineRate = 0;
    if (maxPopulation > 0 && mostRecentPopulation > 0) {
      declineRate = ((mostRecentPopulation - maxPopulation) / maxPopulation) * 100;
    }
    
    // Check Decline Condition 1: 20% or more decrease from peak
    const hasDecline20Pct = declineRate <= -20;
    
    // Add the decline rate and decline condition results
    row['DeclineRate'] = declineRate.toFixed(2) + '%';
    row['Decline_20pct'] = hasDecline20Pct ? 'O' : '';
    
    // Check Decline Condition 2: 3+ consecutive years of decline
    let consecutiveDeclines = 0;
    let maxConsecutiveDeclines = 0;
    
    // Check the last 5 years (or all if less than 5)
    const recentYears = availableYears.slice(-5);
    
    for (let i = 1; i < recentYears.length; i++) {
      const currentYear = recentYears[i];
      const prevYear = recentYears[i-1];
      
      const currentPop = parseFloat(row[`year_${currentYear}`] || '0');
      const prevPop = parseFloat(row[`year_${prevYear}`] || '0');
      
      if (currentPop < prevPop) {
        consecutiveDeclines++;
        row[`year_${currentYear}_declining`] = 'true';
        
        if (consecutiveDeclines > maxConsecutiveDeclines) {
          maxConsecutiveDeclines = consecutiveDeclines;
        }
      } else {
        consecutiveDeclines = 0;
      }
    }
    
    // Mark if there are 3+ consecutive years of decline
    row['ConsecutiveDecline'] = maxConsecutiveDeclines >= 2 ? 'O' : '';
  });
};

/**
 * Trigger download of the processed data
 */
export const downloadResult = (blobUrl: string) => {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = blobUrl.includes('Population') 
    ? 'Population_Decline_Analysis.csv' 
    : 'Industry_Economy_Pivot.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
