
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import FileUploader from '@/components/FileUploader';
import ProcessingStatus, { ProcessingStatus as Status } from '@/components/ProcessingStatus';
import { processFiles, downloadResult, ProcessingResult } from '@/lib/fileProcessor';
import { Button } from '@/components/ui/button';
import { Info, Sparkles } from 'lucide-react';

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    if (status === 'error') {
      setStatus('idle');
      setError(null);
    }
  };

  const handleProcessFiles = async () => {
    if (!files.length) return;
    
    try {
      setStatus('processing');
      setProgress(0);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.random() * 15;
        });
      }, 600);
      
      const processResult = await processFiles(files);
      clearInterval(progressInterval);
      setProgress(100);
      
      // Short delay before showing final status
      setTimeout(() => {
        if (processResult.success) {
          setStatus('success');
          setResult(processResult);
        } else {
          setStatus('error');
          setError(processResult.message);
        }
      }, 500);
      
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const handleDownload = () => {
    if (result?.blobUrl) {
      downloadResult(result.blobUrl);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError(null);
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

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="w-full py-6 px-6 sm:px-8 border-b backdrop-blur-md bg-background/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-primary mr-2" />
            <h1 className="text-lg font-medium">Population Data Merger</h1>
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
              Combine Population Data Files
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Upload population data text files to combine them into a single Excel file, 
              organized by year and administrative area.
            </p>
          </motion.div>
          
          <motion.div variants={itemAnimation} className="glass-panel p-8">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-medium">Upload Files</h3>
                {status === 'success' && (
                  <Button variant="outline" onClick={handleReset} size="sm">
                    Start Over
                  </Button>
                )}
              </div>
              
              <FileUploader 
                onFilesSelected={handleFilesSelected}
                accept=".txt"
              />
              
              <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end">
                {status === 'idle' && files.length > 0 && (
                  <Button onClick={handleProcessFiles}>
                    Process Files
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
          
          <motion.div variants={itemAnimation}>
            <ProcessingStatus
              status={status}
              progress={progress}
              errorMessage={error || undefined}
              onDownload={handleDownload}
              previewData={result?.previewData}
            />
          </motion.div>
          
          <motion.div variants={itemAnimation} className="glass-panel p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">About This Tool</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This tool processes population data files delimited by the ^ symbol. 
                  It extracts the year from the first column, filters rows with data_code = "to_in_001", 
                  and generates a pivoted Excel file organized by administrative area and year.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.main>
      
      <footer className="py-6 px-6 sm:px-8 border-t">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-sm text-muted-foreground text-center">
            Population Data Merger — Built with precision and care
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
