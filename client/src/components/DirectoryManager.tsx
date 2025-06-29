import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FolderPlus, Folder, Trash2 } from "lucide-react";
import type { Directory, InsertDirectory } from "@/lib/types";

interface DirectoryManagerProps {
  directories: Directory[];
  onDirectoryAdded?: () => void;
}

export default function DirectoryManager({ directories, onDirectoryAdded }: DirectoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addDirectoryMutation = useMutation({
    mutationFn: async (directoryData: InsertDirectory) => {
      const response = await apiRequest("POST", "/api/directories", directoryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Directory Added",
        description: "Directory has been added and scanning has started.",
      });
      onDirectoryAdded?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add directory.",
        variant: "destructive",
      });
    },
  });

  const deleteDirectoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/directories/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Directory Removed",
        description: "Directory and associated images have been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove directory.",
        variant: "destructive",
      });
    },
  });

  const handleAddDirectory = async () => {
    try {
      // In a real app, this would open a native directory picker
      // For demo purposes, we'll use a prompt
      const directoryPath = prompt("Enter directory path to scan:");
      if (!directoryPath) return;

      const name = directoryPath.split('/').pop() || directoryPath;
      
      addDirectoryMutation.mutate({
        path: directoryPath,
        name,
        isWatched: true,
      });
    } catch (error) {
      console.error("Error adding directory:", error);
    }
  };

  const handleDeleteDirectory = (id: number) => {
    if (confirm("Are you sure you want to remove this directory? All associated images will be removed from the index.")) {
      deleteDirectoryMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scan Directories</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleAddDirectory}
            disabled={addDirectoryMutation.isPending}
            className="w-full"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Folder
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Watched Folders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {directories.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No directories added yet. Add a folder to start scanning images.
              </p>
            ) : (
              directories.map((directory) => (
                <div
                  key={directory.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Folder className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate" title={directory.path}>
                        {directory.name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {directory.imageCount || 0} images
                        </Badge>
                        {directory.lastScanned && (
                          <span className="text-xs text-slate-500">
                            Last scanned: {new Date(directory.lastScanned).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDirectory(directory.id)}
                    disabled={deleteDirectoryMutation.isPending}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
