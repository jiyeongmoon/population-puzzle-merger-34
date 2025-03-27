
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import FileUploader from '@/components/FileUploader';
import ProcessingStatus, { ProcessingStatus as Status } from '@/components/ProcessingStatus';
import { processFiles, downloadResult, ProcessingResult, IndicatorType } from '@/lib/fileProcessor';
import { Button } from '@/components/ui/button';
import { Info, Sparkles } from 'lucide-react';
import IndicatorTabs from '@/components/IndicatorTabs';
import { TabsContent } from '@/components/ui/tabs';

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
    }
  };

  const handleProcessFiles = async () => {
    // Get the correct state based on active indicator
    const files = activeIndicator === 'population' ? populationFiles : industryFiles;
    if (!files.length) return;
    
    try {
      // Set status and progress based on active indicator
      if (activeIndicator === 'population') {
        setPopulationStatus('processing');
        setPopulationProgress(0);
      } else {
        setIndustryStatus('processing');
        setIndustryProgress(0);
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
        } else {
          setIndustryProgress(prev => {
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
      
      // Update progress and state based on active indicator
      if (activeIndicator === 'population') {
        setPopulationProgress(100);
      } else {
        setIndustryProgress(100);
      }
      
      // Short delay before showing final status
      setTimeout(() => {
        if (processResult.success) {
          if (activeIndicator === 'population') {
            setPopulationStatus('success');
            setPopulationResult(processResult);
          } else {
            setIndustryStatus('success');
            setIndustryResult(processResult);
          }
        } else {
          if (activeIndicator === 'population') {
            setPopulationStatus('error');
            setPopulationError(processResult.message);
          } else {
            setIndustryStatus('error');
            setIndustryError(processResult.message);
          }
        }
      }, 500);
      
    } catch (err) {
      if (activeIndicator === 'population') {
        setPopulationStatus('error');
        setPopulationError(err instanceof Error ? err.message : 'Unknown error occurred');
      } else {
        setIndustryStatus('error');
        setIndustryError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    }
  };

  const handleDownload = () => {
    const result = activeIndicator === 'population' ? populationResult : industryResult;
    if (result?.blobUrl) {
      downloadResult(result.blobUrl);
    }
  };

  const handleReset = () => {
    if (activeIndicator === 'population') {
      setPopulationFiles([]);
      setPopulationStatus('idle');
      setPopulationProgress(0);
      setPopulationResult(null);
      setPopulationError(null);
    } else {
      setIndustryFiles([]);
      setIndustryStatus('idle');
      setIndustryProgress(0);
      setIndustryResult(null);
      setIndustryError(null);
    }
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

  // Get current status, files, etc. based on active indicator
  const currentStatus = activeIndicator === 'population' ? populationStatus : industryStatus;
  const currentProgress = activeIndicator === 'population' ? populationProgress : industryProgress;
  const currentError = activeIndicator === 'population' ? populationError : industryError;
  const currentResult = activeIndicator === 'population' ? populationResult : industryResult;
  const currentFiles = activeIndicator === 'population' ? populationFiles : industryFiles;

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
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end">
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
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end">
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
              </TabsContent>
              
              <TabsContent value="environment" className="mt-6">
                <div className="glass-panel p-8 flex items-center justify-center min-h-[200px]">
                  <div className="text-center text-muted-foreground">
                    <h3 className="text-xl font-medium mb-2">Physical-Environment Indicator</h3>
                    <p>This section will be implemented in the future.</p>
                  </div>
                </div>
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
                    <span className="font-medium">Physical-Environment:</span> Coming in a future update.
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
