import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SearchInput from "@/components/SearchInput";
import DirectoryManager from "@/components/DirectoryManager";
import ImageGrid from "@/components/ImageGrid";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import ProcessingIndicator from "@/components/ProcessingIndicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Database } from "lucide-react";
import type { Directory, Image, SearchResponse, DirectoryStats, ProcessingStatus } from "@/lib/types";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch directories
  const { data: directories = [] } = useQuery<Directory[]>({
    queryKey: ["/api/directories"],
  });

  // Fetch stats
  const { data: stats } = useQuery<DirectoryStats>({
    queryKey: ["/api/stats"],
  });

  // Fetch processing status
  const { data: processingStatus } = useQuery<ProcessingStatus>({
    queryKey: ["/api/processing-status"],
    refetchInterval: 1000, // Poll every second when processing
  });

  // Fetch recent searches
  const { data: recentSearches = [] } = useQuery({
    queryKey: ["/api/searches/recent"],
  });

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error("Search failed");
      }
      
      const results: SearchResponse = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRerunSearch = (query: string) => {
    handleSearch(query);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AI Image Assistant</h1>
              <p className="text-sm text-slate-500">Smart personal search system</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 text-sm text-slate-600">
              <Database className="w-4 h-4 text-green-600" />
              <span>{stats?.indexedImages || 0}</span>
              <span>of</span>
              <span>{stats?.totalImages || 0}</span>
              <span>images indexed</span>
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
          <DirectoryManager 
            directories={directories}
            onDirectoryAdded={() => {
              // Refresh directories query
            }}
          />
          
          <div className="p-4 flex-1">
            <h4 className="font-medium text-slate-900 mb-3">Recent Searches</h4>
            <div className="space-y-2">
              {recentSearches.map((search: any) => (
                <button
                  key={search.id}
                  onClick={() => handleRerunSearch(search.query)}
                  className="w-full text-left p-2 hover:bg-slate-50 rounded text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <span className="mr-2">🕒</span>
                  {search.query}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Search Section */}
          <div className="bg-white border-b border-slate-200 p-4 lg:p-6">
            <div className="max-w-4xl mx-auto">
              <SearchInput 
                onSearch={handleSearch}
                isSearching={isSearching}
              />
            </div>
          </div>

          {/* Processing Indicator */}
          {processingStatus?.isProcessing && (
            <ProcessingIndicator status={processingStatus} />
          )}

          {/* Results Area */}
          <div className="flex-1 overflow-auto">
            {searchResults ? (
              <div className="p-4 lg:p-6">
                <div className="max-w-7xl mx-auto">
                  {/* Results Header */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Search Results for <span className="text-primary">"{searchResults.query}"</span>
                    </h2>
                    <p className="text-sm text-slate-600">
                      {searchResults.resultCount} images found in {searchResults.searchTime.toFixed(2)} seconds
                    </p>
                  </div>

                  {/* Results Grid */}
                  <ImageGrid 
                    images={searchResults.results}
                    onImageSelect={setSelectedImage}
                  />
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Database className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Start Searching Your Images</h3>
                  <p className="text-slate-600 mb-6">Use natural language to find exactly what you're looking for in your image collection.</p>
                  <div className="space-y-2 text-sm text-slate-500">
                    <p><strong>Example searches:</strong></p>
                    <p>"photos with my family at the beach"</p>
                    <p>"screenshots containing code"</p>
                    <p>"documents with handwritten text"</p>
                    <p>"sunset photos from last year"</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <ImagePreviewModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}
