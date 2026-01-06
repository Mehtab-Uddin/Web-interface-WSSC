const express = require('express');
const router = express.Router();
const multer = require('multer');
const AdmZip = require('adm-zip');
const { DOMParser } = require('@xmldom/xmldom');
const Location = require('../models/Location');
const Zone = require('../models/Zone');
const { protect, authorize } = require('../middleware/auth');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.google-earth.kmz' || 
        file.mimetype === 'application/zip' ||
        file.mimetype === 'application/vnd.google-earth.kml+xml' ||
        file.mimetype === 'application/xml' ||
        file.originalname.toLowerCase().endsWith('.kmz') ||
        file.originalname.toLowerCase().endsWith('.kml')) {
      cb(null, true);
    } else {
      cb(new Error('Only KMZ and KML files are allowed'), false);
    }
  }
});

// Helper function to parse coordinates string
function parseCoordinates(coordsString) {
  if (!coordsString) return [];
  const coords = coordsString.trim().split(/\s+/);
  return coords.map(coord => {
    const parts = coord.split(',');
    if (parts.length >= 2) {
      return {
        longitude: parseFloat(parts[0]),
        latitude: parseFloat(parts[1]),
        altitude: parts[2] ? parseFloat(parts[2]) : 0
      };
    }
    return null;
  }).filter(c => c !== null);
}

// Helper function to calculate center point and radius from polygon
function calculatePolygonCenterAndRadius(coordinates) {
  if (!coordinates || coordinates.length === 0) return null;
  
  // Calculate centroid
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  
  coordinates.forEach(coord => {
    sumLat += coord.latitude;
    sumLng += coord.longitude;
    count++;
  });
  
  const centerLat = sumLat / count;
  const centerLng = sumLng / count;
  
  // Calculate maximum distance from center (radius)
  let maxDistance = 0;
  coordinates.forEach(coord => {
    const distance = haversineDistance(
      centerLat, centerLng,
      coord.latitude, coord.longitude
    );
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  });
  
  return {
    centerLat,
    centerLng,
    radiusMeters: Math.ceil(maxDistance)
  };
}

// Haversine formula to calculate distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to extract text content from XML node
function getTextContent(node) {
  if (!node) return '';
  if (node.nodeType === 3) return node.nodeValue;
  let text = '';
  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      text += getTextContent(node.childNodes[i]);
    }
  }
  return text.trim();
}

// Parse KML/KMZ file
function parseKML(kmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlContent, 'text/xml');
  
  // Check for parsing errors
  const parserError = doc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    throw new Error('Invalid XML/KML format');
  }
  
  const features = [];
  
  // Find all Placemarks
  const placemarks = doc.getElementsByTagName('Placemark');
  
  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i];
    
    // Extract name
    const nameNode = placemark.getElementsByTagName('name')[0];
    const name = nameNode ? getTextContent(nameNode) : `Feature ${i + 1}`;
    
    // Extract description
    const descNode = placemark.getElementsByTagName('description')[0];
    const description = descNode ? getTextContent(descNode) : '';
    
    // Check for Polygon
    const polygonNode = placemark.getElementsByTagName('Polygon')[0];
    if (polygonNode) {
      const outerBoundary = polygonNode.getElementsByTagName('outerBoundaryIs')[0];
      if (outerBoundary) {
        const linearRing = outerBoundary.getElementsByTagName('LinearRing')[0];
        if (linearRing) {
          const coordinatesNode = linearRing.getElementsByTagName('coordinates')[0];
          if (coordinatesNode) {
            const coordsString = getTextContent(coordinatesNode);
            const coordinates = parseCoordinates(coordsString);
            
            if (coordinates.length > 0) {
              const centerAndRadius = calculatePolygonCenterAndRadius(coordinates);
              if (centerAndRadius) {
                // Convert coordinates to [lng, lat] format for storage
                let boundaries = coordinates.map(coord => [coord.longitude, coord.latitude]);
                
                // Ensure polygon is closed (first and last point should be the same)
                if (boundaries.length > 0) {
                  const firstPoint = boundaries[0];
                  const lastPoint = boundaries[boundaries.length - 1];
                  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                    boundaries.push([firstPoint[0], firstPoint[1]]);
                  }
                }
                
                features.push({
                  type: 'polygon',
                  name,
                  description,
                  ...centerAndRadius,
                  boundaries // Store polygon boundaries as [[lng, lat], ...]
                });
              }
            }
          }
        }
      }
    }
    
    // Check for Point
    const pointNode = placemark.getElementsByTagName('Point')[0];
    if (pointNode) {
      const coordinatesNode = pointNode.getElementsByTagName('coordinates')[0];
      if (coordinatesNode) {
        const coordsString = getTextContent(coordinatesNode);
        const coords = parseCoordinates(coordsString);
        if (coords.length > 0) {
          features.push({
            type: 'point',
            name,
            description,
            centerLat: coords[0].latitude,
            centerLng: coords[0].longitude,
            radiusMeters: 100 // Default radius for points
          });
        }
      }
    }
  }
  
  return features;
}

