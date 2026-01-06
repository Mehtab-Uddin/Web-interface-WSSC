import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatDateTime } from '../../utils/format.jsx';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icon for clock-in point
const clockInIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for current location
const currentLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to fit map bounds
function MapBounds({ locations }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = locations.map(loc => [loc.lat || loc.latitude, loc.lng || loc.longitude]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [locations, map]);

  return null;
}

export default function TrackingMap({ trackingData, selectedTrack }) {
  const [selectedTracking, setSelectedTracking] = useState(null);

  useEffect(() => {
    if (selectedTrack) {
      setSelectedTracking(selectedTrack);
    } else if (trackingData && trackingData.length > 0) {
      // Show the first active tracking or first tracking
      const activeTrack = trackingData.find(t => t.is_active) || trackingData[0];
      setSelectedTracking(activeTrack);
    }
  }, [trackingData, selectedTrack]);

  // Parse locations if it's a string
  const locations = selectedTracking?.locations 
    ? (typeof selectedTracking.locations === 'string' 
        ? JSON.parse(selectedTracking.locations) 
        : selectedTracking.locations)
    : [];

  if (!selectedTracking || !locations || locations.length === 0) {
    return (
      <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '10px' }}>
        <div className="text-muted text-center">
          <p className="mb-0">No location data available</p>
          <small>Select a tracking record with location data to view on map</small>
        </div>
      </div>
    );
  }

  const firstLocation = locations[0];
  const lastLocation = locations[locations.length - 1];
  
  // Convert locations to polyline format - handle both lat/lng and latitude/longitude formats
  const polylinePositions = locations
    .filter(loc => (loc.lat || loc.latitude) && (loc.lng || loc.longitude))
    .map(loc => [loc.lat || loc.latitude, loc.lng || loc.longitude]);

  // Default center (first location or a default location)
  const center = firstLocation && (firstLocation.lat || firstLocation.latitude)
    ? [firstLocation.lat || firstLocation.latitude, firstLocation.lng || firstLocation.longitude]
    : [33.6844, 73.0479]; // Default to Islamabad, Pakistan

  return (
    <div style={{ height: '600px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBounds locations={locations} />

        {/* Clock-in point (first location) */}
        {firstLocation && (firstLocation.lat || firstLocation.latitude) && (
          <Marker
            position={[firstLocation.lat || firstLocation.latitude, firstLocation.lng || firstLocation.longitude]}
            icon={clockInIcon}
          >
            <Popup>
              <div>
                <strong>Clock-In Point</strong>
                <br />
                <small>Staff: {selectedTracking.staff_name || 'N/A'}</small>
                <br />
                <small>Time: {firstLocation.timestamp ? formatDateTime(firstLocation.timestamp) : selectedTracking.start_time ? formatDateTime(selectedTracking.start_time) : 'N/A'}</small>
                <br />
                <small>Coordinates: {(firstLocation.lat || firstLocation.latitude).toFixed(6)}, {(firstLocation.lng || firstLocation.longitude).toFixed(6)}</small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Movement path (polyline) */}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            color="#0d6efd"
            weight={4}
            opacity={0.7}
          />
        )}

        {/* Intermediate locations as small markers */}
        {locations.slice(1, -1).map((loc, index) => {
          if (!(loc.lat || loc.latitude) || !(loc.lng || loc.longitude)) return null;
          return (
            <CircleMarker
              key={index}
              center={[loc.lat || loc.latitude, loc.lng || loc.longitude]}
              radius={5}
              color="#0d6efd"
              fillColor="#0d6efd"
              fillOpacity={0.6}
            >
              <Popup>
                <div>
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
            position={[lastLocation.lat || lastLocation.latitude, lastLocation.lng || lastLocation.longitude]}
            icon={currentLocationIcon}
          >
            <Popup>
              <div>
                <strong>Current Location</strong>
                <br />
                <small>Staff: {selectedTracking.staff_name || 'N/A'}</small>
                <br />
                <small>Time: {lastLocation.timestamp ? formatDateTime(lastLocation.timestamp) : selectedTracking.last_update ? formatDateTime(selectedTracking.last_update) : 'N/A'}</small>
                <br />
                <small>Coordinates: {(lastLocation.lat || lastLocation.latitude).toFixed(6)}, {(lastLocation.lng || lastLocation.longitude).toFixed(6)}</small>
                <br />
                <small>Total Points: {locations.length}</small>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

