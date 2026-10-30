// "Pick location on map" overlay — tap/click the map (or drag the marker,
// or search, or use GPS) to choose a point, then confirm to fill
// Latitude/Longitude and (via reverse geocoding) Address — the same
// tap-a-map-to-set-your-address pattern used by Flipkart/Swiggy/etc.
// Uses Leaflet + OpenStreetMap tiles (free, no API key — see
// src/lib/geocode.js for why).
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Search, Crosshair } from 'lucide-react';
import { reverseGeocode, searchPlace } from '../lib/geocode';

// Leaflet's default marker icon is normally loaded via a relative URL that
// doesn't survive Vite's bundling — a well-known Leaflet+bundler issue.
// Fixed once here by routing the same bundled images through Vite's own
// asset imports instead.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// Vaniyambadi, Tamil Nadu — this app's actual service area, used as the
// map's starting point when no coordinate is known yet.
const DEFAULT_CENTER = { lat: 12.6819, lng: 78.6199 };

export default function LocationPicker({ initialLat, initialLng, onConfirm, onClose }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const hasInitial = initialLat !== '' && initialLat != null && initialLng !== '' && initialLng != null;
  const [position, setPosition] = useState(
    hasInitial ? { lat: Number(initialLat), lng: Number(initialLng) } : null
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const start = position || DEFAULT_CENTER;
    const map = L.map(mapRef.current).setView([start.lat, start.lng], position ? 16 : 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);
    marker.on('dragend', () => setPosition(marker.getLatLng()));
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setPosition(e.latlng);
    });

    mapInstance.current = map;
    markerRef.current = marker;

    // Leaflet measures its container on creation; if that happened while
    // the overlay was still animating/mid-layout the tiles can render at
    // the wrong size until the next resize. invalidateSize() right after
    // mount fixes that without needing to chase down the animation timing.
    setTimeout(() => map.invalidateSize(), 0);

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moveTo(lat, lng, zoom = 16) {
    setPosition({ lat, lng });
    markerRef.current.setLatLng([lat, lng]);
    mapInstance.current.setView([lat, lng], zoom);
  }

  async function runSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await searchPlace(query.trim()));
    } finally {
      setSearching(false);
    }
  }

  function selectResult(r) {
    moveTo(Number(r.lat), Number(r.lon));
    setResults([]);
    setQuery(r.display_name);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => moveTo(pos.coords.latitude, pos.coords.longitude));
  }

  async function confirm() {
    if (!position) return;
    setConfirming(true);
    try {
      const address = await reverseGeocode(position.lat, position.lng);
      onConfirm({ lat: position.lat, lng: position.lng, address });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="map-picker-overlay" role="dialog" aria-modal="true" aria-label="Pick location on map">
      <div className="map-picker">
        <div className="map-picker-head">
          <h2>Pick location on map</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="map-picker-search" onSubmit={runSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a place or address"
          />
          <button type="submit" className="btn secondary" disabled={searching} aria-label="Search">
            <Search size={16} aria-hidden="true" />
          </button>
          <button type="button" className="btn secondary" onClick={useMyLocation} aria-label="Use my current location">
            <Crosshair size={16} aria-hidden="true" />
          </button>
        </form>
        {results.length > 0 && (
          <div className="map-picker-results">
            {results.map((r) => (
              <button type="button" key={r.place_id} onClick={() => selectResult(r)}>
                {r.display_name}
              </button>
            ))}
          </div>
        )}

        <div ref={mapRef} className="map-picker-map" />

        <div className="map-picker-footer">
          <p>{position ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}` : 'Tap the map, search, or use your current location.'}</p>
          <button type="button" className="btn" disabled={!position || confirming} onClick={confirm}>
            {confirming ? 'Looking up address…' : 'Use this location'}
          </button>
        </div>
      </div>
    </div>
  );
}
