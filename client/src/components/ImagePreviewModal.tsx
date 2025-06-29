import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, FileText, MapPin, Camera, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Image } from "@/lib/types";

interface ImagePreviewModalProps {
  image: Image & { similarity?: number };
  onClose: () => void;
}

export default function ImagePreviewModal({ image, onClose }: ImagePreviewModalProps) {
  const { toast } = useToast();

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const copyPath = () => {
    navigator.clipboard.writeText(image.filepath);
    toast({
      title: "Path Copied",
      description: "File path has been copied to clipboard.",
    });
  };

  const openInExplorer = () => {
    // In a real app, this would trigger a native file explorer
    toast({
      title: "Open in Explorer",
      description: "This would open the file in your system's file explorer.",
    });
  };

  const getPlaceholderImage = (filename: string): string => {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('car') || lowerFilename.includes('vehicle')) {
      return "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
    }
    if (lowerFilename.includes('mountain') || lowerFilename.includes('landscape')) {
      return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
    }
    if (lowerFilename.includes('sunset') || lowerFilename.includes('sunrise')) {
      return "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
    }
    
    return "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{image.filename}</span>
            {image.similarity && (
              <Badge className="bg-green-500 text-white">
                {Math.round(image.similarity * 100)}% match
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image Preview */}
          <div className="lg:col-span-2">
            <div className="aspect-video overflow-hidden rounded-lg bg-slate-100">
              <img
                src={getPlaceholderImage(image.filename)}
                alt={image.filename}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          
          {/* Metadata Sidebar */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">File Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Filename:</span>
                  <span className="font-mono text-xs">{image.filename}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-600">Size:</span>
                  <span>{formatFileSize(image.fileSize)}</span>
                </div>
                
                {image.dimensions && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dimensions:</span>
                    <span>{image.dimensions}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-slate-600">Created:</span>
                  <span>{formatDate(image.dateCreated)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-600">Modified:</span>
                  <span>{formatDate(image.dateModified)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Similarity Score */}
            {image.similarity && (
              <>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Similarity Score</h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(image.similarity * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      {Math.round(image.similarity * 100)}%
                    </span>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* OCR Text */}
            {image.ocrText && (
              <>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Extracted Text (OCR)
                  </h4>
                  <div className="bg-slate-50 rounded p-3 text-sm font-mono break-words">
                    {image.ocrText}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Metadata */}
            {image.metadata && (
              <>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center">
                    <Camera className="w-4 h-4 mr-2" />
                    Metadata
                  </h4>
                  <div className="space-y-1 text-sm">
                    {typeof image.metadata === 'object' && Object.entries(image.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-slate-600 capitalize">{key}:</span>
                        <span className="font-mono text-xs">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* File Path */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">File Path</h4>
              <div className="bg-slate-50 rounded p-3 text-sm font-mono break-all">
                {image.filepath}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button 
                onClick={openInExplorer}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Explorer
              </Button>
              <Button 
                variant="outline"
                onClick={copyPath}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Path
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
