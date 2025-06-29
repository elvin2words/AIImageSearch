import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onUpload?: (files: File[]) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (results: any[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onUpload,
  onUploadProgress,
  onUploadComplete,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp']
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  disabled = false,
  className,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(acceptedFiles);
    if (onUpload) {
      onUpload(acceptedFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    disabled: disabled || isUploading,
  });

  const removeFile = (index: number) => {
    setUploadedFiles(files => files.filter((_, i) => i !== index));
  };

  const startUpload = async () => {
    if (uploadedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const results: any[] = [];
      
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const formData = new FormData();
        formData.append('file', file);

        // Simulate upload progress
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          results.push(result);
        }

        const progress = ((i + 1) / uploadedFiles.length) * 100;
        setUploadProgress(progress);
        if (onUploadProgress) {
          onUploadProgress(progress);
        }
      }

      setUploadResults(results);
      if (onUploadComplete) {
        onUploadComplete(results);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive ? "border-primary bg-primary/5" : "border-slate-300",
          disabled || isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary"
        )}
      >
        <CardContent className="p-8 text-center">
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          
          {isDragActive ? (
            <p className="text-primary font-medium">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-slate-600 mb-2">
                Drag & drop images here, or click to select files
              </p>
              <p className="text-sm text-slate-500">
                Supports: JPEG, PNG, WebP, GIF, BMP (max {formatFileSize(maxSize)})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Some files were rejected:</span>
            </div>
            {fileRejections.map(({ file, errors }) => (
              <div key={file.name} className="text-sm text-red-600">
                {file.name}: {errors.map(e => e.message).join(', ')}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Selected Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Selected Files ({uploadedFiles.length})</h4>
              {!isUploading && (
                <Button onClick={startUpload} disabled={uploadedFiles.length === 0}>
                  Start Upload
                </Button>
              )}
            </div>

            {isUploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Uploading...</span>
                  <span className="text-sm text-slate-600">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded"
                >
                  <div className="flex items-center space-x-3">
                    <File className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {uploadResults[index] ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : isUploading && index < uploadProgress / (100 / uploadedFiles.length) ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : null}
                    
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
