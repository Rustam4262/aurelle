import { useEffect, useRef, useState } from 'react'
import { loadYandexMaps } from '../../lib/yandexMapsLoader'

export interface LocationPickerProps {
  initialCenter?: [number, number]  // [latitude, longitude]
  initialZoom?: number
  selectedLocation?: [number, number] | null
  onLocationSelect: (lat: number, lon: number) => void
  className?: string
  style?: React.CSSProperties
}

/**
 * Компонент для выбора координат на карте Yandex Maps
 * Клик по карте устанавливает маркер и вызывает callback
 */
export default function LocationPicker({
  initialCenter = [41.311151, 69.279737], // Ташкент по умолчанию
  initialZoom = 12,
  selectedLocation,
  onLocationSelect,
  className = '',
  style = {}
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [ymaps, setYmaps] = useState<any>(null)
  const [markerInstance, setMarkerInstance] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Загрузка Yandex Maps API
  useEffect(() => {
    let mounted = true

    const initMap = async () => {
      try {
        setLoading(true)
        const ymapsModule = await loadYandexMaps()

        if (!mounted) return

        setYmaps(ymapsModule)
        setError(null)
      } catch (err) {
        console.error('Ошибка загрузки Yandex Maps:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить карту')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initMap()

    return () => {
      mounted = false
    }
  }, [])

  // Инициализация карты
  useEffect(() => {
    if (!ymaps || !mapRef.current) return

    const {
      YMap,
      YMapDefaultSchemeLayer,
      YMapDefaultFeaturesLayer,
      YMapListener
    } = ymaps

    // Создаем карту
    const map = new YMap(mapRef.current, {
      location: {
        center: [initialCenter[1], initialCenter[0]], // [longitude, latitude]
        zoom: initialZoom
      },
      mode: 'vector'
    })

    // Добавляем базовые слои
    map.addChild(new YMapDefaultSchemeLayer())
    map.addChild(new YMapDefaultFeaturesLayer())

    // Добавляем слушатель кликов
    const handleMapClick = (object: any, event: any) => {
      if (!event || !event.coordinates) return

      const [lon, lat] = event.coordinates
      onLocationSelect(lat, lon)
    }

    const listener = new YMapListener({
      layer: 'any',
      onClick: handleMapClick
    })

    map.addChild(listener)

    setMapInstance(map)

    // Cleanup при unmount
    return () => {
      if (map) {
        map.destroy()
      }
    }
  }, [ymaps, initialCenter, initialZoom, onLocationSelect])

  // Обновление маркера при изменении выбранного местоположения
  useEffect(() => {
    if (!mapInstance || !ymaps || !selectedLocation) return

    const { YMapMarker } = ymaps

    // Удаляем старый маркер
    if (markerInstance) {
      mapInstance.removeChild(markerInstance)
    }

    // Создаем контент маркера
    const markerElement = document.createElement('div')
    markerElement.style.cursor = 'pointer'

    markerElement.innerHTML = `
      <div style="
        width: 50px;
        height: 50px;
        background-color: #e91e63;
        border: 4px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: bounce 0.5s ease-out;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg)">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `

    // Добавляем CSS анимацию
    const style = document.createElement('style')
    style.textContent = `
      @keyframes bounce {
        0% { transform: rotate(-45deg) translateY(-20px); opacity: 0; }
        50% { transform: rotate(-45deg) translateY(5px); }
        100% { transform: rotate(-45deg) translateY(0); }
      }
    `
    document.head.appendChild(style)

    // Создаем YMapMarker
    const marker = new YMapMarker(
      {
        coordinates: [selectedLocation[1], selectedLocation[0]], // [longitude, latitude]
        draggable: false
      },
      markerElement
    )

    mapInstance.addChild(marker)
    setMarkerInstance(marker)

    // Центрируем карту на новом маркере
    mapInstance.setLocation({
      center: [selectedLocation[1], selectedLocation[0]],
      zoom: 14,
      duration: 500
    })

    return () => {
      document.head.removeChild(style)
    }
  }, [mapInstance, ymaps, selectedLocation])

  // Состояния загрузки и ошибок
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ height: '400px', ...style }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка карты...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 ${className}`}
        style={{ height: '400px', ...style }}
      >
        <div className="text-center p-8">
          <svg
            className="w-16 h-16 text-red-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ошибка загрузки карты</h3>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ ...style }}>
      <div
        ref={mapRef}
        className="yandex-map-container"
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      />

      {/* Подсказка */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg z-10">
        <p className="text-sm text-gray-700 font-medium flex items-center">
          <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          Кликните на карту, чтобы выбрать местоположение
        </p>
      </div>

      {/* Координаты выбранного места */}
      {selectedLocation && (
        <div className="absolute bottom-4 left-4 bg-white px-4 py-2 rounded-lg shadow-lg z-10">
          <p className="text-xs text-gray-500">Выбранные координаты:</p>
          <p className="text-sm font-mono font-semibold text-gray-900">
            {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
          </p>
        </div>
      )}
    </div>
  )
}
