import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Image, CheckCircle, AlertCircle } from "lucide-react";
import type { ProcessingStatus } from "@/lib/types";

interface ProcessingIndicatorProps {
  status: ProcessingStatus;
}

export default function ProcessingIndicator({ status }: ProcessingIndicatorProps) {
  const progressPercentage = status.totalImages > 0 
    ? (status.processedImages / status.totalImages) * 100 
    : 0;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-blue-900">Processing Images</h3>
              <span className="text-sm text-blue-700">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className="mb-2 h-2"
            />
            
            <div className="flex items-center justify-between text-sm text-blue-700">
              <div className="flex items-center space-x-4">
                {status.currentFile && (
                  <span className="flex items-center">
                    <Image className="w-4 h-4 mr-1" />
                    Processing: {status.currentFile}
                  </span>
                )}
              </div>
              
              <span>
                {status.processedImages} of {status.totalImages} images
              </span>
            </div>
          </div>
        </div>

        {/* Processing Steps */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-slate-600">File scanning</span>
          </div>
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-slate-600">CLIP embeddings</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">OCR extraction</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
