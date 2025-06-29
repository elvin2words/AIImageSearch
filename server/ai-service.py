#!/usr/bin/env python3
"""
AI Service for CLIP-based image embeddings and FAISS vector search.
This service handles image processing, OCR, and semantic search functionality.
"""

import sys
import json
import os
import numpy as np
import torch
from PIL import Image
import clip
import faiss
import easyocr
from pathlib import Path
import pickle
import argparse
from typing import List, Dict, Any, Tuple

class AIImageService:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, self.preprocess = clip.load("ViT-B/32", device=self.device)
        self.ocr_reader = easyocr.Reader(['en'])
        
        # FAISS index for vector similarity search
        self.index = None
        self.image_paths = []
        self.index_file = "image_index.faiss"
        self.metadata_file = "image_metadata.pkl"
        
        self.load_index()
    
    def load_index(self):
        """Load existing FAISS index and metadata if available."""
        try:
            if os.path.exists(self.index_file) and os.path.exists(self.metadata_file):
                self.index = faiss.read_index(self.index_file)
                with open(self.metadata_file, 'rb') as f:
                    self.image_paths = pickle.load(f)
                print(f"Loaded index with {len(self.image_paths)} images", file=sys.stderr)
            else:
                # Create new index
                self.index = faiss.IndexFlatIP(512)  # CLIP embeddings are 512-dimensional
                self.image_paths = []
                print("Created new FAISS index", file=sys.stderr)
        except Exception as e:
            print(f"Error loading index: {e}", file=sys.stderr)
            self.index = faiss.IndexFlatIP(512)
            self.image_paths = []
    
    def save_index(self):
        """Save FAISS index and metadata to disk."""
        try:
            faiss.write_index(self.index, self.index_file)
            with open(self.metadata_file, 'wb') as f:
                pickle.dump(self.image_paths, f)
            print(f"Saved index with {len(self.image_paths)} images", file=sys.stderr)
        except Exception as e:
            print(f"Error saving index: {e}", file=sys.stderr)
    
    def extract_clip_embedding(self, image_path: str) -> np.ndarray:
        """Extract CLIP embedding from an image."""
        try:
            image = Image.open(image_path).convert('RGB')
            image_input = self.preprocess(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                image_features = self.model.encode_image(image_input)
                image_features /= image_features.norm(dim=-1, keepdim=True)
            
            return image_features.cpu().numpy().flatten()
        except Exception as e:
            print(f"Error extracting CLIP embedding from {image_path}: {e}", file=sys.stderr)
            raise
    
    def extract_ocr_text(self, image_path: str) -> str:
        """Extract text from image using OCR."""
        try:
            results = self.ocr_reader.readtext(image_path)
            text_content = []
            
            for (bbox, text, confidence) in results:
                if confidence > 0.5:  # Only include high-confidence detections
                    text_content.append(text)
            
            return " ".join(text_content).strip()
        except Exception as e:
            print(f"Error extracting OCR from {image_path}: {e}", file=sys.stderr)
            return ""
    
    def process_image(self, image_path: str) -> Dict[str, Any]:
        """Process a single image: extract CLIP embedding and OCR text."""
        try:
            # Extract CLIP embedding
            embedding = self.extract_clip_embedding(image_path)
            
            # Extract OCR text
            ocr_text = self.extract_ocr_text(image_path)
            
            # Add to FAISS index
            embedding_normalized = embedding.reshape(1, -1)
            self.index.add(embedding_normalized.astype('float32'))
            self.image_paths.append(image_path)
            
            # Save updated index
            self.save_index()
            
            return {
                "filepath": image_path,
                "embedding": embedding.tolist(),
                "ocr_text": ocr_text if ocr_text else None,
                "success": True
            }
        except Exception as e:
            return {
                "filepath": image_path,
                "error": str(e),
                "success": False
            }
    
    def encode_text_query(self, query: str) -> np.ndarray:
        """Encode text query using CLIP text encoder."""
        try:
            text_tokens = clip.tokenize([query]).to(self.device)
            
            with torch.no_grad():
                text_features = self.model.encode_text(text_tokens)
                text_features /= text_features.norm(dim=-1, keepdim=True)
            
            return text_features.cpu().numpy().flatten()
        except Exception as e:
            print(f"Error encoding text query '{query}': {e}", file=sys.stderr)
            raise
    
    def search_images(self, query: str, top_k: int = 50) -> List[Dict[str, Any]]:
        """Search for images using natural language query."""
        try:
            if self.index.ntotal == 0:
                print("No images in index", file=sys.stderr)
                return []
            
            # Encode the query
            query_embedding = self.encode_text_query(query)
            query_vector = query_embedding.reshape(1, -1).astype('float32')
            
            # Search in FAISS index
            similarities, indices = self.index.search(query_vector, min(top_k, self.index.ntotal))
            
            results = []
            for i, (similarity, idx) in enumerate(zip(similarities[0], indices[0])):
                if idx < len(self.image_paths):
                    results.append({
                        "filepath": self.image_paths[idx],
                        "similarity": float(similarity),
                        "rank": i + 1
                    })
            
            # Filter results by similarity threshold (optional)
            filtered_results = [r for r in results if r["similarity"] > 0.1]
            
            return filtered_results
        except Exception as e:
            print(f"Error searching images: {e}", file=sys.stderr)
            return []

def main():
    parser = argparse.ArgumentParser(description='AI Image Service')
    parser.add_argument('command', choices=['process_image', 'search'], help='Command to execute')
    parser.add_argument('input', help='Image path or search query')
    parser.add_argument('--top_k', type=int, default=50, help='Number of results to return for search')
    
    args = parser.parse_args()
    
    service = AIImageService()
    
    try:
        if args.command == 'process_image':
            result = service.process_image(args.input)
            print(json.dumps(result))
        
        elif args.command == 'search':
            results = service.search_images(args.input, args.top_k)
            print(json.dumps(results))
    
    except Exception as e:
        error_result = {
            "error": str(e),
            "success": False
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
