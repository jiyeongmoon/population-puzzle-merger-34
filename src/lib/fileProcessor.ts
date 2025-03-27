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

// Add the missing download functions 
export const downloadResult = (blobUrl: string) => {
  if (!blobUrl) return;
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'analysis_result.csv';
  document.body.appendChild(link);
  
  // Trigger download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
};

export const downloadExcel = (blob: Blob, fileName: string = 'analysis_result.xlsx') => {
  if (!blob) return;
  
  // Create a URL for the blob
  const blobUrl = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  
  // Trigger download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
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
    // Special case for summary - don't require files
    if (indicatorType === 'summary') {
      return processAllIndicators();
    }
    
    // For non-summary indicators, files are required
    if (!files.length) {
      return { success: false, message: 'No files provided' };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

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
                newRow[year] = `${value} ★`;
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
    
    // Create a map of all regions from all three datasets
    const regionsMap = new Map<string, {
      region_code: string;
      // Population criteria
      population_decline_rate_pct: string;
      population_decline_rate: string;
      population_consecutive_decline: string;
      population_category_met: string;
      // Industry criteria
      industry_decline_rate_pct: string;
      industry_decline_rate: string;
      industry_consecutive_decline: string;
      industry_category_met: string;
      // Environment criteria
      environment_old_building_pct: string;
      environment_old_building: string;
      environment_category_met: string;
      // Total categories met
      total_categories_met: number;
    }>();
    
    // Add all regions from population data
    processedData.population.forEach(row => {
      const regionCode = row.region_code;
      const populationDeclineRatePct = row.DeclineRate || '0%';
      const populationDeclineRate = row.Decline_20pct || 'X';
      const populationConsecutiveDecline = row.ConsecutiveDecline || 'X';
      
      // Check if population category is met
      const populationCategoryMet = (populationDeclineRate === 'O' || populationConsecutiveDecline === 'O') ? 'O' : 'X';
      
      regionsMap.set(regionCode, {
        region_code: regionCode,
        population_decline_rate_pct: populationDeclineRatePct,
        population_decline_rate: populationDeclineRate,
        population_consecutive_decline: populationConsecutiveDecline,
        population_category_met: populationCategoryMet,
        industry_decline_rate_pct: '0%',
        industry_decline_rate: 'X',
        industry_consecutive_decline: 'X',
        industry_category_met: 'X',
        environment_old_building_pct: '0%',
        environment_old_building: 'X',
        environment_category_met: 'X',
        total_categories_met: populationCategoryMet === 'O' ? 1 : 0
      });
    });
    
    // Add/update regions from industry data
    processedData.industry.forEach(row => {
      const regionCode = row.region_code;
      const industryDeclineRatePct = row.BusinessDeclineRate || '0%';
      const industryDeclineRate = row["BusinessDeclineOver5%"] || 'X';
      const industryConsecutiveDecline = row.BusinessConsecDecline || 'X';
      
      // Check if industry category is met
      const industryCategoryMet = (industryDeclineRate === 'O' || industryConsecutiveDecline === 'O') ? 'O' : 'X';
      
      if (regionsMap.has(regionCode)) {
        // Update existing region
        const regionData = regionsMap.get(regionCode)!;
        regionData.industry_decline_rate_pct = industryDeclineRatePct;
        regionData.industry_decline_rate = industryDeclineRate;
        regionData.industry_consecutive_decline = industryConsecutiveDecline;
        regionData.industry_category_met = industryCategoryMet;
        
        // Update total categories met
        if (industryCategoryMet === 'O') {
          regionData.total_categories_met += 1;
        }
      } else {
        // Add new region
        regionsMap.set(regionCode, {
          region_code: regionCode,
          population_decline_rate_pct: '0%',
          population_decline_rate: 'X',
          population_consecutive_decline: 'X',
          population_category_met: 'X',
          industry_decline_rate_pct: industryDeclineRatePct,
          industry_decline_rate: industryDeclineRate,
          industry_consecutive_decline: industryConsecutiveDecline,
          industry_category_met: industryCategoryMet,
          environment_old_building_pct: '0%',
          environment_old_building: 'X',
          environment_category_met: 'X',
          total_categories_met: industryCategoryMet === 'O' ? 1 : 0
        });
      }
    });
    
    // Add/update regions from environment data
    processedData.environment.forEach(row => {
      const regionCode = row.region_code;
      const environmentOldBuildingPct = row.old_building_percentage || '0%';
      const environmentOldBuilding = row.old_building_criterion || 'X';
      
      // For environment, the old building criterion is the only one, so it equals the category
      const environmentCategoryMet = environmentOldBuilding;
      
      if (regionsMap.has(regionCode)) {
        // Update existing region
        const regionData = regionsMap.get(regionCode)!;
        regionData.environment_old_building_pct = environmentOldBuildingPct;
        regionData.environment_old_building = environmentOldBuilding;
        regionData.environment_category_met = environmentCategoryMet;
        
        // Update total categories met
        if (environmentCategoryMet === 'O') {
          regionData.total_categories_met += 1;
        }
      } else {
        // Add new region
        regionsMap.set(regionCode, {
          region_code: regionCode,
          population_decline_rate_pct: '0%',
          population_decline_rate: 'X',
          population_consecutive_decline: 'X',
          population_category_met: 'X',
          industry_decline_rate_pct: '0%',
          industry_decline_rate: 'X',
          industry_consecutive_decline: 'X',
          industry_category_met: 'X',
          environment_old_building_pct: environmentOldBuildingPct,
          environment_old_building: environmentOldBuilding,
          environment_category_met: environmentCategoryMet,
          total_categories_met: environmentCategoryMet === 'O' ? 1 : 0
        });
      }
    });
    
    // Convert the map to an array and sort by total categories met (descending)
    const summaryRows = Array.from(regionsMap.values())
      .sort((a, b) => b.total_categories_met - a.total_categories_met);
    
    // Create headers for CSV and preview
    const headers = [
      'region_code',
      'population_decline_rate_pct',
      'population_decline_rate',
      'population_consecutive_decline',
      'population_category_met',
      'industry_decline_rate_pct',
      'industry_decline_rate',
      'industry_consecutive_decline',
      'industry_category_met',
      'environment_old_building_pct',
      'environment_old_building',
      'environment_category_met',
      'total_categories_met'
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
      'Pop. Decline Rate',
      'Pop. Decline ≥20%',
      'Pop. Consec. Decline',
      'Pop. Category Met',
      'Ind. Decline Rate',
      'Ind. Decline ≥5%',
      'Ind. Consec. Decline',
      'Ind. Category Met',
      'Env. Old Building %',
      'Env. Old Building ≥50%',
      'Env. Category Met',
      'Total Categories'
    ];
    
    const previewData = {
      headers: previewHeaders,
      rows: summaryRows.map(row => ({
        'Region Code': row.region_code,
        'Pop. Decline Rate': row.population_decline_rate_pct,
        'Pop. Decline ≥20%': row.population_decline_rate,
        'Pop. Consec. Decline': row.population_consecutive_decline,
        'Pop. Category Met': row.population_category_met,
        'Ind. Decline Rate': row.industry_decline_rate_pct,
        'Ind. Decline ≥5%': row.industry_decline_rate,
        'Ind. Consec. Decline': row.industry_consecutive_decline,
        'Ind. Category Met': row.industry_category_met,
        'Env. Old Building %': row.environment_old_building_pct,
        'Env. Old Building ≥50%': row.environment_old_building,
        'Env. Category Met': row.environment_category_met,
        'Total Categories': row.total_categories_met.toString()
      }))
    };
    
    return {
      success: true,
      message: 'Summary analysis completed',
      blobUrl: '',
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
    // Modified to require at least 3 consecutive years (i.e., maxConsecutiveDeclines >= 2)
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
