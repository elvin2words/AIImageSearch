import { directories, images, searches, searchResults, type Directory, type InsertDirectory, type Image, type InsertImage, type Search, type InsertSearch, type SearchResult, type SearchResponse, type ProcessingStatus, type DirectoryStats } from "@shared/schema";

export interface IStorage {
  // Directory management
  getDirectories(): Promise<Directory[]>;
  getDirectory(id: number): Promise<Directory | undefined>;
  createDirectory(directory: InsertDirectory): Promise<Directory>;
  updateDirectory(id: number, updates: Partial<Directory>): Promise<Directory>;
  deleteDirectory(id: number): Promise<void>;

  // Image management
  getImages(directoryId?: number): Promise<Image[]>;
  getImage(id: number): Promise<Image | undefined>;
  getImageByPath(filepath: string): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  updateImage(id: number, updates: Partial<Image>): Promise<Image>;
  deleteImage(id: number): Promise<void>;
  getUnindexedImages(): Promise<Image[]>;

  // Search functionality
  createSearch(search: InsertSearch): Promise<Search>;
  getRecentSearches(limit?: number): Promise<Search[]>;
  saveSearchResults(searchId: number, results: Array<{ imageId: number; similarity: number; rank: number }>): Promise<void>;

  // Stats and status
  getDirectoryStats(): Promise<DirectoryStats>;
  getProcessingStatus(): Promise<ProcessingStatus>;
}

export class MemStorage implements IStorage {
  private directories: Map<number, Directory>;
  private images: Map<number, Image>;
  private searches: Map<number, Search>;
  private searchResults: Map<number, SearchResult[]>;
  private currentDirectoryId: number;
  private currentImageId: number;
  private currentSearchId: number;
  private processingStatus: ProcessingStatus;

  constructor() {
    this.directories = new Map();
    this.images = new Map();
    this.searches = new Map();
    this.searchResults = new Map();
    this.currentDirectoryId = 1;
    this.currentImageId = 1;
    this.currentSearchId = 1;
    this.processingStatus = {
      isProcessing: false,
      totalImages: 0,
      processedImages: 0,
      progress: 0,
    };
  }

  async getDirectories(): Promise<Directory[]> {
    return Array.from(this.directories.values());
  }

  async getDirectory(id: number): Promise<Directory | undefined> {
    return this.directories.get(id);
  }

  async createDirectory(insertDirectory: InsertDirectory): Promise<Directory> {
    const id = this.currentDirectoryId++;
    const directory: Directory = {
      ...insertDirectory,
      id,
      imageCount: 0,
      lastScanned: null,
      createdAt: new Date(),
    };
    this.directories.set(id, directory);
    return directory;
  }

  async updateDirectory(id: number, updates: Partial<Directory>): Promise<Directory> {
    const directory = this.directories.get(id);
    if (!directory) {
      throw new Error("Directory not found");
    }
    const updated = { ...directory, ...updates };
    this.directories.set(id, updated);
    return updated;
  }

  async deleteDirectory(id: number): Promise<void> {
    this.directories.delete(id);
    // Also delete associated images
    for (const [imageId, image] of this.images.entries()) {
      if (image.directoryId === id) {
        this.images.delete(imageId);
      }
    }
  }

  async getImages(directoryId?: number): Promise<Image[]> {
    const allImages = Array.from(this.images.values());
    if (directoryId) {
      return allImages.filter(img => img.directoryId === directoryId);
    }
    return allImages;
  }

  async getImage(id: number): Promise<Image | undefined> {
    return this.images.get(id);
  }

  async getImageByPath(filepath: string): Promise<Image | undefined> {
    return Array.from(this.images.values()).find(img => img.filepath === filepath);
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = this.currentImageId++;
    const image: Image = {
      ...insertImage,
      id,
      isIndexed: false,
      createdAt: new Date(),
    };
    this.images.set(id, image);

    // Update directory image count
    if (insertImage.directoryId) {
      const directory = this.directories.get(insertImage.directoryId);
      if (directory) {
        await this.updateDirectory(insertImage.directoryId, {
          imageCount: (directory.imageCount || 0) + 1,
        });
      }
    }

    return image;
  }

  async updateImage(id: number, updates: Partial<Image>): Promise<Image> {
    const image = this.images.get(id);
    if (!image) {
      throw new Error("Image not found");
    }
    const updated = { ...image, ...updates };
    this.images.set(id, updated);
    return updated;
  }

  async deleteImage(id: number): Promise<void> {
    const image = this.images.get(id);
    if (image && image.directoryId) {
      const directory = this.directories.get(image.directoryId);
      if (directory) {
        await this.updateDirectory(image.directoryId, {
          imageCount: Math.max(0, (directory.imageCount || 0) - 1),
        });
      }
    }
    this.images.delete(id);
  }

  async getUnindexedImages(): Promise<Image[]> {
    return Array.from(this.images.values()).filter(img => !img.isIndexed);
  }

  async createSearch(insertSearch: InsertSearch): Promise<Search> {
    const id = this.currentSearchId++;
    const search: Search = {
      ...insertSearch,
      id,
      createdAt: new Date(),
    };
    this.searches.set(id, search);
    return search;
  }

  async getRecentSearches(limit = 10): Promise<Search[]> {
    return Array.from(this.searches.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async saveSearchResults(searchId: number, results: Array<{ imageId: number; similarity: number; rank: number }>): Promise<void> {
    const searchResults = results.map(result => ({
      id: Math.random(), // Would be auto-increment in real DB
      searchId,
      imageId: result.imageId,
      similarity: result.similarity,
      rank: result.rank,
    }));
    this.searchResults.set(searchId, searchResults);
  }

  async getDirectoryStats(): Promise<DirectoryStats> {
    const allImages = Array.from(this.images.values());
    const totalSize = allImages.reduce((sum, img) => sum + (img.fileSize || 0), 0);
    const indexedImages = allImages.filter(img => img.isIndexed).length;

    return {
      totalDirectories: this.directories.size,
      totalImages: this.images.size,
      indexedImages,
      totalSize,
    };
  }

  async getProcessingStatus(): Promise<ProcessingStatus> {
    return this.processingStatus;
  }

  // Helper method for updating processing status
  updateProcessingStatus(status: Partial<ProcessingStatus>): void {
    this.processingStatus = { ...this.processingStatus, ...status };
  }
}

export const storage = new MemStorage();
