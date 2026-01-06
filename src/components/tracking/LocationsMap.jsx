import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';
import { Card, Badge, Spinner } from 'react-bootstrap';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to fit map bounds
function MapBounds({ locations }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = locations
        .filter(loc => loc.center_lat && loc.center_lng)
        .map(loc => [loc.center_lat, loc.center_lng]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [locations, map]);

  return null;
}

export default function LocationsMap({ locations, onLocationSelect }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Debug: Log locations with boundaries
  useEffect(() => {
    const locationsWithBoundaries = locations.filter(loc => loc.boundaries && Array.isArray(loc.boundaries) && loc.boundaries.length > 0);
    // Locations with boundaries are processed for map display
  }, [locations]);

  useEffect(() => {
    if (selectedLocation) {
      fetchLocationDetails(selectedLocation.id);
    } else {
      setLocationDetails(null);
    }
  }, [selectedLocation]);

  const fetchLocationDetails = async (locationId) => {
    setLoadingDetails(true);
    try {
      // Fetch supervisors for this location
      const supervisorsRes = await api.get('/assignments/supervisor-locations');
      const supervisors = supervisorsRes.data.data.filter(
        sl => sl.nc_location_id === locationId
      );

      // Fetch staff assignments for zones in this location
      const assignmentsRes = await api.get('/assignments');
      const zonesRes = await api.get(`/zones?location_id=${locationId}`);
      const zoneIds = zonesRes.data.data.map(z => z.id);
      const staffAssignments = assignmentsRes.data.data.filter(
        ass => zoneIds.includes(ass.zone_id)
      );

      setLocationDetails({
        supervisors,
        staffCount: staffAssignments.length,
        zones: zonesRes.data.data.length
      });
    } catch (error) {
      console.error('Failed to fetch location details:', error);
      setLocationDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  // Calculate center from all locations
  const validLocations = locations.filter(loc => loc.center_lat && loc.center_lng);
  const center = validLocations.length > 0 
    ? [validLocations[0].center_lat, validLocations[0].center_lng]
    : [33.6844, 73.0479]; // Default to Islamabad, Pakistan

  // Create location icon
  const locationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 200px)', minHeight: '600px', width: '100%' }}>
      {/* Details Panel */}
      {selectedLocation && (
        <Card 
          style={{ 
            position: 'absolute', 
            top: '20px', 
            right: '20px', 
            zIndex: 1000, 
            width: '350px',
            maxHeight: 'calc(100vh - 240px)',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <Card.Header className="d-flex justify-content-between align-items-center">
            <strong>{selectedLocation.name}</strong>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setSelectedLocation(null);
                setLocationDetails(null);
              }}
            >
              ×
            </button>
          </Card.Header>
          <Card.Body>
            {loadingDetails ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Code</small>
                  <strong>{selectedLocation.code || 'N/A'}</strong>
                </div>
                {selectedLocation.description && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Description</small>
                    <p className="mb-0">{selectedLocation.description}</p>
                  </div>
                )}
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Coordinates</small>
                  <strong>
                    {selectedLocation.center_lat?.toFixed(6)}, {selectedLocation.center_lng?.toFixed(6)}
                  </strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Radius</small>
                  <strong>{selectedLocation.radius_meters || 'N/A'} meters</strong>
                </div>
                {locationDetails && (
                  <>
                    <hr />
                    <div className="mb-2">
                      <small className="text-muted d-block mb-2">Assigned Supervisors</small>
                      {locationDetails.supervisors.length > 0 ? (
                        locationDetails.supervisors.map((sup, idx) => (
                          <Badge key={idx} bg="primary" className="me-1 mb-1">
                            {sup.supervisor_name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted">No supervisors assigned</span>
                      )}
                    </div>
                    <div className="mb-2">
                      <small className="text-muted d-block mb-1">Total Staff</small>
                      <strong>{locationDetails.staffCount}</strong>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted d-block mb-1">Beats</small>
                      <strong>{locationDetails.zones}</strong>
                    </div>
                  </>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      )}

      <div style={{ height: '100%', width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
        {isMounted ? (
          <MapContainer
            center={center}
            zoom={validLocations.length > 0 ? 12 : 10}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            scrollWheelZoom={true}
            key={`locations-map-${validLocations.length}-${isMounted}`}
          >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {validLocations.length > 0 && <MapBounds locations={validLocations} />}

          {validLocations.map((location) => {
            const isSelected = selectedLocation?.id === location.id;
            
            return (
              <div key={location.id}>
                {/* Draw boundaries if available */}
                {location.boundaries && Array.isArray(location.boundaries) && location.boundaries.length > 0 && (() => {
                  // Boundaries are stored as [[lng, lat], ...] - convert to [[lat, lng], ...] for Leaflet
                  const polygonCoords = location.boundaries
                    .filter(coord => Array.isArray(coord) && coord.length >= 2)
                    .map(coord => {
                      // Always swap since boundaries are stored as [lng, lat]
                      return [coord[1], coord[0]]; // Convert [lng, lat] to [lat, lng]
                    });

                  // Ensure polygon is closed (first and last point should be the same)
                  if (polygonCoords.length > 0) {
                    const firstPoint = polygonCoords[0];
                    const lastPoint = polygonCoords[polygonCoords.length - 1];
                    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                      polygonCoords.push([firstPoint[0], firstPoint[1]]);
                    }
                  }

                  if (polygonCoords.length >= 3) {
                    return (
                      <Polygon
                        key={`polygon-${location.id}`}
                        positions={polygonCoords}
                        pathOptions={{
                          color: isSelected ? '#dc3545' : '#0d6efd',
                          fillColor: isSelected ? '#dc3545' : '#0d6efd',
                          fillOpacity: 0.3,
                          weight: isSelected ? 4 : 3,
                          opacity: isSelected ? 0.9 : 0.7
                        }}
                        eventHandlers={{
                          click: () => handleLocationClick(location),
                          mouseover: (e) => {
                            e.target.setStyle({
                              weight: 5,
                              opacity: 1
                            });
                          },
                          mouseout: (e) => {
                            e.target.setStyle({
                              weight: isSelected ? 4 : 3,
                              opacity: isSelected ? 0.9 : 0.7
                            });
                          }
                        }}
                      />
                    );
                  }
                  return null;
                })()}

                {/* Draw radius circle if no boundaries */}
                {(!location.boundaries || location.boundaries.length === 0) && location.radius_meters && (
                  <Circle
                    center={[location.center_lat, location.center_lng]}
                    radius={location.radius_meters}
                    pathOptions={{
                      color: isSelected ? '#dc3545' : '#0d6efd',
                      fillColor: isSelected ? '#dc3545' : '#0d6efd',
                      fillOpacity: 0.2,
                      weight: isSelected ? 3 : 2
                    }}
                    eventHandlers={{
                      click: () => handleLocationClick(location)
                    }}
                  />
                )}

                {/* Location marker */}
                <Marker
                  position={[location.center_lat, location.center_lng]}
                  icon={locationIcon}
                  eventHandlers={{
                    click: () => handleLocationClick(location)
                  }}
                >
                  <Popup>
                    <div>
                      <strong>{location.name}</strong>
                      <br />
                      <small>Code: {location.code || 'N/A'}</small>
                      <br />
                      <small>Radius: {location.radius_meters || 'N/A'}m</small>
                      <br />
                      <small>Click to view details</small>
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
          </MapContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
            <Spinner animation="border" />
          </div>
        )}
      </div>
    </div>
  );
}

