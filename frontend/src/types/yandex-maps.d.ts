/**
 * TypeScript type definitions for Yandex Maps API v3
 * Базовые типы для использования с Yandex Maps
 */

declare global {
  interface Window {
    ymaps3?: typeof ymaps3
  }
}

export interface YMaps3 {
  ready: Promise<void>
  YMap: any
  YMapDefaultSchemeLayer: any
  YMapDefaultFeaturesLayer: any
  YMapMarker: any
  YMapListener: any
  YMapControls: any
  YMapControl: any
  YMapGeolocationControl: any
  YMapZoomControl: any
}

export interface YMapLocation {
  center: [number, number] // [latitude, longitude]
  zoom: number             // 0-19
}

export interface YMapProps {
  location: YMapLocation
  mode?: 'vector' | 'raster'
  theme?: 'light' | 'dark'
  behaviors?: string[]
  zoomRange?: {
    min: number
    max: number
  }
}

export interface YMapMarkerProps {
  coordinates: [number, number] // [latitude, longitude]
  draggable?: boolean
  properties?: Record<string, any>
  source?: string
}

export interface MarkerFeature {
  type: 'Feature'
  id: string | number
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude] - внимание! В GeoJSON обратный порядок
  }
  properties?: Record<string, any>
}

declare const ymaps3: YMaps3

export default ymaps3
