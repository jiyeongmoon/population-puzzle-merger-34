
import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, Download, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export type ProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

interface ProcessingStatusProps {
  status: ProcessingStatus;
  progress?: number;
  errorMessage?: string;
  onDownload?: () => void;
  className?: string;
  previewData?: {
    headers: string[];
    rows: Record<string, string>[];
  };
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  status,
  progress = 0,
  errorMessage,
  onDownload,
  className,
  previewData,
}) => {
  const [showPreview, setShowPreview] = React.useState(true);
  
  const togglePreview = () => setShowPreview(prev => !prev);
  
  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <div className="text-center text-muted-foreground text-sm">
            Upload files to begin processing
          </div>
        );
      
      case 'processing':
        return (
          <div className="w-full space-y-3 animate-fade-in">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Processing files...</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="progress-bar animate-progress" 
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {progress < 100 
                ? 'Filtering and combining population data' 
                : 'Creating pivot table by region and year'
              }
            </p>
          </div>
        );
      
      case 'success':
        return (
          <div className="space-y-4 text-center animate-scale-in w-full">
            <div className="inline-flex items-center justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-medium">Processing Complete</h3>
              <p className="text-sm text-muted-foreground">
                Your population data has been successfully filtered and pivoted by region and year
              </p>
            </div>
            
            {previewData && previewData.rows.length > 0 && (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Data Preview</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={togglePreview}
                    className="flex items-center gap-1"
                  >
                    {showPreview ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Hide Preview</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Show Preview</span>
                      </>
                    )}
                  </Button>
                </div>
                
                {showPreview && (
                  <div className="w-full rounded border overflow-auto max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.headers.map((header, index) => (
                            <TableHead key={index} className={index === 0 ? "sticky left-0 z-10 bg-background border-r" : ""}>
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.rows.slice(0, 10).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {previewData.headers.map((header, cellIndex) => (
                              <TableCell 
                                key={`${rowIndex}-${cellIndex}`}
                                className={cellIndex === 0 ? "sticky left-0 z-10 bg-background border-r font-medium" : ""}
                              >
                                {row[header]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {previewData.rows.length > 10 && (
                      <div className="p-2 text-center text-sm text-muted-foreground border-t">
                        Showing 10 of {previewData.rows.length} rows
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <Button 
              onClick={onDownload}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Excel File
            </Button>
          </div>
        );
      
      case 'error':
        return (
          <div className="space-y-3 text-center text-destructive animate-fade-in">
            <h3 className="text-base font-medium">Processing Failed</h3>
            <p className="text-sm">
              {errorMessage || 'An error occurred while processing the files'}
            </p>
            <p className="text-xs text-muted-foreground">
              Please check your files and try again
            </p>
          </div>
        );
    }
  };
  
  return (
    <div className={cn(
      "w-full p-6 glass-panel flex items-center justify-center min-h-[150px]",
      status === 'success' && previewData && "items-start",
      className
    )}>
      {renderContent()}
    </div>
  );
};

export default ProcessingStatus;
