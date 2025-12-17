/**
 * SalonMap Component
 * Displays salons on Yandex Map with search and filtering
 */

import { useState, useEffect } from 'react';
import { YandexMap, MapCoordinates, MapMarker } from './YandexMap';

export interface Salon {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  reviews_count?: number;
  phone?: string;
  working_hours?: string;
}

interface SalonMapProps {
  salons: Salon[];
  selectedSalonId?: number;
  onSalonSelect?: (salon: Salon) => void;
  center?: MapCoordinates;
  zoom?: number;
  height?: string;
  showList?: boolean;
  className?: string;
}

export function SalonMap({
  salons,
  selectedSalonId,
  onSalonSelect,
  center,
  zoom = 12,
  height = '500px',
  showList = true,
  className = '',
}: SalonMapProps) {
  const [mapCenter, setMapCenter] = useState<MapCoordinates>(
    center || { lat: 41.2995, lng: 69.2401 } // Tashkent
  );
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [filteredSalons, setFilteredSalons] = useState<Salon[]>(salons);
  const [searchQuery, setSearchQuery] = useState('');

  // Update filtered salons when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSalons(salons);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = salons.filter(
      (salon) =>
        salon.name.toLowerCase().includes(query) ||
        salon.address.toLowerCase().includes(query)
    );
    setFilteredSalons(filtered);
  }, [searchQuery, salons]);

  // Update selected salon when prop changes
  useEffect(() => {
    if (selectedSalonId) {
      const salon = salons.find((s) => s.id === selectedSalonId);
      if (salon) {
        setSelectedSalon(salon);
        setMapCenter({ lat: salon.latitude, lng: salon.longitude });
      }
    }
  }, [selectedSalonId, salons]);

  // Convert salons to map markers
  const markers: MapMarker[] = filteredSalons.map((salon) => ({
    id: salon.id,
    coordinates: {
      lat: salon.latitude,
      lng: salon.longitude,
    },
    title: salon.name,
    description: `
      <div style="padding: 8px;">
        <div style="margin-bottom: 8px;">
          <strong>${salon.name}</strong>
          ${salon.rating ? `<div>⭐ ${salon.rating.toFixed(1)} (${salon.reviews_count || 0} отзывов)</div>` : ''}
        </div>
        <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
          📍 ${salon.address}
        </div>
        ${salon.phone ? `<div style="font-size: 13px; color: #666; margin-bottom: 8px;">📞 ${salon.phone}</div>` : ''}
        ${salon.working_hours ? `<div style="font-size: 13px; color: #666;">🕒 ${salon.working_hours}</div>` : ''}
      </div>
    `,
    onClick: () => handleSalonClick(salon),
  }));

  const handleSalonClick = (salon: Salon) => {
    setSelectedSalon(salon);
    setMapCenter({ lat: salon.latitude, lng: salon.longitude });
    if (onSalonSelect) {
      onSalonSelect(salon);
    }
  };

  return (
    <div className={`salon-map-container ${className}`}>
      {/* Search Bar */}
      <div className="salon-map-search">
        <input
          type="text"
          placeholder="Поиск салона по названию или адресу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="salon-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="search-clear-btn"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="salon-map-content" style={{ display: 'flex', gap: '16px' }}>
        {/* Salon List */}
        {showList && (
          <div className="salon-list" style={{ width: '300px', maxHeight: height, overflowY: 'auto' }}>
            {filteredSalons.length === 0 ? (
              <div className="no-salons">
                <p>Салоны не найдены</p>
              </div>
            ) : (
              filteredSalons.map((salon) => (
                <div
                  key={salon.id}
                  className={`salon-list-item ${selectedSalon?.id === salon.id ? 'selected' : ''}`}
                  onClick={() => handleSalonClick(salon)}
                  style={{ cursor: 'pointer' }}
                >
                  <h4>{salon.name}</h4>
                  {salon.rating && (
                    <div className="salon-rating">
                      ⭐ {salon.rating.toFixed(1)} ({salon.reviews_count || 0})
                    </div>
                  )}
                  <p className="salon-address">📍 {salon.address}</p>
                  {salon.phone && <p className="salon-phone">📞 {salon.phone}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* Map */}
        <div style={{ flex: 1 }}>
          <YandexMap
            center={mapCenter}
            zoom={zoom}
            markers={markers}
            height={height}
          />
        </div>
      </div>

      <style>{`
        .salon-map-container {
          width: 100%;
        }

        .salon-map-search {
          position: relative;
          margin-bottom: 16px;
        }

        .salon-search-input {
          width: 100%;
          padding: 12px 40px 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .salon-search-input:focus {
          border-color: #667eea;
        }

        .search-clear-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #999;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
        }

        .search-clear-btn:hover {
          color: #333;
        }

        .salon-list {
          background: white;
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .salon-list-item {
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 6px;
          border: 1px solid #eee;
          transition: all 0.2s;
        }

        .salon-list-item:hover {
          border-color: #667eea;
          background-color: #f8f9ff;
        }

        .salon-list-item.selected {
          border-color: #667eea;
          background-color: #f0f2ff;
        }

        .salon-list-item h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #333;
        }

        .salon-rating {
          font-size: 13px;
          color: #666;
          margin-bottom: 4px;
        }

        .salon-address,
        .salon-phone {
          margin: 4px 0;
          font-size: 13px;
          color: #666;
        }

        .no-salons {
          padding: 40px 20px;
          text-align: center;
          color: #999;
        }

        @media (max-width: 768px) {
          .salon-map-content {
            flex-direction: column;
          }

          .salon-list {
            width: 100% !important;
            max-height: 300px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SalonMap;
