
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import FileUploader from '@/components/FileUploader';
import ProcessingStatus, { ProcessingStatus as Status } from '@/components/ProcessingStatus';
import { processFiles, downloadResult, downloadExcel, ProcessingResult, IndicatorType, sanitizeFileName } from '@/lib/fileProcessor';
import { Button } from '@/components/ui/button';
import { Info, Sparkles, BarChart4, Download, RefreshCcw, MapPin } from 'lucide-react';
import IndicatorTabs from '@/components/IndicatorTabs';
import { TabsContent } from '@/components/ui/tabs';
import { toast } from "sonner";
import { Input } from '@/components/ui/input';
import MapViewer from '@/components/MapViewer';

const Index = () => {
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType>('population');
  const [locationName, setLocationName] = useState<string>('');
  
  const [populationFiles, setPopulationFiles] = useState<File[]>([]);
  const [populationStatus, setPopulationStatus] = useState<Status>('idle');
  const [populationProgress, setPopulationProgress] = useState(0);
  const [populationResult, setPopulationResult] = useState<ProcessingResult | null>(null);
  const [populationError, setPopulationError] = useState<string | null>(null);
  
  const [industryFiles, setIndustryFiles] = useState<File[]>([]);
  const [industryStatus, setIndustryStatus] = useState<Status>('idle');
  const [industryProgress, setIndustryProgress] = useState(0);
  const [industryResult, setIndustryResult] = useState<ProcessingResult | null>(null);
  const [industryError, setIndustryError] = useState<string | null>(null);
  
  const [environmentFiles, setEnvironmentFiles] = useState<File[]>([]);
  const [environmentStatus, setEnvironmentStatus] = useState<Status>('idle');
  const [environmentProgress, setEnvironmentProgress] = useState(0);
  const [environmentResult, setEnvironmentResult] = useState<ProcessingResult | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  
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
        toast.error("모든 세 가지 지표를 먼저 처리해 주세요");
      } else {
        toast.error("먼저 파일을 업로드해 주세요");
      }
      return;
    }
    
    try {
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
      
      const processResult = await processFiles(files, activeIndicator);
      clearInterval(progressInterval);
      
      if (activeIndicator === 'population') {
        setPopulationProgress(100);
      } else if (activeIndicator === 'industry') {
        setIndustryProgress(100);
      } else if (activeIndicator === 'environment') {
        setEnvironmentProgress(100);
      } else if (activeIndicator === 'summary') {
        setSummaryProgress(100);
      }
      
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
      downloadResult(populationResult.blobUrl, locationName);
    } else if (activeIndicator === 'industry' && industryResult?.blobUrl) {
      downloadResult(industryResult.blobUrl, locationName);
    } else if (activeIndicator === 'environment' && environmentResult?.blobUrl) {
      downloadResult(environmentResult.blobUrl, locationName);
    } else if (activeIndicator === 'summary' && summaryResult?.blobUrl) {
      downloadResult(summaryResult.blobUrl, locationName);
    }
  };

  const handleDownloadExcel = () => {
    let fileName = '';
    
    if (activeIndicator === 'population') {
      fileName = '인문사회.xlsx';
    } else if (activeIndicator === 'industry') {
      fileName = '산업경제.xlsx';
    } else if (activeIndicator === 'environment') {
      fileName = '물리환경.xlsx';
    } else if (activeIndicator === 'summary') {
      fileName = '쇠퇴지표 종합.xlsx';
    }
    
    const result = 
      activeIndicator === 'population' ? populationResult :
      activeIndicator === 'industry' ? industryResult :
      activeIndicator === 'environment' ? environmentResult :
      summaryResult;
    
    if (result?.excelBlob) {
      downloadExcel(result.excelBlob, fileName, locationName);
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
    
    toast.info("초기화 완료");
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
            <h1 className="text-lg font-medium">지역쇠퇴지표</h1>
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
              지역쇠퇴지표
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              여러 지표에서 쇠퇴 추세를 식별하고 분석하기 위해 데이터 파일을 업로드하세요.
            </p>
            
            <div className="flex justify-center mt-6">
              <div className="w-full max-w-xs">
                <Input 
                  placeholder="지역명 입력 (예: 청주시)"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-white border-2 border-primary/20 focus:border-primary/50 shadow-sm"
                />
              </div>
            </div>
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
                      <h3 className="text-xl font-medium">인문사회 지표</h3>
                      {populationStatus === 'success' && (
                        <Button variant="outline" onClick={handleReset} size="sm">
                          다시 시작
                        </Button>
                      )}
                    </div>
                    
                    <FileUploader 
                      onFilesSelected={handleFilesSelected}
                      accept=".txt"
                      sectionTitle="인구 데이터 파일 업로드"
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
                          초기화
                        </Button>
                      )}
                      
                      {populationStatus === 'idle' && populationFiles.length > 0 && (
                        <Button onClick={handleProcessFiles}>
                          인구 데이터 분석
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
                    onDownload={() => downloadResult(populationResult?.blobUrl || '', locationName)}
                    previewData={populationResult?.previewData}
                  />
                </div>
                
                {populationStatus === 'success' && populationResult?.excelBlob && (
                  <div className="mt-4 space-y-4">
                    <div className="flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4" />
                        엑셀 형식 다운로드
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="industry" className="mt-6">
                <div className="glass-panel p-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xl font-medium">산업경제 지표</h3>
                      {industryStatus === 'success' && (
                        <Button variant="outline" onClick={handleReset} size="sm">
                          다시 시작
                        </Button>
                      )}
                    </div>
                    
                    <FileUploader 
                      onFilesSelected={handleFilesSelected}
                      accept=".txt"
                      sectionTitle="산업 데이터 파일 업로드"
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
                          초기화
                        </Button>
                      )}
                      
                      {industryStatus === 'idle' && industryFiles.length > 0 && (
                        <Button onClick={handleProcessFiles}>
                          사업체 쇠퇴 분석
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
                    onDownload={() => downloadResult(industryResult?.blobUrl || '', locationName)}
                    previewData={industryResult?.previewData}
                  />
                </div>
                
                {industryStatus === 'success' && industryResult?.excelBlob && (
                  <div className="mt-4 space-y-4">
                    <div className="flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4" />
                        엑셀 형식 다운로드
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="environment" className="mt-6">
                <div className="glass-panel p-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xl font-medium">물리환경 지표</h3>
                      {environmentStatus === 'success' && (
                        <Button variant="outline" onClick={handleReset} size="sm">
                          다시 시작
                        </Button>
                      )}
                    </div>
                    
                    <FileUploader 
                      onFilesSelected={handleFilesSelected}
                      accept=".txt"
                      sectionTitle="건물 연령 데이터 파일 업로드 (2023)"
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
                          초기화
                        </Button>
                      )}
                      
                      {environmentStatus === 'idle' && environmentFiles.length > 0 && (
                        <Button onClick={handleProcessFiles}>
                          건물 연령 분석
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
                    onDownload={() => downloadResult(environmentResult?.blobUrl || '', locationName)}
                    previewData={environmentResult?.previewData}
                  />
                </div>
                
                {environmentStatus === 'success' && environmentResult?.excelBlob && (
                  <div className="mt-4 space-y-4">
                    <div className="flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4" />
                        엑셀 형식 다운로드
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="summary" className="mt-6">
                <div className="glass-panel p-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xl font-medium">종합 요약</h3>
                      {summaryStatus === 'success' && (
                        <Button variant="outline" onClick={handleReset} size="sm">
                          재계산
                        </Button>
                      )}
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-md space-y-4">
                      <div className="flex items-start gap-3">
                        <BarChart4 className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <h3 className="font-medium">지표 상태</h3>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${populationStatus === 'success' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <span>인문사회: {populationStatus === 'success' ? '처리됨' : '처리되지 않음'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${industryStatus === 'success' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <span>산업경제: {industryStatus === 'success' ? '처리됨' : '처리되지 않음'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${environmentStatus === 'success' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <span>물리환경: {environmentStatus === 'success' ? '처리됨' : '처리되지 않음'}</span>
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
                          초기화
                        </Button>
                      )}
                    
                      {summaryStatus === 'idle' && populationStatus === 'success' && 
                       industryStatus === 'success' && environmentStatus === 'success' && (
                        <Button onClick={handleProcessFiles}>
                          종합 분석 생성
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
                    onDownload={() => downloadResult(summaryResult?.blobUrl || '', locationName)}
                    previewData={summaryResult?.previewData}
                  />
                </div>
                
                {/* Map Section */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">지역 지도 시각화</h3>
                    </div>
                  </div>
                  
                  <MapViewer 
                    summaryData={summaryResult?.previewData?.rows}
                  />
                  
                  <div className="p-3 bg-muted/30 rounded text-sm text-muted-foreground">
                    <p>위 지도는 GeoJSON 데이터를 기반으로 행정구역을 시각화합니다. 지역을 클릭하면 해당 지역의 상세 정보를 확인할 수 있습니다.</p>
                  </div>
                </div>
                
                {summaryStatus === 'success' && summaryResult?.excelBlob && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="outline"
                      onClick={() => downloadExcel(summaryResult.excelBlob, '쇠퇴지표 종합.xlsx', locationName)}
                      className="flex items-center gap-2 mt-2"
                    >
                      <Download className="h-4 w-4" />
                      엑셀 형식 다운로드
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
                <h3 className="font-medium">이 분석에 대하여</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  이 도구는 여러 지표를 사용하여 지역 쇠퇴를 분석합니다:
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2 space-y-1">
                  <li>
                    <span className="font-medium">[인문사회]</span> 인구가 현저히 감소하는 지역: 다음 각 목의 어느 하나 이상에 해당하는 지역
                    <ul className="pl-5 space-y-1 mt-1">
                      <li>가. 최근 30년간 인구가 가장 많았던 시기와 비교하여 20퍼센트 이상 인구가 감소한 지역</li>
                      <li>나. 최근 5년간 3년 이상 연속으로 인구가 감소한 지역</li>
                    </ul>
                  </li>
                  <li>
                    <span className="font-medium">[산업경제]</span> 총 사업체 수의 감소 등 산업의 이탈이 발생되는 지역: 다음 각 목의 어느 하나 이상에 해당하는 지역
                    <ul className="pl-5 space-y-1 mt-1">
                      <li>가. 최근 10년간 총 사업체 수가 가장 많았던 시기와 비교하여 5퍼센트 이상 총 사업체 수가 감소한 지역</li>
                      <li>나. 최근 5년간 3년 이상 연속으로 총 사업체 수가 감소한 지역</li>
                    </ul>
                  </li>
                  <li>
                    <span className="font-medium">[물리환경]</span> 건축물의 노후화가 진행되는 지역: 다음에 해당하는 지역
                    <ul className="pl-5 space-y-1 mt-1">
                      <li>전체 건축물 중에서 준공된 후 20년 이상 지난 건축물이 차지하는 비율이 50퍼센트 이상인 지역</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
};

export default Index;
