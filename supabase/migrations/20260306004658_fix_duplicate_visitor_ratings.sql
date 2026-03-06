/*
  # Fix Duplicate Visitor Ratings System

  ## Changes
  This migration fixes the visitor rating duplication issue by:
  1. Adding a unique constraint to prevent duplicate ratings
  2. Cleaning up existing duplicate ratings (keeping only the first one)

  ## Updated Schema
  - Add unique constraint on (rated_phone, visitor_phone, rating_type = 'visitor')
  - This ensures one visitor can only rate another user once

  ## Data Cleanup
  - Removes duplicate visitor ratings, keeping only the earliest one
  - Preserves the first rating submitted by each visitor

  ## Important Notes
  1. This is a critical fix for the rating system integrity
  2. Combined with localStorage visitor_id on frontend, prevents all duplicates
  3. Works for both authenticated and unauthenticated visitors
*/

-- First, remove duplicate ratings, keeping only the earliest one for each visitor+rated_phone combination
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY rated_phone, COALESCE(visitor_phone, rater_phone)
      ORDER BY created_at ASC
    ) as rn
  FROM user_ratings
  WHERE rating_type = 'visitor'
)
DELETE FROM user_ratings
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
-- This ensures one visitor identifier can only rate one user once
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_visitor_rating 
ON user_ratings (rated_phone, COALESCE(visitor_phone, rater_phone))
WHERE rating_type = 'visitor';
