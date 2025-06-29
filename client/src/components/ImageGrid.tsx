import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, MapPin, FileText, Calendar } from "lucide-react";
import type { Image } from "@/lib/types";

interface ImageGridProps {
  images: Array<Image & { similarity?: number }>;
  onImageSelect: (image: Image) => void;
}

export default function ImageGrid({ images, onImageSelect }: ImageGridProps) {
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return "bg-green-500";
    if (similarity >= 0.8) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {images.map((image) => (
        <Card
          key={image.id}
          className="group cursor-pointer hover:shadow-lg transition-all duration-200 border border-slate-200 hover:border-slate-300"
          onClick={() => onImageSelect(image)}
        >
          <div className="aspect-square relative overflow-hidden rounded-t-lg bg-slate-100">
            {/* For demo, using placeholder images based on filename */}
            <img
              src={getPlaceholderImage(image.filename)}
              alt={image.filename}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            {image.similarity && (
              <div className="absolute top-2 right-2">
                <Badge 
                  className={`text-white text-xs ${getSimilarityColor(image.similarity)}`}
                >
                  {Math.round(image.similarity * 100)}%
                </Badge>
              </div>
            )}
          </div>
          <CardContent className="p-3">
            <p className="text-sm font-medium text-slate-900 truncate" title={image.filename}>
              {image.filename}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatDate(image.dateCreated)}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-1">
                {image.ocrText && (
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="Text detected" />
                )}
                {image.metadata && (
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" title="Has metadata" />
                )}
              </div>
              <span className="text-xs text-slate-500">
                {formatFileSize(image.fileSize)}
              </span>
            </div>

            {image.ocrText && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Text detected
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Helper function to get placeholder images based on filename patterns
function getPlaceholderImage(filename: string): string {
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.includes('car') || lowerFilename.includes('vehicle')) {
    return "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400";
  }
  if (lowerFilename.includes('mountain') || lowerFilename.includes('landscape')) {
    return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400";
  }
  if (lowerFilename.includes('sunset') || lowerFilename.includes('sunrise')) {
    return "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400";
  }
  if (lowerFilename.includes('beach') || lowerFilename.includes('ocean')) {
    return "https://images.unsplash.com/photo-1505142468610-359e7d316be0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400";
  }
  if (lowerFilename.includes('city') || lowerFilename.includes('urban')) {
    return "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400";
  }
  
  // Default placeholder
  return "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400";
}
