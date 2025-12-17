/**
 * YandexMap Component
 * Yandex Maps integration with markers and location search
 */

import { useEffect, useRef, useState } from 'react';

// Declare ymaps global type
declare global {
  interface Window {
    ymaps: any;
  }
}

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface MapMarker {
  id: string | number;
  coordinates: MapCoordinates;
  title?: string;
  description?: string;
  onClick?: () => void;
}

interface YandexMapProps {
  center?: MapCoordinates;
  zoom?: number;
  markers?: MapMarker[];
  onMapClick?: (coordinates: MapCoordinates) => void;
  height?: string;
  width?: string;
  className?: string;
}

export function YandexMap({
  center = { lat: 41.2995, lng: 69.2401 }, // Tashkent by default
  zoom = 12,
  markers = [],
  onMapClick,
  height = '400px',
  width = '100%',
  className = '',
}: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const markersRef = useRef<Map<string | number, any>>(new Map());

  // Load Yandex Maps API
  useEffect(() => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0';

    // Check if already loaded
    if (window.ymaps) {
      setIsLoaded(true);
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      window.ymaps.ready(() => {
        console.log('[YandexMap] API loaded successfully');
        setIsLoaded(true);
      });
    };

    script.onerror = () => {
      console.error('[YandexMap] Failed to load Yandex Maps API');
      setIsError(true);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    const newMap = new window.ymaps.Map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      controls: ['zoomControl', 'searchControl', 'typeSelector', 'fullscreenControl'],
    });

    // Handle map click
    if (onMapClick) {
      newMap.events.add('click', (e: any) => {
        const coords = e.get('coords');
        onMapClick({ lat: coords[0], lng: coords[1] });
      });
    }

    setMap(newMap);

    return () => {
      // Cleanup map on unmount
      if (newMap) {
        newMap.destroy();
      }
    };
  }, [isLoaded, center.lat, center.lng, zoom, onMapClick]);

  // Update markers
  useEffect(() => {
    if (!map) return;

    // Remove old markers that are not in the new list
    const currentMarkerIds = new Set(markers.map(m => m.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        map.geoObjects.remove(marker);
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    markers.forEach((markerData) => {
      const existingMarker = markersRef.current.get(markerData.id);

      if (existingMarker) {
        // Update existing marker position
        existingMarker.geometry.setCoordinates([markerData.coordinates.lat, markerData.coordinates.lng]);
      } else {
        // Create new marker
        const placemark = new window.ymaps.Placemark(
          [markerData.coordinates.lat, markerData.coordinates.lng],
          {
            balloonContentHeader: markerData.title || '',
            balloonContentBody: markerData.description || '',
          },
          {
            preset: 'islands#redDotIcon',
          }
        );

        // Add click handler
        if (markerData.onClick) {
          placemark.events.add('click', markerData.onClick);
        }

        map.geoObjects.add(placemark);
        markersRef.current.set(markerData.id, placemark);
      }
    });
  }, [map, markers]);

  // Update map center when prop changes
  useEffect(() => {
    if (map) {
      map.setCenter([center.lat, center.lng], zoom, {
        duration: 300,
      });
    }
  }, [map, center.lat, center.lng, zoom]);

  if (isError) {
    return (
      <div
        className={`yandex-map-error ${className}`}
        style={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ textAlign: 'center', color: '#999' }}>
          <p>⚠️ Ошибка загрузки карты</p>
          <p style={{ fontSize: '14px' }}>Проверьте подключение к интернету</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`yandex-map-loading ${className}`}
        style={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 10px' }}>🗺️</div>
          <p style={{ color: '#999' }}>Загрузка карты...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`yandex-map ${className}`}
      style={{ height, width }}
    />
  );
}

export default YandexMap;
