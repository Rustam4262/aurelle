import { useMemo } from 'react'
import YandexMap, { MarkerData } from './map/YandexMap'
import { SalonMapData } from '../api/salons'

interface SalonsMapProps {
  salons: SalonMapData[]
  selectedSalonId?: number | null
  onMarkerClick?: (salonId: number) => void
}

export default function SalonsMap({ salons, selectedSalonId, onMarkerClick }: SalonsMapProps) {
  // Центр карты по умолчанию (Ташкент, Узбекистан)
  const defaultCenter: [number, number] = [41.311151, 69.279737]
  const defaultZoom = 11

  // Вычисляем центр карты на основе салонов
  const mapCenter: [number, number] = useMemo(() => {
    if (salons.length === 0) return defaultCenter

    const avgLat = salons.reduce((sum, s) => sum + s.latitude, 0) / salons.length
    const avgLon = salons.reduce((sum, s) => sum + s.longitude, 0) / salons.length

    return [avgLat, avgLon]
  }, [salons])

  // Если выбран салон, центрируем карту на нем
  const selectedSalon = selectedSalonId
    ? salons.find(s => s.id === selectedSalonId)
    : null

  const center: [number, number] = selectedSalon
    ? [selectedSalon.latitude, selectedSalon.longitude]
    : mapCenter

  const zoom = selectedSalon ? 14 : defaultZoom

  // Преобразуем данные салонов в формат маркеров
  const markers: MarkerData[] = useMemo(() => {
    return salons.map(salon => ({
      id: salon.id,
      position: [salon.latitude, salon.longitude],
      title: salon.name,
      subtitle: salon.address,
      rating: salon.rating,
      reviewsCount: salon.reviews_count,
      logoUrl: salon.logo_url || undefined
    }))
  }, [salons])

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
      <YandexMap
        center={center}
        zoom={zoom}
        markers={markers}
        selectedMarkerId={selectedSalonId}
        onMarkerClick={onMarkerClick}
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      />
    </div>
  )
}
