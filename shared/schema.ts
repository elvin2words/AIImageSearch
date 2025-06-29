import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const directories = pgTable("directories", {
  id: serial("id").primaryKey(),
  path: text("path").notNull().unique(),
  name: text("name").notNull(),
  isWatched: boolean("is_watched").default(true),
  imageCount: integer("image_count").default(0),
  lastScanned: timestamp("last_scanned"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  directoryId: integer("directory_id").references(() => directories.id),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull().unique(),
  fileSize: integer("file_size"),
  dimensions: text("dimensions"), // "width x height"
  dateCreated: timestamp("date_created"),
  dateModified: timestamp("date_modified"),
  ocrText: text("ocr_text"),
  embedding: jsonb("embedding"), // CLIP embedding vector
  thumbnailPath: text("thumbnail_path"),
  metadata: jsonb("metadata"), // GPS, camera info, etc.
  isIndexed: boolean("is_indexed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const searches = pgTable("searches", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  resultCount: integer("result_count").default(0),
  searchTime: real("search_time"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const searchResults = pgTable("search_results", {
  id: serial("id").primaryKey(),
  searchId: integer("search_id").references(() => searches.id),
  imageId: integer("image_id").references(() => images.id),
  similarity: real("similarity").notNull(),
  rank: integer("rank").notNull(),
});

export const insertDirectorySchema = createInsertSchema(directories).pick({
  path: true,
  name: true,
  isWatched: true,
});

export const insertImageSchema = createInsertSchema(images).pick({
  directoryId: true,
  filename: true,
  filepath: true,
  fileSize: true,
  dimensions: true,
  dateCreated: true,
  dateModified: true,
  ocrText: true,
  embedding: true,
  thumbnailPath: true,
  metadata: true,
});

export const insertSearchSchema = createInsertSchema(searches).pick({
  query: true,
  resultCount: true,
  searchTime: true,
});

export type Directory = typeof directories.$inferSelect;
export type InsertDirectory = z.infer<typeof insertDirectorySchema>;
export type Image = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type Search = typeof searches.$inferSelect;
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type SearchResult = typeof searchResults.$inferSelect;

// API types
export interface SearchResponse {
  results: Array<Image & { similarity: number }>;
  query: string;
  resultCount: number;
  searchTime: number;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  totalImages: number;
  processedImages: number;
  currentFile?: string;
  progress: number;
}

export interface DirectoryStats {
  totalDirectories: number;
  totalImages: number;
  indexedImages: number;
  totalSize: number;
}
