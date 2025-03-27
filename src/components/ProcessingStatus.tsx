
import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, Download, Eye, EyeOff, ArrowUp, ArrowDown, Star } from 'lucide-react';
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
              {progress < 50 
                ? 'Filtering and combining data' 
                : progress < 80
                ? 'Creating pivot table by region and year'
                : 'Analyzing decline trends'
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
              <h3 className="text-base font-medium">Analysis Complete</h3>
              <p className="text-sm text-muted-foreground">
                Data has been analyzed for decline patterns
              </p>
            </div>
            
            {previewData && previewData.rows.length > 0 && (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Analysis Preview</h4>
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
                  <div className="w-full rounded border overflow-auto max-h-[400px]">
                    <div className="p-2 bg-muted/30 text-xs space-y-1">
                      {previewData.headers.includes('Decline ≥20%') ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-green-600 font-medium">▲</span>
                            <span>Peak population year</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 font-medium">▼</span>
                            <span>Declining year</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500 font-medium">★</span>
                            <span>Peak value year (last 10 years)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 font-medium">▼</span>
                            <span>Declining year</span>
                          </div>
                        </>
                      )}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.headers.map((header, index) => (
                            <TableHead 
                              key={index} 
                              className={cn(
                                index === 0 ? "sticky left-0 z-10 bg-background border-r" : "",
                                index > previewData.headers.length - 4 ? "bg-muted/20" : ""
                              )}
                            >
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.rows.slice(0, 10).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {previewData.headers.map((header, cellIndex) => {
                              const value = row[header] || '';
                              
                              // Instead of creating JSX elements and assigning them to formattedValue,
                              // we'll render the formatting directly in the return statement
                              const hasArrowUp = value.includes('▲');
                              const hasArrowDown = value.includes('▼');
                              const hasStar = value.includes('★');
                              
                              let cleanValue = value;
                              if (hasArrowUp) cleanValue = value.replace(' ▲', '');
                              else if (hasArrowDown) cleanValue = value.replace(' ▼', '');
                              else if (hasStar) cleanValue = value.replace(' ★', '');

                              let additionalClasses = "";
                              if (cellIndex === 0) {
                                additionalClasses += "sticky left-0 z-10 bg-background border-r font-medium";
                              }
                              if (cellIndex > previewData.headers.length - 4) {
                                additionalClasses += " bg-muted/20";
                              }
                              if ((header === 'Decline ≥20%' || header === 'Decline ≥5%') && value === 'O') {
                                additionalClasses += " text-red-600 font-bold";
                              }
                              if (header === 'Consecutive Decline' || header === 'Consec. Decline') {
                                if (value === 'O') additionalClasses += " text-orange-600 font-bold";
                              }
                              if (header === 'Decline Rate' && value.startsWith('-')) {
                                additionalClasses += " text-red-600";
                              } else if (header === 'Decline Rate' && !value.startsWith('-') && value !== '0.00%') {
                                additionalClasses += " text-green-600";
                              }

                              return (
                                <TableCell 
                                  key={`${rowIndex}-${cellIndex}`}
                                  className={cn(additionalClasses)}
                                >
                                  {cleanValue}
                                  {hasArrowUp && <ArrowUp className="inline ml-1 h-3 w-3 text-green-600" />}
                                  {hasArrowDown && <ArrowDown className="inline ml-1 h-3 w-3 text-red-600" />}
                                  {hasStar && <Star className="inline ml-1 h-3 w-3 text-amber-500" />}
                                </TableCell>
                              );
                            })}
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
              Download Analysis CSV
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
