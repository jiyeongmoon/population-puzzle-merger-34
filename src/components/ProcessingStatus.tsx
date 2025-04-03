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
            파일을 업로드하여 분석을 시작하세요
          </div>
        );
      
      case 'processing':
        return (
          <div className="w-full space-y-3 animate-fade-in">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">파일 처리 중...</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="progress-bar animate-progress" 
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {progress < 50 
                ? '데이터 필터링 및 결합' 
                : progress < 80
                ? '지역 및 연도별 피벗 테이블 생성'
                : '감소 추세 분석'
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
              <h3 className="text-base font-medium">분석 완료</h3>
              <p className="text-sm text-muted-foreground">
                감소 패턴에 대한 데이터 분석이 완료되었습니다
              </p>
            </div>
            
            {previewData && previewData.rows.length > 0 && (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">분석 미리보기</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={togglePreview}
                    className="flex items-center gap-1"
                  >
                    {showPreview ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>미리보기 숨기기</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>미리보기 보기</span>
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
                            <Star className="inline h-3.5 w-3.5 text-amber-500" />
                            <span>인구 최대 연도</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 font-medium">▼</span>
                            <span>감소 연도</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <Star className="inline h-3.5 w-3.5 text-amber-500" />
                            <span>최대값 연도 (최근 10년)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 font-medium">▼</span>
                            <span>감소 연도</span>
                          </div>
                        </>
                      )}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.headers.map((header, index) => {
                            // Translate headers to Korean
                            let koreanHeader = header;
                            
                            // Translation mapping
                            if (header === 'Region Code') koreanHeader = '집계구 코드';
                            else if (header === 'Pop. Decline ≥20%') koreanHeader = '인구 감소 ≥20%';
                            else if (header === 'Pop. Consec. Decline') koreanHeader = '인구 연속 감소';
                            else if (header === 'Pop. Category Met') koreanHeader = '인구 지표 충족';
                            else if (header === 'Pop. Decline Rate') koreanHeader = '인구 감소율';
                            else if (header === 'Ind. Decline ≥5%') koreanHeader = '산업 감소 ≥5%';
                            else if (header === 'Ind. Consec. Decline') koreanHeader = '산업 연속 감소';
                            else if (header === 'Ind. Category Met') koreanHeader = '산업 지표 충족';
                            else if (header === 'Ind. Decline Rate') koreanHeader = '산업 감소율';
                            else if (header === 'Env. Category Met') koreanHeader = '환경 지표 충족';
                            else if (header === 'Total Categories') koreanHeader = '총 충족 지표 수';
                            
                            // Determine category for the header to apply appropriate styling
                            let categoryClass = "";
                            
                            // Population-Social category (light red/pink)
                            if (header.startsWith('Pop.') || header === 'Region Code') {
                              categoryClass = "bg-rose-50";
                            }
                            // Industrial-Economy category (light orange/yellow)
                            else if (header.startsWith('Ind.')) {
                              categoryClass = "bg-amber-50";
                            }
                            // Physical-Environment category (light green)
                            else if (header.startsWith('Env.')) {
                              categoryClass = "bg-emerald-50";
                            }
                            // Total Categories column (neutral with conditional highlight)
                            else if (header === 'Total Categories') {
                              categoryClass = "bg-slate-50";
                            }
                            
                            return (
                              <TableHead 
                                key={index} 
                                className={cn(
                                  categoryClass,
                                  index === 0 ? "sticky left-0 z-10 bg-background border-r" : "",
                                  index > previewData.headers.length - 4 ? "bg-muted/20" : ""
                                )}
                              >
                                {koreanHeader}
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.rows.slice(0, 10).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {previewData.headers.map((header, cellIndex) => {
                              const value = row[header] || '';
                              
                              const hasArrowUp = value.includes('▲');
                              const hasArrowDown = value.includes('▼');
                              const hasStar = value.includes('★');
                              
                              let cleanValue = value;
                              if (hasArrowUp) cleanValue = value.replace(' ▲', '');
                              else if (hasArrowDown) cleanValue = value.replace(' ▼', '');
                              else if (hasStar) cleanValue = value.replace(' ★', '');

                              // Determine category for the cell to apply appropriate styling
                              let categoryClass = "";
                              
                              // Population-Social category (light red/pink)
                              if (header.startsWith('Pop.') || header === 'Region Code') {
                                categoryClass = "bg-rose-50";
                              }
                              // Industrial-Economy category (light orange/yellow)
                              if (header.startsWith('Ind.')) {
                                categoryClass = "bg-amber-50";
                              }
                              // Physical-Environment category (light green)
                              else if (header.startsWith('Env.')) {
                                categoryClass = "bg-emerald-50";
                              }
                              // Total Categories column (neutral with conditional highlight)
                              else if (header === 'Total Categories') {
                                categoryClass = "bg-slate-50";
                                // Optional highlight for values 2 or 3
                                if (value === '2' || value === '3') {
                                  categoryClass = "bg-blue-100 font-medium";
                                }
                              }
                              
                              let additionalClasses = categoryClass;
                              if (cellIndex === 0) {
                                additionalClasses += " sticky left-0 z-10 bg-background border-r font-medium";
                              }
                              if ((header === 'Pop. Decline ≥20%' || header === 'Ind. Decline ≥5%') && value === 'O') {
                                additionalClasses += " text-red-600 font-bold";
                              }
                              if ((header === 'Pop. Consec. Decline' || header === 'Ind. Consec. Decline') && value === 'O') {
                                additionalClasses += " text-orange-600 font-bold";
                              }
                              if ((header === 'Pop. Category Met' || header === 'Ind. Category Met' || header === 'Env. Category Met') && value === 'O') {
                                additionalClasses += " text-blue-600 font-bold";
                              }
                              if (header === 'Pop. Decline Rate' && value.startsWith('-')) {
                                additionalClasses += " text-red-600";
                              } else if (header === 'Pop. Decline Rate' && !value.startsWith('-') && value !== '0.00%') {
                                additionalClasses += " text-green-600";
                              }
                              if (header === 'Ind. Decline Rate' && value.startsWith('-')) {
                                additionalClasses += " text-red-600";
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
                        {previewData.rows.length}개 중 10개 표시
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
              CSV 다운로드
            </Button>
          </div>
        );
      
      case 'error':
        return (
          <div className="space-y-3 text-center text-destructive animate-fade-in">
            <h3 className="text-base font-medium">처리 실패</h3>
            <p className="text-sm">
              {errorMessage || '파일 처리 중 오류가 발생했습니다'}
            </p>
            <p className="text-xs text-muted-foreground">
              파일을 확인하고 다시 시도하세요
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
