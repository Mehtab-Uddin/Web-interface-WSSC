-- Migration: Add boundaries column to locations table
-- This allows storing polygon coordinates for precise geofencing

ALTER TABLE locations 
ADD COLUMN boundaries JSON DEFAULT NULL COMMENT 'Polygon coordinates array: [[lng, lat], ...]';

-- Update existing locations to have null boundaries (they'll use radius-based geofencing)
-- This maintains backward compatibility

