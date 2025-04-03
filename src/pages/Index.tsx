import React, { useState } from 'react';
import { motion } from 'framer-motion';
import FileUploader from '@/components/FileUploader';
import ProcessingStatus, { ProcessingStatus as Status } from '@/components/ProcessingStatus';
import { processFiles, downloadResult, downloadExcel, ProcessingResult, IndicatorType } from '@/lib/fileProcessor';
import { Button } from '@/components/ui/button';
import { Info, Sparkles, BarChart4, Download, RefreshCcw } from 'lucide-react';
import IndicatorTabs from '@/components/IndicatorTabs';
import { TabsContent } from '@/components/ui/tabs';
import { toast } from "sonner";

const Index = () => {
  // Current active indicator type
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType>('population');
  
  // Population section state
  const [populationFiles, setPopulationFiles] = useState<File[]>([]);
  const [populationStatus, setPopulationStatus] = useState<Status>('idle');
  const [populationProgress, setPopulationProgress] = useState(0);
  const [populationResult, setPopulationResult] = useState<ProcessingResult | null>(null);
  const [populationError, setPopulationError] = useState<string | null>(null);
  
  // Industry section state
  const [industryFiles, setIndustryFiles] = useState<File[]>([]);
  const [industryStatus, setIndustryStatus] = useState<Status>('idle');
  const [industryProgress, setIndustryProgress] = useState(0);
  const [industryResult, setIndustryResult] = useState<ProcessingResult | null>(null);
  const [industryError, setIndustryError] = useState<string | null>(null);
  
  // Environment section state
  const [environmentFiles, setEnvironmentFiles] = useState<File[]>([]);
  const [environmentStatus, setEnvironmentStatus] = useState<Status>('idle');
  const [environmentProgress, setEnvironmentProgress] = useState(0);
  const [environmentResult, setEnvironmentResult] = useState<ProcessingResult | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  
  // Summary section state
  const [summaryStatus, setSummaryStatus] = useState<Status>('idle');
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [summaryResult, setSummaryResult] = useState<ProcessingResult | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleFilesSelected = (selectedFiles: File[]) => {
    if (activeIndicator === 'population') {
      setPopulationFiles(selectedFiles);
      if (populationStatus === 'error') {
        setPopulationStatus('idle');
        setPopulationError(null);
      }
    } else if (activeIndicator === 'industry') {
      setIndustryFiles(selectedFiles);
      if (industryStatus === 'error') {
        setIndustryStatus('idle');
        setIndustryError(null);
      }
    } else if (activeIndicator === 'environment') {
      setEnvironmentFiles(selectedFiles);
      if (environmentStatus === 'error') {
        setEnvironmentStatus('idle');
        setEnvironmentError(null);
      }
    }
  };

  const handleProcessFiles = async () => {
    // Get the correct state based on active indicator
    let files: File[] = [];
    if (activeIndicator === 'population') {
      files = populationFiles;
    } else if (activeIndicator === 'industry') {
      files = industryFiles;
    } else if (activeIndicator === 'environment') {
      files = environmentFiles;
    }
    
    if ((!files.length && activeIndicator !== 'summary') || 
        (activeIndicator === 'summary' && 
         (populationStatus !== 'success' || industryStatus !== 'success' || environmentStatus !== 'success'))) {
      
      if (activeIndicator === 'summary') {
        toast.error("Please process all three indicators before generating the summary");
      } else {
        toast.error("Please upload files first");
      }
      return;
    }
    
    try {
      // Set status and progress based on active indicator
      if (activeIndicator === 'population') {
        setPopulationStatus('processing');
        setPopulationProgress(0);
      } else if (activeIndicator === 'industry') {
        setIndustryStatus('processing');
        setIndustryProgress(0);
      } else if (activeIndicator === 'environment') {
        setEnvironmentStatus('processing');
        setEnvironmentProgress(0);
      } else if (activeIndicator === 'summary') {
        setSummaryStatus('processing');
        setSummaryProgress(0);
      }
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (activeIndicator === 'population') {
          setPopulationProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return 95;
            }
            return prev + Math.random() * 15;
          });
        } else if (activeIndicator === 'industry') {
          setIndustryProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return 95;
            }
            return prev + Math.random() * 15;
          });
        } else if (activeIndicator === 'environment') {
          setEnvironmentProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return 95;
            }
            return prev + Math.random() * 15;
          });
        } else if (activeIndicator === 'summary') {
          setSummaryProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return 95;
            }
            return prev + Math.random() * 15;
          });
        }
      }, 600);
      
      // Process files for the active indicator
      const processResult = await processFiles(files, activeIndicator);
      clearInterval(progressInterval);
      
      // Update progress based on active indicator
      if (activeIndicator === 'population') {
        setPopulationProgress(100);
      } else if (activeIndicator === 'industry') {
        setIndustryProgress(100);
      } else if (activeIndicator === 'environment') {
        setEnvironmentProgress(100);
      } else if (activeIndicator === 'summary') {
        setSummaryProgress(100);
      }
      
      // Short delay before showing final status
      setTimeout(() => {
        if (processResult.success) {
          if (activeIndicator === 'population') {
            setPopulationStatus('success');
            setPopulationResult(processResult);
          } else if (activeIndicator === 'industry') {
            setIndustryStatus('success');
            setIndustryResult(processResult);
          } else if (activeIndicator === 'environment') {
            setEnvironmentStatus('success');
            setEnvironmentResult(processResult);
          } else if (activeIndicator === 'summary') {
            setSummaryStatus('success');
            setSummaryResult(processResult);
          }
        } else {
          if (activeIndicator === 'population') {
            setPopulationStatus('error');
            setPopulationError(processResult.message);
          } else if (activeIndicator === 'industry') {
            setIndustryStatus('error');
            setIndustryError(processResult.message);
          } else if (activeIndicator === 'environment') {
            setEnvironmentStatus('error');
            setEnvironmentError(processResult.message);
          } else if (activeIndicator === 'summary') {
            setSummaryStatus('error');
            setSummaryError(processResult.message);
          }
        }
      }, 500);
      
    } catch (err) {
      if (activeIndicator === 'population') {
        setPopulationStatus('error');
        setPopulationError(err instanceof Error ? err.message : 'Unknown error occurred');
      } else if (activeIndicator === 'industry') {
        setIndustryStatus('error');
        setIndustryError(err instanceof Error ? err.message : 'Unknown error occurred');
      } else if (activeIndicator === 'environment') {
        setEnvironmentStatus('error');
        setEnvironmentError(err instanceof Error ? err.message : 'Unknown error occurred');
      } else if (activeIndicator === 'summary') {
        setSummaryStatus('error');
        setSummaryError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    }
  };

  const handleDownload = () => {
    if (activeIndicator === 'population' && populationResult?.blobUrl) {
      downloadResult(populationResult.blobUrl);
    } else if (activeIndicator === 'industry' && industryResult?.blobUrl) {
      downloadResult(industryResult.blobUrl);
    } else if (activeIndicator === 'environment' && environmentResult?.blobUrl) {
      downloadResult(environmentResult.blobUrl);
    } else if (activeIndicator === 'summary' && summaryResult?.blobUrl) {
      downloadResult(summaryResult.blobUrl, 'Regional_Decline_Analysis.csv');
    }
  };

  const handleDownloadExcel = () => {
    const result = 
      activeIndicator === 'population' ? populationResult :
      activeIndicator === 'industry' ? industryResult :
      activeIndicator === 'environment' ? environmentResult :
      summaryResult;
    
    if (result?.excelBlob) {
      downloadExcel(result.excelBlob, `${activeIndicator}_analysis.xlsx`);
    }
  };

  const handleReset = () => {
    if (activeIndicator === 'population') {
      setPopulationFiles([]);
      setPopulationStatus('idle');
      setPopulationProgress(0);
      setPopulationResult(null);
      setPopulationError(null);
    } else if (activeIndicator === 'industry') {
      setIndustryFiles([]);
      setIndustryStatus('idle');
      setIndustryProgress(0);
      setIndustryResult(null);
      setIndustryError(null);
    } else if (activeIndicator === 'environment') {
      setEnvironmentFiles([]);
      setEnvironmentStatus('idle');
      setEnvironmentProgress(0);
      setEnvironmentResult(null);
      setEnvironmentError(null);
    } else if (activeIndicator === 'summary') {
      setSummaryStatus('idle');
      setSummaryProgress(0);
      setSummaryResult(null);
      setSummaryError(null);
    }
    
    toast.info("Reset completed");
  };

  const containerAnimation = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const itemAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const getCurrentStatus = (): Status => {
    switch(activeIndicator) {
      case 'population': return populationStatus;
      case 'industry': return industryStatus;
      case 'environment': return environmentStatus;
      case 'summary': return summaryStatus;
      default: return 'idle';
    }
  };
  
  const getCurrentProgress = (): number => {
    switch(activeIndicator) {
      case 'population': return populationProgress;
      case 'industry': return industryProgress;
      case 'environment': return environmentProgress;
      case 'summary': return summaryProgress;
      default: return 0;
    }
  };
  
  const getCurrentError = (): string | null => {
    switch(activeIndicator) {
      case 'population': return populationError;
      case 'industry': return industryError;
      case 'environment': return environmentError;
      case 'summary': return summaryError;
      default: return null;
    }
  };
  
  const getCurrentResult = (): ProcessingResult | null => {
    switch(activeIndicator) {
      case 'population': return populationResult;
      case 'industry': return industryResult;
      case 'environment': return environmentResult;
      case 'summary': return summaryResult;
      default: return null;
    }
  };
  
  const getCurrentFiles = (): File[] => {
    switch(activeIndicator) {
      case 'population': return populationFiles;
      case 'industry': return industryFiles;
      case 'environment': return environmentFiles;
      default: return [];
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="w-full py-6 px-6 sm:px-8 border-b backdrop-blur-md bg-background/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-primary mr-2" />
            <h1 className="text-lg font-medium">Regional Decline Analyzer</h1>
          </div>
        </div>
      </header>
      
      <motion.main 
        className="flex-1 py-12 px-6 sm:px-8"
        initial="hidden"
        animate="visible"
        variants={containerAnimation}
      >
        <div className="max-w-5xl mx-auto w-full space-y-12">
          <motion.div variants={itemAnimation} className="text-center space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight">
              Analyze Regional Decline Patterns
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Upload data files to identify and analyze decline trends across multiple indicators.
            </p>
          </motion.div>
          
          <motion.div variants={itemAnimation}>
            <IndicatorTabs 
              defaultValue="population"
              onValueChange={(value) => setActiveIndicator(value as IndicatorType)}
            >
              <TabsContent value="population" className="mt-6">
                <div className="glass-panel p-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xl font-medium">Population-Social Indicator</h3>
                      {populationStatus === 'success' && (
                        <Button variant="outline" onClick={handleReset} size="sm">
                          Start Over
                        </Button>
                      )}
                    </div>
                    
                    <FileUploader 
                      onFilesSelected={handleFilesSelected}
                      accept=".txt"
                      sectionTitle="Upload population data files"
                      dataCodeFilter="to_in_001"
                    />
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-4 justify-between">
                      {populationFiles.length > 0 && (
                        <Button 
                          variant="reset" 
                          size="sm" 
                          onClick={handleReset}
                          className="flex items-center gap-2"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          Reset
                        </Button>
                      )}
                      
                      {populationStatus === 'idle' && populationFiles.length > 0 && (
                        <Button onClick={handleProcessFiles}>
                          Analyze Population Data
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <ProcessingStatus
                    status={populationStatus}
                    progress={populationProgress}
                    errorMessage={populationError || undefined}
                    onDownload={() => downloadResult(populationResult?.blobUrl || '')}
                    previewData={populationResult?.previewData}
                  />
                </div>
                
                {populationStatus === 'success' && populationResult?.excelBlob && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadExcel}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Excel Format
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="industry" className="mt-6">
                <div className="glass-panel p-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xl font-medium">Industrial-Economy Indicator</h3>
                      {industryStatus === 'success' && (
                        <Button variant="outline" onClick={handleReset} size="sm">
                          Start Over
                        </Button>
                      )}
                    </div>
                    
                    <FileUploader 
                      onFilesSelected={handleFilesSelected}
                      accept=".txt"
                      sectionTitle="Upload industry data files"
                      dataCodeFilter="to_fa_010"
                    />
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-4 justify-between">
                      {industryFiles.length > 0 && (
                        <Button 
                          variant="reset" 
                          size="sm" 
                          onClick={handleReset}
                          className="flex items-center gap-2"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          Reset
                        </Button>
                      )}
                      
                      {industryStatus === 'idle' && industryFiles.length > 0 && (
                        <Button onClick={handleProcessFiles}>
                          Analyze Business Decline
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <ProcessingStatus
                    status={industryStatus}
                    progress={industryProgress}
                    errorMessage={industryError || undefined}
                    onDownload={() => downloadResult(industryResult?.blobUrl || '')}
                    previewData={industryResult?.previewData}
                  />
                </div>
                
                {industryStatus === 'success' && industryResult?.excelBlob && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadExcel}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Excel Format
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="environment" className="mt-6">
                <div className="glass-panel p-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xl font-medium">Physical-Environment Indicator</h3>
                      {environmentStatus === 'success' && (
                        <Button variant="outline" onClick={handleReset} size="sm">
                          Start Over
                        </Button>
                      )}
                    </div>
                    
                    <FileUploader 
                      onFilesSelected={handleFilesSelected}
                      accept=".txt"
                      sectionTitle="Upload building age data files (2023)"
                      dataCodeFilter="ho_yr_*"
                    />
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-4 justify-between">
                      {environmentFiles.length > 0 && (
                        <Button 
                          variant="reset" 
                          size="sm" 
                          onClick={handleReset}
                          className="flex items-center gap-2"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          Reset
                        </Button>
                      )}
                      
                      {environmentStatus === 'idle' && environmentFiles.length > 0 && (
                        <Button onClick={handleProcessFiles}>
                          Analyze Building Age
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <ProcessingStatus
                    status={environmentStatus}
                    progress={environmentProgress}
                    errorMessage={environmentError || undefined}
                    onDownload={() => downloadResult(environmentResult?.blobUrl || '')}
                    previewData={environmentResult?.previewData}
                  />
                </div>
                
                {environmentStatus === 'success' && environmentResult?.excelBlob && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadExcel}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Excel Format
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="summary" className="mt-6">
                <div className="glass-panel p-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xl font-medium">Comprehensive Summary</h3>
                      {summaryStatus === 'success' && (
                        <Button variant="outline" onClick={handleReset} size="sm">
                          Recalculate
                        </Button>
                      )}
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-md space-y-4">
                      <div className="flex items-start gap-3">
                        <BarChart4 className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <h3 className="font-medium">Indicator Status</h3>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${populationStatus === 'success' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <span>Population-Social: {populationStatus === 'success' ? 'Processed' : 'Not Processed'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${industryStatus === 'success' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <span>Industrial-Economy: {industryStatus === 'success' ? 'Processed' : 'Not Processed'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${environmentStatus === 'success' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <span>Physical-Environment: {environmentStatus === 'success' ? 'Processed' : 'Not Processed'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-4 justify-between">
                      {(populationStatus === 'success' || industryStatus === 'success' || environmentStatus === 'success') && (
                        <Button 
                          variant="reset" 
                          size="sm" 
                          onClick={handleReset}
                          className="flex items-center gap-2"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          Reset
                        </Button>
                      )}
                    
                      {summaryStatus === 'idle' && populationStatus === 'success' && 
                       industryStatus === 'success' && environmentStatus === 'success' && (
                        <Button onClick={handleProcessFiles}>
                          Generate Comprehensive Analysis
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <ProcessingStatus
                    status={summaryStatus}
                    progress={summaryProgress}
                    errorMessage={summaryError || undefined}
                    onDownload={handleDownload}
                    previewData={summaryResult?.previewData}
                  />
                </div>
                
                {summaryStatus === 'success' && summaryResult?.blobUrl && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      onClick={() => downloadResult(summaryResult.blobUrl, 'Regional_Decline_Analysis.csv')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Analysis CSV
                    </Button>
                  </div>
                )}
                
                {summaryStatus === 'success' && summaryResult?.excelBlob && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="outline"
                      onClick={() => downloadExcel(summaryResult.excelBlob, 'Regional_Decline_Analysis.xlsx')}
                      className="flex items-center gap-2 mt-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Excel Format
                    </Button>
                  </div>
                )}
              </TabsContent>
            </IndicatorTabs>
          </motion.div>
          
          <motion.div variants={itemAnimation} className="glass-panel p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">About This Analysis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This tool analyzes regional decline using multiple indicators:
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2 space-y-1">
                  <li>
                    <span className="font-medium">Population-Social:</span> Identifies regions with population 
                    decreases of 20% or more from their peak and 3+ consecutive years of decline.
                  </li>
                  <li>
                    <span className="font-medium">Industrial-Economy:</span> Analyzes business decline 
                    with 5%+ drops from peak value and 3+ consecutive years of decline.
                  </li>
                  <li>
                    <span className="font-medium">Physical-Environment:</span> Examines building stock age, 
                    identifying regions where 50%+ of buildings are over 20 years old.
                  </li>
                  <li>
                    <span className="font-medium">Summary:</span> Combines all indicators to identify 
                    regions that meet at least 2 out of 3 decline criteria.
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.main>
      
      <footer className="py-6 px-6 sm:px-8 border-t">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-sm text-muted-foreground text-center">
            Regional Decline Analyzer — For demographic and economic research
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
