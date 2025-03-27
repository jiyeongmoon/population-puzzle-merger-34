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

let processedData = {
  population: null as Record<string, string>[] | null,
  industry: null as Record<string, string>[] | null,
  environment: null as Record<string, string>[] | null
};

export const downloadResult = (blobUrl: string) => {
  if (!blobUrl) return;
  
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'analysis_result.csv';
  document.body.appendChild(link);
  
  link.click();
  
  document.body.removeChild(link);
};

export const downloadExcel = (blob: Blob, fileName: string = 'analysis_result.xlsx') => {
  if (!blob) return;
  
  const blobUrl = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
};

const parseFileContent = (content: string): DataRecord[] => {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
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

export const processFiles = async (files: File[], indicatorType: IndicatorType = 'population'): Promise<ProcessingResult> => {
  try {
    if (indicatorType === 'summary') {
      return processAllIndicators();
    }
    
    if (!files.length) {
      return { success: false, message: 'No files provided' };
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let dataCodeFilter = '';
    if (indicatorType === 'population') {
      dataCodeFilter = 'to_in_001';
    } else if (indicatorType === 'industry') {
      dataCodeFilter = 'to_fa_010';
    }
    
    let allRecords: DataRecord[] = [];
    
    for (const file of files) {
      const content = await file.text();
      const records = parseFileContent(content);
      
      let filteredRecords;
      if (indicatorType === 'environment') {
        filteredRecords = records.filter(record => 
          record.year === '2023' && 
          record.data_code.startsWith('ho_yr_')
        );
      } else {
        filteredRecords = records.filter(record => record.data_code === dataCodeFilter);
      }
      
      allRecords = [...allRecords, ...filteredRecords];
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const pivotMap = new Map<string, Record<string, string>>();
    const years = new Set<string>();
    
    if (indicatorType === 'environment') {
      return processEnvironmentData(allRecords);
    } else {
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
      
      const outputRows = Array.from(pivotMap.values());
      
      const sortedYears = Array.from(years).sort();
      
      if (indicatorType === 'population') {
        analyzePopulationDecline(outputRows, sortedYears);
        processedData.population = outputRows;
      } else if (indicatorType === 'industry') {
        analyzeBusinessDecline(outputRows, sortedYears);
        processedData.industry = outputRows;
      }
      
      const basicHeaders = ['region_code', ...sortedYears.map(y => `year_${y}`)];
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
      
      const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const textEncoder = new TextEncoder();
      const csvContentEncoded = textEncoder.encode(csvContent);
      
      const combinedArray = new Uint8Array(BOM.length + csvContentEncoded.length);
      combinedArray.set(BOM);
      combinedArray.set(csvContentEncoded, BOM.length);
      
      const fileName = getFileNameByIndicator(indicatorType);
      
      const blob = new Blob([combinedArray], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      
      const excelBlob = await createExcelFile(outputRows, sortedYears, indicatorType);
      
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
          
          sortedYears.forEach(year => {
            const yearKey = `year_${year}`;
            const value = row[yearKey] || '';
            
            if (indicatorType === 'population') {
              if (row[`${yearKey}_isMax`] === 'true') {
                newRow[year] = `${value} ★`;
              } else if (row[`${yearKey}_declining`] === 'true') {
                newRow[year] = `${value} ▼`;
              } else {
                newRow[year] = value;
              }
            } else if (indicatorType === 'industry') {
              if (row[`${yearKey}_isMax`] === 'true') {
                newRow[year] = `${value} ★`;
              } else if (row[`${yearKey}_declining`] === 'true') {
                newRow[year] = `${value} ▼`;
              } else {
                newRow[year] = value;
              }
            } else {
              newRow[year] = value;
            }
          });
          
          if (indicatorType === 'population') {
            newRow['Decline Rate'] = row['DeclineRate'] || '';
            newRow['Decline ≥20%'] = row['Decline_20pct'] || '';
            newRow['Consecutive Decline'] = row['ConsecutiveDecline'] || '';
          } else if (indicatorType === 'industry') {
            newRow['Decline Rate'] = row['BusinessDeclineRate'] || '';
            newRow['Decline ≥5%'] = row['BusinessDeclineOver5%'] || '';
            newRow['Consec. Decline'] = row['BusinessConsecDecline'] || '';
          }
          
          return newRow;
        })
      };
      
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

const processEnvironmentData = async (records: DataRecord[]): Promise<ProcessingResult> => {
  try {
    const regionMap = new Map<string, DataRecord[]>();
    
    records.forEach(record => {
      if (!regionMap.has(record.region_code)) {
        regionMap.set(record.region_code, []);
      }
      regionMap.get(record.region_code)?.push(record);
    });
    
    const outputRows: Record<string, string>[] = [];
    
    regionMap.forEach((regionRecords, regionCode) => {
      let totalBuildings = 0;
      let oldBuildings = 0;
      
      regionRecords.forEach(record => {
        const value = parseInt(record.value, 10);
        if (!isNaN(value)) {
          totalBuildings += value;
          
          if (['ho_yr_001', 'ho_yr_002', 'ho_yr_003', 'ho_yr_004'].includes(record.data_code)) {
            oldBuildings += value;
          }
        }
      });
      
      const oldBuildingPercentage = totalBuildings > 0 
        ? (oldBuildings / totalBuildings) * 100 
        : 0;
      
      const meetsOldBuildingCriterion = oldBuildingPercentage >= 50;
      
      outputRows.push({
        region_code: regionCode,
        total_buildings: totalBuildings.toString(),
        old_buildings: oldBuildings.toString(),
        old_building_percentage: oldBuildingPercentage.toFixed(2) + '%',
        old_building_criterion: meetsOldBuildingCriterion ? 'O' : 'X'
      });
    });
    
    processedData.environment = outputRows;
    
    const headers = [
      'region_code', 
      'total_buildings', 
      'old_buildings', 
      'old_building_percentage', 
      'old_building_criterion'
    ];
    
    const csvContent = [
      headers.join(','),
      ...outputRows.map(row => {
        return headers.map(header => row[header] || '').join(',');
      })
    ].join('\n');
    
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const textEncoder = new TextEncoder();
    const csvContentEncoded = textEncoder.encode(csvContent);
    
    const combinedArray = new Uint8Array(BOM.length + csvContentEncoded.length);
    combinedArray.set(BOM);
    combinedArray.set(csvContentEncoded, BOM.length);
    
    const blob = new Blob([combinedArray], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    const excelBlob = await createEnvironmentExcelFile(outputRows);
    
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

const processAllIndicators = async (): Promise<ProcessingResult> => {
  try {
    if (!processedData.population || !processedData.industry || !processedData.environment) {
      return {
        success: false,
        message: 'Please process all three indicators before generating a summary'
      };
    }
    
    const regionsMap = new Map<string, {
      region_code: string;
      population_decline_rate_pct: string;
      population_decline_rate: string;
      population_consecutive_decline: string;
      population_category_met: string;
      industry_decline_rate_pct: string;
      industry_decline_rate: string;
      industry_consecutive_decline: string;
      industry_category_met: string;
      environment_old_building_pct: string;
      environment_old_building: string;
      environment_category_met: string;
      total_categories_met: number;
    }>();
    
    processedData.population.forEach(row => {
      const regionCode = row.region_code;
      const populationDeclineRatePct = row.DeclineRate || '0%';
      const populationDeclineRate = row.Decline_20pct || 'X';
      const populationConsecutiveDecline = row.ConsecutiveDecline || 'X';
      
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
    
    processedData.industry.forEach(row => {
      const regionCode = row.region_code;
      const industryDeclineRatePct = row.BusinessDeclineRate || '0%';
      const industryDeclineRate = row["BusinessDeclineOver5%"] || 'X';
      const industryConsecutiveDecline = row.BusinessConsecDecline || 'X';
      
      const industryCategoryMet = (industryDeclineRate === 'O' || industryConsecutiveDecline === 'O') ? 'O' : 'X';
      
      if (regionsMap.has(regionCode)) {
        const regionData = regionsMap.get(regionCode)!;
        regionData.industry_decline_rate_pct = industryDeclineRatePct;
        regionData.industry_decline_rate = industryDeclineRate;
        regionData.industry_consecutive_decline = industryConsecutiveDecline;
        regionData.industry_category_met = industryCategoryMet;
        
        if (industryCategoryMet === 'O') {
          regionData.total_categories_met += 1;
        }
      } else {
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
    
    processedData.environment.forEach(row => {
      const regionCode = row.region_code;
      const environmentOldBuildingPct = row.old_building_percentage || '0%';
      const environmentOldBuilding = row.old_building_criterion || 'X';
      
      const environmentCategoryMet = environmentOldBuilding;
      
      if (regionsMap.has(regionCode)) {
        const regionData = regionsMap.get(regionCode)!;
        regionData.environment_old_building_pct = environmentOldBuildingPct;
        regionData.environment_old_building = environmentOldBuilding;
        regionData.environment_category_met = environmentCategoryMet;
        
        if (environmentCategoryMet === 'O') {
          regionData.total_categories_met += 1;
        }
      } else {
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
    
    const summaryRows = Array.from(regionsMap.values())
      .sort((a, b) => b.total_categories_met - a.total_categories_met);
    
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
    
    const csvContent = [
      headers.join(','),
      ...summaryRows.map(row => {
        return headers.map(header => row[header as keyof typeof row].toString()).join(',');
      })
    ].join('\n');
    
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const textEncoder = new TextEncoder();
    const csvContentEncoded = textEncoder.encode(csvContent);
    
    const combinedArray = new Uint8Array(BOM.length + csvContentEncoded.length);
    combinedArray.set(BOM);
    combinedArray.set(csvContentEncoded, BOM.length);
    
    const blob = new Blob([combinedArray], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    const excelBlob = await createSummaryExcelFile(
      processedData.population || [],
      processedData.industry || [],
      processedData.environment || [],
      summaryRows
    );
    
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

const analyzePopulationDecline = (outputRows: Record<string, string>[], sortedYears: string[]) => {
  outputRows.forEach(row => {
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
    
    if (maxYear) {
      row[`year_${maxYear}_isMax`] = 'true';
    }
    
    const availableYears = sortedYears.filter(year => {
      const yearKey = `year_${year}`;
      return row[yearKey] && !isNaN(parseFloat(row[yearKey]));
    });
    
    const mostRecentYear = availableYears.length ? availableYears[availableYears.length - 1] : '';
    const mostRecentPopulation = mostRecentYear ? parseFloat(row[`year_${mostRecentYear}`] || '0') : 0;
    
    let declineRate = 0;
    if (maxPopulation > 0 && mostRecentPopulation > 0) {
      declineRate = ((mostRecentPopulation - maxPopulation) / maxPopulation) * 100;
    }
    
    const hasDecline20Pct = declineRate <= -20;
    
    row['DeclineRate'] = declineRate.toFixed(2) + '%';
    row['Decline_20pct'] = hasDecline20Pct ? 'O' : 'X';
    
    let consecutiveDeclines = 0;
    let maxConsecutiveDeclines = 0;
    
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
    
    row['ConsecutiveDecline'] = maxConsecutiveDeclines >= 3 ? 'O' : 'X';
  });
};

const analyzeBusinessDecline = (outputRows: Record<string, string>[], sortedYears: string[]) => {
  outputRows.forEach(row => {
    const valuesByYear = new Map<string, number>();
    let maxValue = 0;
    let maxYear = '';
    
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
    
    if (maxYear) {
      row[`year_${maxYear}_isMax`] = 'true';
    }
    
    const availableYears = sortedYears.filter(year => {
      const yearKey = `year_${year}`;
      return row[yearKey] && !isNaN(parseFloat(row[yearKey]));
    });
    
    const mostRecentYear = availableYears.length ? availableYears[availableYears.length - 1] : '';
    const mostRecentValue = mostRecentYear ? parseFloat(row[`year_${mostRecentYear}`] || '0') : 0;
    
    let declineRate = 0;
    if (maxValue > 0 && mostRecentValue > 0 && maxYear !== mostRecentYear) {
      declineRate = ((mostRecentValue - maxValue) / maxValue) * 100;
    }
    
    const hasDecline5Pct = declineRate <= -5;
    
    row['BusinessDeclineRate'] = declineRate.toFixed(2) + '%';
    row['BusinessDeclineOver5%'] = hasDecline5Pct ? 'O' : 'X';
    
    let consecutiveDeclines = 0;
    let maxConsecutiveDeclines = 0;
    
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
    
    row['BusinessConsecDecline'] = maxConsecutiveDeclines >= 3 ? 'O' : 'X';
  });
};

const createExcelFile = async (
  data: Record<string, string>[],
  years: string[],
  indicatorType: IndicatorType
): Promise<Blob> => {
  const wb = XLSX.utils.book_new();
  
  const excelData = data.map(row => {
    const excelRow: Record<string, string | number> = {
      region_code: row.region_code
    };
    
    years.forEach(year => {
      const yearKey = `year_${year}`;
      const value = row[yearKey];
      
      if (value) {
        const numValue = parseFloat(value);
        excelRow[year] = isNaN(numValue) ? value : numValue;
      } else {
        excelRow[year] = '';
      }
    });
    
    if (indicatorType === 'population') {
      excelRow['Decline Rate (%)'] = row.DeclineRate || '';
      excelRow['Decline ≥20%'] = row.Decline_20pct || '';
      excelRow['Consecutive Decline'] = row.ConsecutiveDecline || '';
    } else if (indicatorType === 'industry') {
      excelRow['Business Decline Rate (%)'] = row.BusinessDeclineRate || '';
      excelRow['Business Decline ≥5%'] = row['BusinessDeclineOver5%'] || '';
      excelRow['Business Consecutive Decline'] = row.BusinessConsecDecline || '';
    }
    
    return excelRow;
  });
  
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  const columnWidths = [
    { wch: 15 },
    ...years.map(() => ({ wch: 12 })),
    { wch: 18 },
    { wch: 15 },
    { wch: 22 }
  ];
  
  ws['!cols'] = columnWidths;
  
  const sheetName = indicatorType.charAt(0).toUpperCase() + indicatorType.slice(1);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  const wbout = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });
  
  const buf = new ArrayBuffer(wbout.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < wbout.length; i++) {
    view[i] = wbout.charCodeAt(i) & 0xFF;
  }
  
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const createEnvironmentExcelFile = async (data: Record<string, string>[]): Promise<Blob> => {
  const wb = XLSX.utils.book_new();
  
  const excelData = data.map(row => {
    return {
      'Region Code': row.region_code,
      'Total Buildings': isNaN(parseInt(row.total_buildings)) ? row.total_buildings : parseInt(row.total_buildings),
      'Old Buildings (20+ years)': isNaN(parseInt(row.old_buildings)) ? row.old_buildings : parseInt(row.old_buildings),
      'Old Building %': row.old_building_percentage,
      'Old Buildings ≥50%': row.old_building_criterion
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  const columnWidths = [
    { wch: 15 },
    { wch: 15 },
    { wch: 22 },
    { wch: 15 },
    { wch: 20 }
  ];
  
  ws['!cols'] = columnWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, 'Environment');
  
  const wbout = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });
  
  const buf = new ArrayBuffer(wbout.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < wbout.length; i++) {
    view[i] = wbout.charCodeAt(i) & 0xFF;
  }
  
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const createSummaryExcelFile = async (
  populationData: Record<string, string>[],
  industryData: Record<string, string>[],
  environmentData: Record<string, string>[],
  summaryData: Record<string, any>[]
): Promise<Blob> => {
  const wb = XLSX.utils.book_new();
  
  const summaryExcelData = summaryData.map(row => {
    return {
      'Region Code': row.region_code,
      'Population Decline Rate': row.population_decline_rate_pct,
      'Population Decline ≥20%': row.population_decline_rate,
      'Population Consecutive Decline': row.population_consecutive_decline,
      'Population Category Met': row.population_category_met,
      'Industry Decline Rate': row.industry_decline_rate_pct,
      'Industry Decline ≥5%': row.industry_decline_rate,
      'Industry Consecutive Decline': row.industry_consecutive_decline,
      'Industry Category Met': row.industry_category_met,
      'Environment Old Building %': row.environment_old_building_pct,
      'Environment Old Building ≥50%': row.environment_old_building,
      'Environment Category Met': row.environment_category_met,
      'Total Categories Met': row.total_categories_met
    };
  });
  
  const summaryWs = XLSX.utils.json_to_sheet(summaryExcelData);
  
  const summaryColumnWidths = [
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 25 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 25 },
    { wch: 20 },
    { wch: 22 },
    { wch: 25 },
    { wch: 22 },
    { wch: 18 }
  ];
  
  summaryWs['!cols'] = summaryColumnWidths;
  
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  
  if (populationData.length > 0) {
    const populationYears = new Set<string>();
    populationData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key.startsWith('year_')) {
          populationYears.add(key.split('_')[1]);
        }
      });
    });
    
    const populationExcelData = populationData.map(row => {
      const excelRow: Record<string, string | number> = {
        'Region Code': row.region_code
      };
      
      Array.from(populationYears).sort().forEach(year => {
        const yearKey = `year_${year}`;
        const value = row[yearKey];
        
        if (value) {
          const numValue = parseFloat(value);
          excelRow[year] = isNaN(numValue) ? value : numValue;
        } else {
          excelRow[year] = '';
        }
      });
      
      excelRow['Decline Rate (%)'] = row.DeclineRate || '';
      excelRow['Decline ≥20%'] = row.Decline_20pct || '';
      excelRow['Consecutive Decline'] = row.ConsecutiveDecline || '';
      
      return excelRow;
    });
    
    const populationWs = XLSX.utils.json_to_sheet(populationExcelData);
    
    XLSX.utils.book_append_sheet(wb, populationWs, 'Population');
  }
  
  if (industryData.length > 0) {
    const industryYears = new Set<string>();
    industryData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key.startsWith('year_')) {
          industryYears.add(key.split('_')[1]);
        }
      });
    });
    
    const industryExcelData = industryData.map(row => {
      const excelRow: Record<string, string | number> = {
        'Region Code': row.region_code
      };
      
      Array.from(industryYears).sort().forEach(year => {
        const yearKey = `year_${year}`;
        const value = row[yearKey];
        
        if (value) {
          const numValue = parseFloat(value);
          excelRow[year] = isNaN(numValue) ? value : numValue;
        } else {
          excelRow[year] = '';
        }
      });
      
      excelRow['Decline Rate (%)'] = row.BusinessDeclineRate || '';
      excelRow['Decline ≥5%'] = row['BusinessDeclineOver5%'] || '';
      excelRow['Consecutive Decline'] = row.BusinessConsecDecline || '';
      
      return excelRow;
    });
    
    const industryWs = XLSX.utils.json_to_sheet(industryExcelData);
    
    XLSX.utils.book_append_sheet(wb, industryWs, 'Industry');
  }
  
  if (environmentData.length > 0) {
    const environmentExcelData = environmentData.map(row => {
      return {
        'Region Code': row.region_code,
        'Total Buildings': isNaN(parseInt(row.total_buildings)) ? row.total_buildings : parseInt(row.total_buildings),
        'Old Buildings (20+ years)': isNaN(parseInt(row.old_buildings)) ? row.old_buildings : parseInt(row.old_buildings),
        'Old Building %': row.old_building_percentage,
        'Old Buildings ≥50%': row.old_building_criterion
      };
    });
    
    const environmentWs = XLSX.utils.json_to_sheet(environmentExcelData);
    
    XLSX.utils.book_append_sheet(wb, environmentWs, 'Environment');
  }
  
  const wbout = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });
  
  const buf = new ArrayBuffer(wbout.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < wbout.length; i++) {
    view[i] = wbout.charCodeAt(i) & 0xFF;
  }
  
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const getFileNameByIndicator = (indicatorType: IndicatorType): string => {
  switch (indicatorType) {
    case 'population':
      return 'population_decline_analysis.csv';
    case 'industry':
      return 'business_decline_analysis.csv';
    case 'environment':
      return 'building_age_analysis.csv';
    case 'summary':
      return 'comprehensive_analysis.csv';
    default:
      return 'analysis_result.csv';
  }
};

const getSuccessMessageByIndicator = (indicatorType: IndicatorType): string => {
  switch (indicatorType) {
    case 'population':
      return 'Population decline analysis completed';
    case 'industry':
      return 'Business decline analysis completed';
    case 'environment':
      return 'Physical environment analysis completed';
    case 'summary':
      return 'Comprehensive analysis completed';
    default:
      return 'Analysis completed successfully';
  }
};
