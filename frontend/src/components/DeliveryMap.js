/**
 * Delivery Map Component
 * Shows restaurant, customer, and driver locations on an interactive map
 * Uses Leaflet.js with OpenStreetMap (free)
 * Features:
 * - Real-time driver tracking
 * - Route visualization
 * - Distance calculation
 * - Closest driver finder
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './DeliveryMap.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons
const restaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

/**
 * Find closest available driver to restaurant
 * @param {Object} restaurantLocation - {latitude, longitude}
 * @param {Array} availableDrivers - Array of driver objects with current_latitude, current_longitude
 * @returns {Object} Closest driver with distance
 */
export const findClosestDriver = (restaurantLocation, availableDrivers) => {
  if (!availableDrivers || availableDrivers.length === 0) return null;

  let closestDriver = null;
  let minDistance = Infinity;

  availableDrivers.forEach(driver => {
    if (driver.current_latitude && driver.current_longitude) {
      const distance = calculateDistance(
        restaurantLocation.latitude,
        restaurantLocation.longitude,
        driver.current_latitude,
        driver.current_longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestDriver = { ...driver, distance };
      }
    }
  });

  return closestDriver;
};

/**
 * Calculate optimized route (simple version - straight line segments)
 * For production, integrate with OSRM or GraphHopper API
 */
const calculateRoute = (restaurant, driver, customer) => {
  // Return array of coordinates for polyline
  // Route: Restaurant -> Driver -> Customer
  const route = [];
  
  if (restaurant) {
    route.push([restaurant.latitude, restaurant.longitude]);
  }
  
  if (driver && driver.current_latitude) {
    route.push([driver.current_latitude, driver.current_longitude]);
  }
  
  if (customer) {
    route.push([customer.latitude, customer.longitude]);
  }
  
  return route;
};

