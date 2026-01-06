import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
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
function MapBounds({ zones }) {
  const map = useMap();
  
  useEffect(() => {
    if (zones && zones.length > 0) {
      const bounds = zones
        .filter(zone => zone.center_lat && zone.center_lng)
        .map(zone => [zone.center_lat, zone.center_lng]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [zones, map]);

  return null;
}

export default function ZonesMap({ zones, onZoneSelect }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [zoneDetails, setZoneDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (selectedZone) {
      fetchZoneDetails(selectedZone.id);
    } else {
      setZoneDetails(null);
    }
  }, [selectedZone]);

  const fetchZoneDetails = async (zoneId) => {
    setLoadingDetails(true);
    try {
      // Fetch staff assignments for this zone
      const assignmentsRes = await api.get('/assignments');
      const assignments = assignmentsRes.data.data.filter(
        ass => ass.zone_id === zoneId
      );

      // Get unique supervisors
      const supervisorIds = [...new Set(assignments.map(ass => ass.supervisor_id))];
      const supervisors = supervisorIds.map(id => {
        const assignment = assignments.find(ass => ass.supervisor_id === id);
        return {
          id,
          name: assignment?.supervisor_name || 'Unknown'
        };
      });

      setZoneDetails({
        supervisors,
        staffCount: assignments.length,
        staff: assignments.map(ass => ({
          id: ass.staff_id,
          name: ass.staff_name
        }))
      });
    } catch (error) {
      console.error('Failed to fetch zone details:', error);
      setZoneDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    if (onZoneSelect) {
      onZoneSelect(zone);
    }
  };

  // Calculate center from all zones
  const validZones = zones.filter(zone => zone.center_lat && zone.center_lng);
  const center = validZones.length > 0 
    ? [validZones[0].center_lat, validZones[0].center_lng]
    : [33.6844, 73.0479]; // Default to Islamabad, Pakistan

  // Create zone icon
  const zoneIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 200px)', minHeight: '600px', width: '100%' }}>
      {/* Details Panel */}
      {selectedZone && (
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
            <strong>{selectedZone.name}</strong>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setSelectedZone(null);
                setZoneDetails(null);
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
                  <small className="text-muted d-block mb-1">Location</small>
                  <strong>{selectedZone.location_name || 'N/A'}</strong>
                </div>
                {selectedZone.description && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Description</small>
                    <p className="mb-0">{selectedZone.description}</p>
                  </div>
                )}
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Coordinates</small>
                  <strong>
                    {selectedZone.center_lat?.toFixed(6)}, {selectedZone.center_lng?.toFixed(6)}
                  </strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Radius</small>
                  <strong>{selectedZone.radius_meters || 'N/A'} meters</strong>
                </div>
                {zoneDetails && (
                  <>
                    <hr />
                    <div className="mb-2">
                      <small className="text-muted d-block mb-2">Assigned Supervisors</small>
                      {zoneDetails.supervisors.length > 0 ? (
                        zoneDetails.supervisors.map((sup) => (
                          <Badge key={sup.id} bg="primary" className="me-1 mb-1">
                            {sup.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted">No supervisors assigned</span>
                      )}
                    </div>
                    <div className="mb-2">
                      <small className="text-muted d-block mb-1">Total Staff</small>
                      <strong>{zoneDetails.staffCount}</strong>
                    </div>
                    {zoneDetails.staff.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-2">Staff Members</small>
                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                          {zoneDetails.staff.map((staff) => (
                            <Badge key={staff.id} bg="secondary" className="me-1 mb-1">
                              {staff.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
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
            zoom={validZones.length > 0 ? 12 : 10}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            scrollWheelZoom={true}
            key={`zones-map-${validZones.length}-${isMounted}`}
          >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {validZones.length > 0 && <MapBounds zones={validZones} />}

          {validZones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            
            return (
              <div key={zone.id}>
                {/* Draw radius circle */}
                {zone.radius_meters && (
                  <Circle
                    center={[zone.center_lat, zone.center_lng]}
                    radius={zone.radius_meters}
                    pathOptions={{
                      color: isSelected ? '#dc3545' : '#198754',
                      fillColor: isSelected ? '#dc3545' : '#198754',
                      fillOpacity: 0.2,
                      weight: isSelected ? 3 : 2
                    }}
                    eventHandlers={{
                      click: () => handleZoneClick(zone)
                    }}
                  />
                )}

                {/* Zone marker */}
                <Marker
                  position={[zone.center_lat, zone.center_lng]}
                  icon={zoneIcon}
                  eventHandlers={{
                    click: () => handleZoneClick(zone)
                  }}
                >
                  <Popup>
                    <div>
                      <strong>{zone.name}</strong>
                      <br />
                      <small>Location: {zone.location_name || 'N/A'}</small>
                      <br />
                      <small>Radius: {zone.radius_meters || 'N/A'}m</small>
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

