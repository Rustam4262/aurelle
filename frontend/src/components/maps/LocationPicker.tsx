/**
 * LocationPicker Component
 * Interactive map for picking a location (for salon owners)
 */

import { useState, useEffect } from 'react';
import { YandexMap, MapCoordinates } from './YandexMap';

interface LocationPickerProps {
  initialLocation?: MapCoordinates;
  onLocationSelect: (location: MapCoordinates, address?: string) => void;
  height?: string;
  className?: string;
}

export function LocationPicker({
  initialLocation,
  onLocationSelect,
  height = '400px',
  className = '',
}: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<MapCoordinates>(
    initialLocation || { lat: 41.2995, lng: 69.2401 }
  );
  const [address, setAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Get address from coordinates using Yandex Geocoder
  const getAddressFromCoords = async (coords: MapCoordinates) => {
    if (!window.ymaps) return;

    setIsLoadingAddress(true);
    try {
      const geocoder = await window.ymaps.geocode([coords.lat, coords.lng]);
      const firstGeoObject = geocoder.geoObjects.get(0);
      if (firstGeoObject) {
        const foundAddress = firstGeoObject.getAddressLine();
        setAddress(foundAddress);
      }
    } catch (error) {
      console.error('[LocationPicker] Error getting address:', error);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Update address when location changes
  useEffect(() => {
    getAddressFromCoords(selectedLocation);
  }, [selectedLocation]);

  const handleMapClick = (coords: MapCoordinates) => {
    setSelectedLocation(coords);
    onLocationSelect(coords, address);
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLocation, address);
  };

  const handleSearchAddress = async (searchQuery: string) => {
    if (!window.ymaps || !searchQuery.trim()) return;

    try {
      const geocoder = await window.ymaps.geocode(searchQuery, {
        results: 1,
      });

      const firstGeoObject = geocoder.geoObjects.get(0);
      if (firstGeoObject) {
        const coords = firstGeoObject.geometry.getCoordinates();
        const newLocation = { lat: coords[0], lng: coords[1] };
        setSelectedLocation(newLocation);
        setAddress(firstGeoObject.getAddressLine());
      }
    } catch (error) {
      console.error('[LocationPicker] Error searching address:', error);
    }
  };

  return (
    <div className={`location-picker ${className}`}>
      <div className="location-picker-header">
        <h3>Выберите расположение салона</h3>
        <p>Нажмите на карту, чтобы выбрать точное расположение</p>
      </div>

      {/* Search Bar */}
      <div className="location-search">
        <input
          type="text"
          placeholder="Поиск адреса..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearchAddress(e.currentTarget.value);
            }
          }}
          className="location-search-input"
        />
      </div>

      {/* Map */}
      <YandexMap
        center={selectedLocation}
        zoom={16}
        markers={[
          {
            id: 'selected',
            coordinates: selectedLocation,
            title: 'Выбранное местоположение',
            description: address || 'Определение адреса...',
          },
        ]}
        onMapClick={handleMapClick}
        height={height}
      />

      {/* Selected Location Info */}
      <div className="location-info">
        <div className="location-info-row">
          <strong>Координаты:</strong>
          <span>
            {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </span>
        </div>
        <div className="location-info-row">
          <strong>Адрес:</strong>
          <span>
            {isLoadingAddress ? (
              <span className="loading">Определение адреса...</span>
            ) : (
              address || 'Адрес не определен'
            )}
          </span>
        </div>
      </div>

      {/* Confirm Button */}
      <button onClick={handleConfirm} className="location-confirm-btn">
        Подтвердить расположение
      </button>

      <style>{`
        .location-picker {
          width: 100%;
        }

        .location-picker-header {
          margin-bottom: 16px;
        }

        .location-picker-header h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #333;
        }

        .location-picker-header p {
          margin: 0;
          font-size: 14px;
          color: #666;
        }

        .location-search {
          margin-bottom: 16px;
        }

        .location-search-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .location-search-input:focus {
          border-color: #667eea;
        }

        .location-info {
          margin-top: 16px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .location-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .location-info-row:last-child {
          margin-bottom: 0;
        }

        .location-info-row strong {
          color: #333;
        }

        .location-info-row span {
          color: #666;
          text-align: right;
          flex: 1;
          margin-left: 16px;
        }

        .loading {
          font-style: italic;
          color: #999;
        }

        .location-confirm-btn {
          width: 100%;
          margin-top: 16px;
          padding: 14px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .location-confirm-btn:hover {
          background: #5568d3;
        }

        .location-confirm-btn:active {
          background: #4c5fd1;
        }
      `}</style>
    </div>
  );
}

export default LocationPicker;
