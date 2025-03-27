
import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  className?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  accept = '.txt',
  maxFiles = 100,
  className,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFiles = (fileList: File[]): boolean => {
    setError(null);
    
    // Check file count
    if (fileList.length > maxFiles) {
      setError(`Maximum of ${maxFiles} files allowed`);
      return false;
    }
    
    // Check file types
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const invalidFiles = fileList.filter(file => {
      return !acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else {
          return file.type === type;
        }
      });
    });
    
    if (invalidFiles.length > 0) {
      setError(`Only ${accept} files are accepted`);
      return false;
    }
    
    return true;
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFiles = Array.from(fileList);
    
    if (!validateFiles(newFiles)) return;
    
    setFiles(prev => {
      const combined = [...prev, ...newFiles];
      // Remove duplicates based on name
      const unique = Array.from(new Map(combined.map(file => [file.name, file])).values());
      return unique;
    });
    
    onFilesSelected(newFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const removeFile = (fileName: string) => {
    setFiles(prev => {
      const filtered = prev.filter(file => file.name !== fileName);
      onFilesSelected(filtered);
      return filtered;
    });
  };

  const extractYear = (fileName: string): string => {
    const yearMatch = fileName.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : 'Unknown';
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative w-full min-h-[200px] p-4 border-2 border-dashed rounded-lg transition-all duration-200',
          'flex flex-col items-center justify-center text-center',
          dragActive ? 'border-primary bg-primary/5' : 'border-border',
          files.length > 0 && 'pb-2'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          tabIndex={-1}
        />
        
        <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className={cn(
            'p-3 rounded-full transition-all duration-300',
            dragActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <Upload className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium">
              {dragActive ? 'Drop files here' : 'Upload population data files'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-[260px]">
              Drag and drop your .txt files here or click to browse
            </p>
          </div>
        </div>
        
        {files.length > 0 && (
          <div className="w-full mt-4 flex flex-col space-y-2">
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-background/80 rounded border"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">Year: {extractYear(file.name)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.name);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {error && (
        <div className="flex items-center space-x-2 mt-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
