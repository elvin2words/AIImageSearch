import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDirectorySchema, insertImageSchema, insertSearchSchema, type SearchResponse } from "@shared/schema";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import multer from "multer";

const upload = multer({ dest: 'uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Directory management endpoints
  app.get("/api/directories", async (req, res) => {
    try {
      const directories = await storage.getDirectories();
      res.json(directories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch directories" });
    }
  });

  app.post("/api/directories", async (req, res) => {
    try {
      const validatedData = insertDirectorySchema.parse(req.body);
      const directory = await storage.createDirectory(validatedData);
      
      // Start scanning the directory asynchronously
      scanDirectory(directory.id, directory.path);
      
      res.json(directory);
    } catch (error) {
      res.status(400).json({ error: "Invalid directory data" });
    }
  });

  app.delete("/api/directories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDirectory(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete directory" });
    }
  });

  // Image management endpoints
  app.get("/api/images", async (req, res) => {
    try {
      const directoryId = req.query.directoryId ? parseInt(req.query.directoryId as string) : undefined;
      const images = await storage.getImages(directoryId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch images" });
    }
  });

  app.get("/api/images/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const image = await storage.getImage(id);
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      res.json(image);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch image" });
    }
  });

  // Search endpoint
  app.post("/api/search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      const startTime = Date.now();
      
      // Call Python AI service for CLIP-based search
      const searchResults = await performSearch(query);
      
      const searchTime = (Date.now() - startTime) / 1000;
      
      // Save search to database
      const search = await storage.createSearch({
        query,
        resultCount: searchResults.length,
        searchTime,
      });

      // Save search results
      if (searchResults.length > 0) {
        const resultsData = searchResults.map((result, index) => ({
          imageId: result.id,
          similarity: result.similarity,
          rank: index + 1,
        }));
        await storage.saveSearchResults(search.id, resultsData);
      }

      const response: SearchResponse = {
        results: searchResults,
        query,
        resultCount: searchResults.length,
        searchTime,
      };

      res.json(response);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Recent searches endpoint
  app.get("/api/searches/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const searches = await storage.getRecentSearches(limit);
      res.json(searches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent searches" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getDirectoryStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Processing status endpoint
  app.get("/api/processing-status", async (req, res) => {
    try {
      const status = await storage.getProcessingStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch processing status" });
    }
  });

  // Trigger reindexing
  app.post("/api/reindex", async (req, res) => {
    try {
      const unindexedImages = await storage.getUnindexedImages();
      if (unindexedImages.length === 0) {
        return res.json({ message: "No images to reindex" });
      }

      // Start reindexing process
      reindexImages(unindexedImages);
      
      res.json({ message: `Started reindexing ${unindexedImages.length} images` });
    } catch (error) {
      res.status(500).json({ error: "Failed to start reindexing" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to scan directory for images
async function scanDirectory(directoryId: number, directoryPath: string) {
  try {
    storage.updateProcessingStatus({ isProcessing: true, totalImages: 0, processedImages: 0, progress: 0 });
    
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
    const imageFiles: string[] = [];
    
    async function scanRecursively(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanRecursively(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            imageFiles.push(fullPath);
          }
        }
      }
    }
    
    await scanRecursively(directoryPath);
    
    storage.updateProcessingStatus({ totalImages: imageFiles.length });
    
    // Process images in batches
    let processed = 0;
    for (const imagePath of imageFiles) {
      try {
        // Check if image already exists
        const existingImage = await storage.getImageByPath(imagePath);
        if (existingImage) {
          processed++;
          continue;
        }

        const stats = await fs.stat(imagePath);
        const filename = path.basename(imagePath);
        
        // Create image record
        await storage.createImage({
          directoryId,
          filename,
          filepath: imagePath,
          fileSize: stats.size,
          dateCreated: stats.birthtime,
          dateModified: stats.mtime,
        });
        
        processed++;
        const progress = (processed / imageFiles.length) * 100;
        storage.updateProcessingStatus({ 
          processedImages: processed, 
          progress,
          currentFile: filename 
        });
        
      } catch (error) {
        console.error(`Error processing ${imagePath}:`, error);
        processed++;
      }
    }
    
    // Update directory
    await storage.updateDirectory(directoryId, {
      lastScanned: new Date(),
      imageCount: imageFiles.length,
    });
    
    storage.updateProcessingStatus({ isProcessing: false });
    
    // Start AI processing for new images
    const unindexedImages = await storage.getUnindexedImages();
    if (unindexedImages.length > 0) {
      reindexImages(unindexedImages);
    }
    
  } catch (error) {
    console.error("Directory scan error:", error);
    storage.updateProcessingStatus({ isProcessing: false });
  }
}

// Helper function to reindex images with AI
async function reindexImages(images: any[]) {
  storage.updateProcessingStatus({ 
    isProcessing: true, 
    totalImages: images.length, 
    processedImages: 0, 
    progress: 0 
  });
  
  let processed = 0;
  
  for (const image of images) {
    try {
      // Call Python AI service to process the image
      await processImageWithAI(image);
      
      processed++;
      const progress = (processed / images.length) * 100;
      storage.updateProcessingStatus({ 
        processedImages: processed, 
        progress,
        currentFile: image.filename 
      });
      
    } catch (error) {
      console.error(`Error processing image ${image.filepath}:`, error);
      processed++;
    }
  }
  
  storage.updateProcessingStatus({ isProcessing: false });
}

// Helper function to process single image with AI
async function processImageWithAI(image: any) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['server/ai-service.py', 'process_image', image.filepath]);
    
    let result = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          const aiResult = JSON.parse(result);
          
          // Update image with AI results
          await storage.updateImage(image.id, {
            embedding: aiResult.embedding,
            ocrText: aiResult.ocr_text || null,
            isIndexed: true,
          });
          
          resolve(aiResult);
        } catch (parseError) {
          reject(parseError);
        }
      } else {
        reject(new Error(`Python process failed: ${error}`));
      }
    });
  });
}

// Helper function to perform CLIP-based search
async function performSearch(query: string): Promise<Array<any>> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['server/ai-service.py', 'search', query]);
    
    let result = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          const searchResults = JSON.parse(result);
          
          // Enrich results with image data from storage
          const enrichedResults = [];
          for (const result of searchResults) {
            const image = await storage.getImageByPath(result.filepath);
            if (image) {
              enrichedResults.push({
                ...image,
                similarity: result.similarity,
              });
            }
          }
          
          resolve(enrichedResults);
        } catch (parseError) {
          reject(parseError);
        }
      } else {
        reject(new Error(`Search failed: ${error}`));
      }
    });
  });
}
