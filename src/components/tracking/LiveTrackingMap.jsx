import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatDateTime, formatStaffName, formatStaffNameString } from '../../utils/format.jsx';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Color palette for different staff members
const colors = [
  '#0d6efd', '#dc3545', '#198754', '#ffc107', '#0dcaf0',
  '#6610f2', '#e83e8c', '#fd7e14', '#20c997', '#6f42c1'
];

// Component to fit map bounds
function MapBounds({ allLocations }) {
  const map = useMap();
  
  useEffect(() => {
    if (allLocations && allLocations.length > 0) {
      const bounds = allLocations
        .filter(loc => (loc.lat || loc.latitude) && (loc.lng || loc.longitude))
        .map(loc => [loc.lat || loc.latitude, loc.lng || loc.longitude]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [allLocations, map]);

  return null;
}

export default function LiveTrackingMap({ trackingData }) {
  const [allLocations, setAllLocations] = useState([]);

  // Process all tracking data
  useEffect(() => {
    const locations = [];
    trackingData.forEach(track => {
      if (track.locations && track.locations.length > 0) {
        const parsedLocations = typeof track.locations === 'string' 
          ? JSON.parse(track.locations) 
          : track.locations;
        locations.push(...parsedLocations.map(loc => ({
          ...loc,
          staffName: formatStaffNameString(track),
          trackId: track.id,
          isActive: track.is_active
        })));
      }
    });
    setAllLocations(locations);
  }, [trackingData]);

  // Get tracks with location data for map display
  const activeTracks = trackingData.filter(track => {
    const locations = track.locations 
      ? (typeof track.locations === 'string' ? JSON.parse(track.locations) : track.locations)
      : [];
    return locations.length > 0;
  });

  // Get all active staff (including those without locations yet)
  const allActiveStaff = trackingData.filter(track => track.is_active || track.isActive);

  // Calculate center from all locations, or use default
  const allBounds = allLocations
    .filter(loc => (loc.lat || loc.latitude) && (loc.lng || loc.longitude))
    .map(loc => [loc.lat || loc.latitude, loc.lng || loc.longitude]);
  
  const center = allBounds.length > 0 
    ? allBounds[Math.floor(allBounds.length / 2)]
    : [33.6844, 73.0479]; // Default to Islamabad, Pakistan

  return (
    <div style={{ 
      height: 'calc(100vh - 250px)', 
      minHeight: '600px', 
      borderRadius: '10px', 
      overflow: 'hidden', 
      border: '1px solid #dee2e6', 
      position: 'relative',
      backgroundColor: '#f5f5f5'
    }}>
      {activeTracks.length === 0 && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          zIndex: 1000, 
          background: 'rgba(255, 255, 255, 0.95)', 
          padding: '20px 30px', 
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          {allActiveStaff.length > 0 ? (
            <>
              <p className="text-muted mb-2" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>
                {allActiveStaff.length} staff member{allActiveStaff.length > 1 ? 's' : ''} clocked in
              </p>
              <small className="text-muted">Location tracking will appear here once staff start sharing their location</small>
            </>
          ) : (
            <>
              <p className="text-muted mb-2" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>No active tracking data available</p>
              <small className="text-muted">Staff members will appear here when they clock in and start tracking their movements</small>
            </>
          )}
        </div>
      )}
      <MapContainer
        center={center}
        zoom={activeTracks.length > 0 ? 13 : 10}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {activeTracks.length > 0 && <MapBounds allLocations={allLocations} />}

        {/* Render each staff member's tracking */}
        {activeTracks.map((track, trackIndex) => {
          const locations = track.locations 
            ? (typeof track.locations === 'string' ? JSON.parse(track.locations) : track.locations)
            : [];
          
          if (locations.length === 0) return null;

          const color = colors[trackIndex % colors.length];
          const firstLocation = locations[0];
          const lastLocation = locations[locations.length - 1];
          
          // Create custom icons with staff color
          const clockInIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          const currentLocationIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          // Convert locations to polyline format
          const polylinePositions = locations
            .filter(loc => (loc.lat || loc.latitude) && (loc.lng || loc.longitude))
            .map(loc => [loc.lat || loc.latitude, loc.lng || loc.longitude]);

          return (
            <div key={track.id}>
              {/* Clock-in point (first location) */}
              {firstLocation && (firstLocation.lat || firstLocation.latitude) && (
                <Marker
                  key={`${track.id}-start`}
                  position={[firstLocation.lat || firstLocation.latitude, firstLocation.lng || firstLocation.longitude]}
                  icon={clockInIcon}
                >
                  <Popup>
                    <div>
                      <strong style={{ color }}>{formatStaffName(track)}</strong>
                      <br />
                      <strong>Clock-In Point</strong>
                      <br />
                      <small>Time: {firstLocation.timestamp ? formatDateTime(firstLocation.timestamp) : track.start_time ? formatDateTime(track.start_time) : 'N/A'}</small>
                      <br />
                      <small>Coordinates: {(firstLocation.lat || firstLocation.latitude).toFixed(6)}, {(firstLocation.lng || firstLocation.longitude).toFixed(6)}</small>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Movement path (polyline) */}
              {polylinePositions.length > 1 && (
                <Polyline
                  key={`${track.id}-path`}
                  positions={polylinePositions}
                  color={color}
                  weight={4}
                  opacity={0.7}
                />
              )}

              {/* Intermediate locations as small markers */}
              {locations.slice(1, -1).map((loc, index) => {
                if (!(loc.lat || loc.latitude) || !(loc.lng || loc.longitude)) return null;
                return (
                  <CircleMarker
                    key={`${track.id}-${index}`}
                    center={[loc.lat || loc.latitude, loc.lng || loc.longitude]}
                    radius={5}
                    color={color}
                    fillColor={color}
                    fillOpacity={0.6}
                  >
                    <Popup>
                      <div>
                        <strong style={{ color }}>{formatStaffName(track)}</strong>
                        <br />
                        <small>Location {index + 2}</small>
                        <br />
                        <small>Time: {loc.timestamp ? formatDateTime(loc.timestamp) : 'N/A'}</small>
                        <br />
                        <small>Coordinates: {(loc.lat || loc.latitude).toFixed(6)}, {(loc.lng || loc.longitude).toFixed(6)}</small>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Current/Last location */}
              {lastLocation && lastLocation !== firstLocation && (lastLocation.lat || lastLocation.latitude) && (
                <Marker
                  key={`${track.id}-end`}
                  position={[lastLocation.lat || lastLocation.latitude, lastLocation.lng || lastLocation.longitude]}
                  icon={currentLocationIcon}
                >
                  <Popup>
                    <div>
                      <strong style={{ color }}>{formatStaffName(track)}</strong>
                      <br />
                      <strong>Current Location</strong>
                      <br />
                      <small>Status: {track.is_active ? 'Active' : 'Inactive'}</small>
                      <br />
                      <small>Time: {lastLocation.timestamp ? formatDateTime(lastLocation.timestamp) : track.last_update ? formatDateTime(track.last_update) : 'N/A'}</small>
                      <br />
                      <small>Coordinates: {(lastLocation.lat || lastLocation.latitude).toFixed(6)}, {(lastLocation.lng || lastLocation.longitude).toFixed(6)}</small>
                      <br />
                      <small>Total Points: {locations.length}</small>
                    </div>
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}