// @route   POST /api/kmz/upload
// @desc    Upload and parse KMZ/KML file, create locations/zones
// @access  Private/Admin
router.post('/upload', protect, authorize('ceo', 'super_admin', 'general_manager', 'admin_assistant'), upload.single('kmzFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    let kmlContent;
    const fileName = req.file.originalname.toLowerCase();

    // Handle KMZ (compressed) or KML (plain XML)
    if (fileName.endsWith('.kmz')) {
      // Extract KMZ file
      const zip = new AdmZip(req.file.buffer);
      const zipEntries = zip.getEntries();
      
      // Find the KML file inside
      const kmlEntry = zipEntries.find(entry => 
        entry.entryName.toLowerCase().endsWith('.kml')
      );
      
      if (!kmlEntry) {
        return res.status(400).json({
          success: false,
          error: 'No KML file found inside KMZ archive'
        });
      }
      
      kmlContent = kmlEntry.getData().toString('utf8');
    } else if (fileName.endsWith('.kml')) {
      kmlContent = req.file.buffer.toString('utf8');
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only KMZ and KML files are supported.'
      });
    }

    // Parse KML content
    const features = parseKML(kmlContent);

    if (features.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid features (polygons or points) found in the KML/KMZ file'
      });
    }

    // Get import options from request body
    const { 
      importAs = 'locations', // 'locations' or 'zones'
      locationId = null, // Required if importAs is 'zones'
      defaultRadius = 500 // Default radius if not calculated
    } = req.body;

    const results = {
      imported: [],
      errors: []
    };

    // Import features
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      
      try {
        if (importAs === 'zones') {
          if (!locationId) {
            results.errors.push({
              feature: feature.name,
              error: 'locationId is required when importing as zones'
            });
            continue;
          }

          // Create zone
          const zone = await Zone.create({
            name: feature.name || `Zone ${i + 1}`,
            locationId: parseInt(locationId),
            description: feature.description || '',
            centerLat: feature.centerLat,
            centerLng: feature.centerLng,
            radiusMeters: feature.radiusMeters || defaultRadius
          });

          results.imported.push({
            type: 'zone',
            id: zone.id,
            name: zone.name
          });
        } else {
          // Create location
          const location = await Location.create({
            name: feature.name || `Location ${i + 1}`,
            code: feature.name ? feature.name.substring(0, 20).toUpperCase().replace(/\s+/g, '-') : `LOC-${i + 1}`,
            description: feature.description || '',
            centerLat: feature.centerLat,
            centerLng: feature.centerLng,
            radiusMeters: feature.radiusMeters || defaultRadius,
            boundaries: feature.boundaries || null // Store polygon boundaries if available
          });

          results.imported.push({
            type: 'location',
            id: location.id,
            name: location.name
          });
        }
      } catch (error) {
        results.errors.push({
          feature: feature.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${results.imported.length} feature(s)`,
      data: results
    });
  } catch (error) {
    console.error('KMZ upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process KMZ/KML file'
    });
  }
});

module.exports = router;

