import { useEffect, useRef, useState } from 'react'
import { loadYandexMaps } from '../../lib/yandexMapsLoader'

export interface MarkerData {
  id: number
  position: [number, number] // [latitude, longitude]
  title: string
  subtitle?: string
  rating?: number
  reviewsCount?: number
  link?: string
  logoUrl?: string
}

export interface YandexMapProps {
  center: [number, number]      // [latitude, longitude]
  zoom: number                  // 0-19
  markers: MarkerData[]
  selectedMarkerId?: number | null
  onMarkerClick?: (id: number) => void
  className?: string
  style?: React.CSSProperties
}

export default function YandexMap({
  center,
  zoom,
  markers,
  selectedMarkerId,
  onMarkerClick,
  className = '',
  style = {}
}: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [ymaps, setYmaps] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Загрузка Yandex Maps API
  useEffect(() => {
    let mounted = true

    const initMap = async () => {
      try {
        console.log('🗺️ YandexMap: Начинаю инициализацию...')
        setLoading(true)
        const ymapsModule = await loadYandexMaps()

        if (!mounted) {
          console.log('⚠️ YandexMap: Компонент размонтирован, отменяю инициализацию')
          return
        }

        console.log('✅ YandexMap: API успешно загружен, устанавливаю ymaps модуль')
        setYmaps(ymapsModule)
        setError(null)
      } catch (err) {
        console.error('❌ YandexMap: Ошибка загрузки:', err)
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
      YMapDefaultFeaturesLayer
    } = ymaps

    // Создаем карту
    const map = new YMap(mapRef.current, {
      location: {
        center: [center[1], center[0]], // Yandex использует [longitude, latitude]
        zoom: zoom
      },
      mode: 'vector'
    })

    // Добавляем базовые слои
    map.addChild(new YMapDefaultSchemeLayer())
    map.addChild(new YMapDefaultFeaturesLayer())

    setMapInstance(map)

    // Cleanup при unmount
    return () => {
      if (map) {
        map.destroy()
      }
    }
  }, [ymaps, center, zoom])

  // Обновление маркеров
  useEffect(() => {
    if (!mapInstance || !ymaps || !markers.length) return

    const { YMapMarker } = ymaps

    // Очищаем старые маркеры
    const children = mapInstance.children.getIterator()
    for (const child of children) {
      if (child.constructor.name === 'YMapMarker') {
        mapInstance.removeChild(child)
      }
    }

    // Добавляем новые маркеры
    markers.forEach((marker) => {
      const isSelected = selectedMarkerId === marker.id

      // Создаем контент маркера
      const markerElement = document.createElement('div')
      markerElement.className = `yandex-marker ${isSelected ? 'selected' : ''}`
      markerElement.style.cursor = 'pointer'
      markerElement.style.position = 'relative'

      // Простой маркер (можно кастомизировать)
      markerElement.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background-color: ${isSelected ? '#e91e63' : '#ff4081'};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `

      // Hover эффекты
      markerElement.addEventListener('mouseenter', () => {
        markerElement.style.transform = 'scale(1.1)'
      })
      markerElement.addEventListener('mouseleave', () => {
        markerElement.style.transform = 'scale(1)'
      })

      // Клик по маркеру
      markerElement.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(marker.id)
        }
      })

      // Создаем YMapMarker
      const yMapMarker = new YMapMarker(
        {
          coordinates: [marker.position[1], marker.position[0]], // [longitude, latitude]
          draggable: false
        },
        markerElement
      )

      mapInstance.addChild(yMapMarker)
    })
  }, [mapInstance, ymaps, markers, selectedMarkerId, onMarkerClick])

  // Обновление центра и зума при изменении
  useEffect(() => {
    if (!mapInstance) return

    mapInstance.setLocation({
      center: [center[1], center[0]], // [longitude, latitude]
      zoom: zoom,
      duration: 500 // Плавная анимация
    })
  }, [mapInstance, center, zoom])

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
    <div
      ref={mapRef}
      className={`yandex-map-container ${className}`}
      style={{ width: '100%', height: '400px', ...style }}
    />
  )
}
