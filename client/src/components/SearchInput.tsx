import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";

interface SearchInputProps {
  onSearch: (query: string) => void;
  isSearching?: boolean;
}

export default function SearchInput({ onSearch, isSearching = false }: SearchInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const suggestions = [
    "photos with people smiling",
    "documents with text",
    "sunset or sunrise photos",
    "screenshots of code",
    "red cars and mountains"
  ];

  const fillSuggestion = (suggestion: string) => {
    setQuery(suggestion);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your images with natural language (e.g., 'photos with dogs and mountains', 'screenshots of code', 'documents with text about travel')"
          className="pl-10 pr-20 py-4 text-lg"
          disabled={isSearching}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <Button 
            type="submit" 
            disabled={!query.trim() || isSearching}
            className="px-4 py-2"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>
      </form>
      
      {/* Search suggestions */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-slate-600">Try:</span>
        {suggestions.map((suggestion) => (
          <Badge
            key={suggestion}
            variant="secondary"
            className="cursor-pointer hover:bg-slate-200 transition-colors"
            onClick={() => fillSuggestion(suggestion)}
          >
            "{suggestion}"
          </Badge>
        ))}
      </div>
    </div>
  );
}