const DeliveryMap = ({ 
  restaurant, 
  customer, 
  driver, 
  availableDrivers = [],
  showRoute = true,
  showAvailableDrivers = false,
  height = '500px',
  animateDriver = false
}) => {
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [zoom, setZoom] = useState(5);
  const [route, setRoute] = useState([]);
  const [driverPosition, setDriverPosition] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Set map center and zoom based on available locations
  useEffect(() => {
    if (restaurant) {
      setMapCenter([restaurant.latitude, restaurant.longitude]);
      setZoom(13);
    } else if (customer) {
      setMapCenter([customer.latitude, customer.longitude]);
      setZoom(13);
    }
  }, [restaurant, customer]);

  // Calculate route when locations change
  useEffect(() => {
    if (showRoute && (restaurant || customer || driver)) {
      const calculatedRoute = calculateRoute(restaurant, driver, customer);
      setRoute(calculatedRoute);
    }
  }, [restaurant, customer, driver, showRoute]);

  // Initialize driver position
  useEffect(() => {
    if (driver && driver.current_latitude) {
      setDriverPosition([driver.current_latitude, driver.current_longitude]);
    }
  }, [driver]);

  // Animate driver movement (simulated)
  useEffect(() => {
    if (animateDriver && driver && customer && driverPosition) {
      const interval = setInterval(() => {
        setDriverPosition(prev => {
          if (!prev) return null;
          
          // Move driver slightly towards customer
          const [dLat, dLon] = prev;
          const targetLat = customer.latitude;
          const targetLon = customer.longitude;
          
          const newLat = dLat + (targetLat - dLat) * 0.01;
          const newLon = dLon + (targetLon - dLon) * 0.01;
          
          // Stop when close enough
          if (Math.abs(newLat - targetLat) < 0.001 && Math.abs(newLon - targetLon) < 0.001) {
            clearInterval(interval);
            return [targetLat, targetLon];
          }
          
          return [newLat, newLon];
        });
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [animateDriver, driver, customer, driverPosition]);

  // Find and display closest driver
  useEffect(() => {
    if (showAvailableDrivers && restaurant && availableDrivers.length > 0) {
      const closest = findClosestDriver(
        { latitude: restaurant.latitude, longitude: restaurant.longitude },
        availableDrivers
      );
      setSelectedDriver(closest);
    }
  }, [restaurant, availableDrivers, showAvailableDrivers]);

  return (
    <div className="delivery-map-container">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height, width: '100%' }}
        className="delivery-map"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Restaurant Marker */}
        {restaurant && (
          <>
            <Marker 
              position={[restaurant.latitude, restaurant.longitude]} 
              icon={restaurantIcon}
            >
              <Popup>
                <div className="map-popup">
                  <h3>🏪 {restaurant.name || 'Restaurant'}</h3>
                  <p>{restaurant.address}</p>
                  {restaurant.phone_num && <p>📞 {restaurant.phone_num}</p>}
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[restaurant.latitude, restaurant.longitude]}
              radius={1000}
              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1 }}
            />
          </>
        )}

        {/* Customer Marker */}
        {customer && (
          <>
            <Marker 
              position={[customer.latitude, customer.longitude]} 
              icon={customerIcon}
            >
              <Popup>
                <div className="map-popup">
                  <h3>🏠 Customer Location</h3>
                  <p>{customer.address_line1}</p>
                  {customer.city && <p>{customer.city}, {customer.state}</p>}
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[customer.latitude, customer.longitude]}
              radius={500}
              pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
            />
          </>
        )}

        {/* Driver Marker (animated position) */}
        {driver && driverPosition && (
          <Marker 
            position={driverPosition} 
            icon={driverIcon}
          >
            <Popup>
              <div className="map-popup">
                <h3>🚗 {driver.first_name} {driver.last_name}</h3>
                <p>Vehicle: {driver.vehicle_type}</p>
                <p>License: {driver.license_number}</p>
                {driver.distance && (
                  <p><strong>{driver.distance.toFixed(2)} km away</strong></p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Available Drivers */}
        {showAvailableDrivers && availableDrivers.map((availDriver, index) => (
          availDriver.current_latitude && (
            <Marker
              key={index}
              position={[availDriver.current_latitude, availDriver.current_longitude]}
              icon={driverIcon}
              opacity={selectedDriver?.driver_id === availDriver.driver_id ? 1 : 0.5}
            >
              <Popup>
                <div className="map-popup">
                  <h3>🚗 Available Driver</h3>
                  <p>Vehicle: {availDriver.vehicle_type}</p>
                  {restaurant && (
                    <p>
                      Distance: {calculateDistance(
                        restaurant.latitude,
                        restaurant.longitude,
                        availDriver.current_latitude,
                        availDriver.current_longitude
                      ).toFixed(2)} km
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {/* Route Line */}
        {showRoute && route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{ 
              color: '#667eea', 
              weight: 4, 
              opacity: 0.7,
              dashArray: '10, 10'
            }}
          />
        )}
      </MapContainer>

      {/* Map Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-icon" style={{ backgroundColor: '#d32f2f' }}>🏪</span>
          <span>Restaurant</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon" style={{ backgroundColor: '#1976d2' }}>🏠</span>
          <span>Customer</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon" style={{ backgroundColor: '#388e3c' }}>🚗</span>
          <span>Driver</span>
        </div>
      </div>

      {/* Distance Info */}
      {restaurant && customer && (
        <div className="distance-info">
          <p>
            <strong>Delivery Distance:</strong> {' '}
            {calculateDistance(
              restaurant.latitude,
              restaurant.longitude,
              customer.latitude,
              customer.longitude
            ).toFixed(2)} km
          </p>
        </div>
      )}

      {/* Closest Driver Info */}
      {selectedDriver && (
        <div className="closest-driver-info">
          <h4>✨ Closest Available Driver</h4>
          <p><strong>Vehicle:</strong> {selectedDriver.vehicle_type}</p>
          <p><strong>Distance from Restaurant:</strong> {selectedDriver.distance.toFixed(2)} km</p>
          <p><strong>ETA:</strong> ~{Math.ceil(selectedDriver.distance * 3)} minutes</p>
        </div>
      )}
    </div>
  );
};

export default DeliveryMap;
