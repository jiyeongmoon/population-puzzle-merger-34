
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface DataRecord {
  region_code: string;
  year: string;
  data_code: string;
  value: string;
}

export type IndicatorType = 'population' | 'industry' | 'environment' | 'summary';

export interface ProcessingResult {
  success: boolean;
  message: string;
  blobUrl?: string;
  previewData?: {
    headers: string[];
    rows: Record<string, string>[];
  };
  excelBlob?: Blob;
}

// Store processed data globally to use for the summary
let processedData = {
  population: null as Record<string, string>[] | null,
  industry: null as Record<string, string>[] | null,
  environment: null as Record<string, string>[] | null
};

/**
 * Parse the contents of a data file
 */
const parseFileContent = (content: string): DataRecord[] => {
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

    if (indicatorType === 'summary') {
      return processAllIndicators();
    }

    // Determine the data_code filter based on the indicator type
    let dataCodeFilter = '';
    if (indicatorType === 'population') {
      dataCodeFilter = 'to_in_001';
    } else if (indicatorType === 'industry') {
      dataCodeFilter = 'to_fa_010';
    }
    
    // Process each file and collect the records
    let allRecords: DataRecord[] = [];
    
    for (const file of files) {
      const content = await file.text();
      const records = parseFileContent(content);
      
      // Apply specific filtering based on indicator type
      let filteredRecords;
      if (indicatorType === 'environment') {
        // For environment, filter records for 2023 and the specific building age data codes
        filteredRecords = records.filter(record => 
          record.year === '2023' && 
          record.data_code.startsWith('ho_yr_')
        );
      } else {
        // For population and industry, filter by the specific data_code
        filteredRecords = records.filter(record => record.data_code === dataCodeFilter);
      }
      
      allRecords = [...allRecords, ...filteredRecords];
      
      // Simulate incremental processing
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Create a map to organize data by region_code and year
    const pivotMap = new Map<string, Record<string, string>>();
    const years = new Set<string>();
    
    // Handle data differently based on indicator type
    if (indicatorType === 'environment') {
      return processEnvironmentData(allRecords);
    } else {
      // For population and industry, populate the map and collect unique years
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
      
      // Analyze data based on indicator type
      if (indicatorType === 'population') {
        analyzePopulationDecline(outputRows, sortedYears);
        // Store for summary
        processedData.population = outputRows;
      } else if (indicatorType === 'industry') {
        analyzeBusinessDecline(outputRows, sortedYears);
        // Store for summary
        processedData.industry = outputRows;
      }
      
      // Create CSV headers based on indicator type
      let basicHeaders = ['region_code', ...sortedYears.map(y => `year_${y}`)];
      let analysisHeaders: string[] = [];
      
      if (indicatorType === 'population') {
        analysisHeaders = ['DeclineRate', 'Decline_20pct', 'ConsecutiveDecline'];
      } else if (indicatorType === 'industry') {
        analysisHeaders = ['BusinessDeclineRate', 'BusinessDeclineOver5%', 'BusinessConsecDecline'];
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
      const fileName = getFileNameByIndicator(indicatorType);
      
      // Create the Blob with the combined array and UTF-8 encoding
      const blob = new Blob([combinedArray], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Prepare Excel file
      const excelBlob = await createExcelFile(outputRows, sortedYears, indicatorType);
      
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
        previewHeaders = [
          'region_code', 
          ...sortedYears.map(year => year), 
          'Decline Rate', 
          'Decline ≥5%', 
          'Consec. Decline'
        ];
      }
      
      const previewData = {
        headers: previewHeaders,
        rows: outputRows.map(row => {
          const newRow: Record<string, string> = {
            region_code: row.region_code
          };
          
          // Add years data with visual indicators
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
            } else if (indicatorType === 'industry') {
              // Add visual indicators for industry data
              if (row[`${yearKey}_isMax`] === 'true') {
                newRow[year] = `${value} ★`;
              } else if (row[`${yearKey}_declining`] === 'true') {
                newRow[year] = `${value} ▼`;
              } else {
                newRow[year] = value;
              }
            } else {
              // No visual indicators for other data types
              newRow[year] = value;
            }
          });
          
          // Add analysis columns for population data
          if (indicatorType === 'population') {
            newRow['Decline Rate'] = row['DeclineRate'] || '';
            newRow['Decline ≥20%'] = row['Decline_20pct'] || '';
            newRow['Consecutive Decline'] = row['ConsecutiveDecline'] || '';
          } else if (indicatorType === 'industry') {
            // Add analysis columns for industry data
            newRow['Decline Rate'] = row['BusinessDeclineRate'] || '';
            newRow['Decline ≥5%'] = row['BusinessDeclineOver5%'] || '';
            newRow['Consec. Decline'] = row['BusinessConsecDecline'] || '';
          }
          
          return newRow;
        })
      };
      
      // Simulate final processing
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        message: getSuccessMessageByIndicator(indicatorType),
        blobUrl,
        previewData,
        excelBlob
      };
    }
  } catch (error) {
    console.error('Error processing files:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Process environment data for building age
 */
const processEnvironmentData = async (records: DataRecord[]): Promise<ProcessingResult> => {
  try {
    // Group records by region_code
    const regionMap = new Map<string, DataRecord[]>();
    
    records.forEach(record => {
      if (!regionMap.has(record.region_code)) {
        regionMap.set(record.region_code, []);
      }
      regionMap.get(record.region_code)?.push(record);
    });
    
    // Calculate building age statistics for each region
    const outputRows: Record<string, string>[] = [];
    
    regionMap.forEach((regionRecords, regionCode) => {
      let totalBuildings = 0;
      let oldBuildings = 0;
      
      // Calculate total buildings (sum of all values)
      regionRecords.forEach(record => {
        const value = parseInt(record.value, 10);
        if (!isNaN(value)) {
          totalBuildings += value;
          
          // Check if this is an old building (built before 2005)
          // ho_yr_001 ~ ho_yr_004 correspond to buildings built before 2005
          if (['ho_yr_001', 'ho_yr_002', 'ho_yr_003', 'ho_yr_004'].includes(record.data_code)) {
            oldBuildings += value;
          }
        }
      });
      
      // Calculate percentage of old buildings
      const oldBuildingPercentage = totalBuildings > 0 
        ? (oldBuildings / totalBuildings) * 100 
        : 0;
      
      // Determine if the region meets the criterion (>= 50% old buildings)
      const meetsOldBuildingCriterion = oldBuildingPercentage >= 50;
      
      // Create a row for this region
      outputRows.push({
        region_code: regionCode,
        total_buildings: totalBuildings.toString(),
        old_buildings: oldBuildings.toString(),
        old_building_percentage: oldBuildingPercentage.toFixed(2) + '%',
        old_building_criterion: meetsOldBuildingCriterion ? 'O' : 'X'
      });
    });
    
    // Store environment data for summary
    processedData.environment = outputRows;
    
    // Create headers for CSV and preview
    const headers = [
      'region_code', 
      'total_buildings', 
      'old_buildings', 
      'old_building_percentage', 
      'old_building_criterion'
    ];
    
    // Create CSV content
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
    
    // Create the Blob
    const blob = new Blob([combinedArray], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Create Excel file
    const excelBlob = await createEnvironmentExcelFile(outputRows);
    
    // Prepare preview data
    const previewHeaders = [
      'Region Code', 
      'Total Buildings', 
      'Old Buildings (20+ years)', 
      'Old Building %', 
      'Old Buildings ≥50%'
    ];
    
    const previewData = {
      headers: previewHeaders,
      rows: outputRows.map(row => ({
        'Region Code': row.region_code,
        'Total Buildings': row.total_buildings,
        'Old Buildings (20+ years)': row.old_buildings,
        'Old Building %': row.old_building_percentage,
        'Old Buildings ≥50%': row.old_building_criterion
      }))
    };
    
    return {
      success: true,
      message: 'Physical environment analysis completed',
      blobUrl,
      previewData,
      excelBlob
    };
  } catch (error) {
    console.error('Error processing environment data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Process all three indicators and create a summary
 */
const processAllIndicators = async (): Promise<ProcessingResult> => {
  try {
    // Check if all indicators have been processed
    if (!processedData.population || !processedData.industry || !processedData.environment) {
      return {
        success: false,
        message: 'Please process all three indicators before generating a summary'
      };
    }
    
    // Create a map of regions with their decline indicators
    const summaryMap = new Map<string, {
      region_code: string;
      population_decline: string;
      industry_decline: string;
      environment_decline: string;
      criteria_met: number;
    }>();
    
    // Add population data
    processedData.population.forEach(row => {
      const regionCode = row.region_code;
      summaryMap.set(regionCode, {
        region_code: regionCode,
        population_decline: row.Decline_20pct || 'X',
        industry_decline: 'X',
        environment_decline: 'X',
        criteria_met: (row.Decline_20pct === 'O') ? 1 : 0
      });
    });
    
    // Add industry data
    processedData.industry.forEach(row => {
      const regionCode = row.region_code;
      if (summaryMap.has(regionCode)) {
        const summary = summaryMap.get(regionCode)!;
        summary.industry_decline = row.BusinessDeclineOver5% || 'X';
        if (row.BusinessDeclineOver5% === 'O') {
          summary.criteria_met += 1;
        }
      } else {
        summaryMap.set(regionCode, {
          region_code: regionCode,
          population_decline: 'X',
          industry_decline: row.BusinessDeclineOver5% || 'X',
          environment_decline: 'X',
          criteria_met: (row.BusinessDeclineOver5% === 'O') ? 1 : 0
        });
      }
    });
    
    // Add environment data
    processedData.environment.forEach(row => {
      const regionCode = row.region_code;
      if (summaryMap.has(regionCode)) {
        const summary = summaryMap.get(regionCode)!;
        summary.environment_decline = row.old_building_criterion || 'X';
        if (row.old_building_criterion === 'O') {
          summary.criteria_met += 1;
        }
      } else {
        summaryMap.set(regionCode, {
          region_code: regionCode,
          population_decline: 'X',
          industry_decline: 'X',
          environment_decline: row.old_building_criterion || 'X',
          criteria_met: (row.old_building_criterion === 'O') ? 1 : 0
        });
      }
    });
    
    // Create summary rows, filtering for regions with at least 2 criteria met
    const summaryRows = Array.from(summaryMap.values())
      .filter(summary => summary.criteria_met >= 2)
      .sort((a, b) => b.criteria_met - a.criteria_met);
    
    // Create headers for CSV and preview
    const headers = [
      'region_code',
      'population_decline',
      'industry_decline',
      'environment_decline',
      'criteria_met'
    ];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...summaryRows.map(row => {
        return headers.map(header => row[header as keyof typeof row].toString()).join(',');
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
    
    // Create the Blob
    const blob = new Blob([combinedArray], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Create Excel file with all sheets
    const excelBlob = await createSummaryExcelFile(
      processedData.population || [],
      processedData.industry || [],
      processedData.environment || [],
      summaryRows
    );
    
    // Prepare preview data
    const previewHeaders = [
      'Region Code',
      'Population Decline',
      'Industry Decline',
      'Environment Decline',
      'Criteria Met'
    ];
    
    const previewData = {
      headers: previewHeaders,
      rows: summaryRows.map(row => ({
        'Region Code': row.region_code,
        'Population Decline': row.population_decline,
        'Industry Decline': row.industry_decline,
        'Environment Decline': row.environment_decline,
        'Criteria Met': row.criteria_met.toString()
      }))
    };
    
    return {
      success: true,
      message: 'Summary analysis completed',
      blobUrl,
      previewData,
      excelBlob
    };
  } catch (error) {
    console.error('Error creating summary:', error);
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
    row['Decline_20pct'] = hasDecline20Pct ? 'O' : 'X';
    
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
    row['ConsecutiveDecline'] = maxConsecutiveDeclines >= 2 ? 'O' : 'X';
  });
};

/**
 * Analyze business decline patterns
 */
const analyzeBusinessDecline = (outputRows: Record<string, string>[], sortedYears: string[]) => {
  outputRows.forEach(row => {
    // Convert business values to numbers
    const valuesByYear = new Map<string, number>();
    let maxValue = 0;
    let maxYear = '';
    
    // Only consider the last 10 years for max value calculation
    const recentYears = sortedYears.slice(-10);
    
    recentYears.forEach(year => {
      const yearKey = `year_${year}`;
      const value = parseFloat(row[yearKey] || '0');
      
      if (!isNaN(value)) {
        valuesByYear.set(year, value);
        
        if (value > maxValue) {
          maxValue = value;
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
    const mostRecentValue = mostRecentYear ? parseFloat(row[`year_${mostRecentYear}`] || '0') : 0;
    
    // Calculate decline rate from peak to most recent (within last 10 years)
    let declineRate = 0;
    if (maxValue > 0 && mostRecentValue > 0 && maxYear !== mostRecentYear) {
      declineRate = ((mostRecentValue - maxValue) / maxValue) * 100;
    }
    
    // Check Decline Condition 1: 5% or more decrease from peak
    const hasDecline5Pct = declineRate <= -5;
    
    // Add the decline rate and decline condition results
    row['BusinessDeclineRate'] = declineRate.toFixed(2) + '%';
    row['BusinessDeclineOver5%'] = hasDecline5Pct ? 'O' : 'X';
    
    // Check Decline Condition 2: 3+ consecutive years of decline
    let consecutiveDeclines = 0;
    let maxConsecutiveDeclines = 0;
    
    // Check the last 5 years (or all if less than 5)
    const recent5Years = availableYears.slice(-5);
    
    for (let i = 1; i < recent5Years.length; i++) {
      const currentYear = recent5Years[i];
      const prevYear = recent5Years[i-1];
      
      const currentVal = parseFloat(row[`year_${currentYear}`] || '0');
      const prevVal = parseFloat(row[`year_${prevYear}`] || '0');
      
      if (currentVal < prevVal) {
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
    row['BusinessConsecDecline'] = maxConsecutiveDeclines >= 2 ? 'O' : 'X';
  });
};

/**
 * Create an Excel file for a single indicator
 */
const createExcelFile = async (
  data: Record<string, string>[],
  years: string[],
  indicatorType: IndicatorType
): Promise<Blob> => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to format suitable for Excel
  const excelData = data.map(row => {
    const excelRow: Record<string, string | number> = {
      region_code: row.region_code
    };
    
    // Add year data
    years.forEach(year => {
      const yearKey = `year_${year}`;
      const value = row[yearKey];
      
      if (value) {
        // Try to convert to number if possible
        const numValue = parseFloat(value);
        excelRow[year] = isNaN(numValue) ? value : numValue;
      } else {
        excelRow[year] = '';
      }
    });
    
    // Add analysis data
    if (indicatorType === 'population') {
      excelRow['Decline Rate'] = row['DeclineRate'] || '';
      excelRow['Decline ≥20%'] = row['Decline_20pct'] || '';
      excelRow['Consecutive Decline'] = row['ConsecutiveDecline'] || '';
    } else if (indicatorType === 'industry') {
      excelRow['Decline Rate'] = row['BusinessDeclineRate'] || '';
      excelRow['Decline ≥5%'] = row['BusinessDeclineOver5%'] || '';
      excelRow['Consecutive Decline'] = row['BusinessConsecDecline'] || '';
    }
    
    return excelRow;
  });
  
  // Create a worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Add worksheet to workbook
  const sheetName = getSheetNameByIndicator(indicatorType);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Convert to Blob
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Create an Excel file for the environment indicator
 */
const createEnvironmentExcelFile = async (data: Record<string, string>[]): Promise<Blob> => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to format suitable for Excel
  const excelData = data.map(row => ({
    region_code: row.region_code,
    'Total Buildings': parseInt(row.total_buildings) || 0,
    'Old Buildings (20+ years)': parseInt(row.old_buildings) || 0,
    'Old Building %': row.old_building_percentage,
    'Old Buildings ≥50%': row.old_building_criterion
  }));
  
  // Create a worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Physical Environment');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Convert to Blob
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Create a comprehensive Excel file with all sheets
 */
const createSummaryExcelFile = async (
  populationData: Record<string, string>[],
  industryData: Record<string, string>[],
  environmentData: Record<string, string>[],
  summaryData: any[]
): Promise<Blob> => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Create summary worksheet
  const summaryExcelData = summaryData.map(row => ({
    'Region Code': row.region_code,
    'Population Decline': row.population_decline,
    'Industry Decline': row.industry_decline,
    'Environment Decline': row.environment_decline,
    'Criteria Met': row.criteria_met
  }));
  
  const summaryWs = XLSX.utils.json_to_sheet(summaryExcelData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  
  // Add all indicator data (simplified for now)
  // In a full implementation, you would format each sheet with proper columns
  
  // Add population data
  if (populationData.length) {
    const popWs = XLSX.utils.json_to_sheet(populationData);
    XLSX.utils.book_append_sheet(wb, popWs, 'Population');
  }
  
  // Add industry data
  if (industryData.length) {
    const indWs = XLSX.utils.json_to_sheet(industryData);
    XLSX.utils.book_append_sheet(wb, indWs, 'Industry');
  }
  
  // Add environment data
  if (environmentData.length) {
    const envWs = XLSX.utils.json_to_sheet(environmentData);
    XLSX.utils.book_append_sheet(wb, envWs, 'Environment');
  }
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Convert to Blob
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Get file name based on indicator type
 */
const getFileNameByIndicator = (indicatorType: IndicatorType): string => {
  switch (indicatorType) {
    case 'population':
      return 'Population_Decline_Analysis.csv';
    case 'industry':
      return 'Industry_Economy_Analysis.csv';
    case 'environment':
      return 'Physical_Environment_Analysis.csv';
    case 'summary':
      return 'Regional_Decline_Summary.csv';
    default:
      return 'Analysis_Result.csv';
  }
};

/**
 * Get sheet name based on indicator type
 */
const getSheetNameByIndicator = (indicatorType: IndicatorType): string => {
  switch (indicatorType) {
    case 'population':
      return 'Population Decline';
    case 'industry':
      return 'Industry Economy';
    case 'environment':
      return 'Physical Environment';
    case 'summary':
      return 'Summary';
    default:
      return 'Analysis Result';
  }
};

/**
 * Get success message based on indicator type
 */
const getSuccessMessageByIndicator = (indicatorType: IndicatorType): string => {
  switch (indicatorType) {
    case 'population':
      return 'Population decline analysis completed';
    case 'industry':
      return 'Industry-Economy decline analysis completed';
    case 'environment':
      return 'Physical-Environment analysis completed';
    case 'summary':
      return 'Summary analysis completed';
    default:
      return 'Analysis completed successfully';
  }
};

/**
 * Trigger download of the processed data
 */
export const downloadResult = (blobUrl: string) => {
  const link = document.createElement('a');
  link.href = blobUrl;
  
  // Determine file name based on indicator type in the URL
  if (blobUrl.includes('Population')) {
    link.download = 'Population_Decline_Analysis.csv';
  } else if (blobUrl.includes('Industry')) {
    link.download = 'Industry_Economy_Analysis.csv';
  } else if (blobUrl.includes('Physical')) {
    link.download = 'Physical_Environment_Analysis.csv';
  } else if (blobUrl.includes('Summary')) {
    link.download = 'Regional_Decline_Summary.xlsx';
  } else {
    link.download = 'Analysis_Result.csv';
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Download Excel file
 */
export const downloadExcel = (blob: Blob, fileName: string = 'Regional_Decline_Analysis.xlsx') => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
