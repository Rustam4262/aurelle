import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'

interface Photo {
  id: number
  url: string
  caption?: string
}

interface Props {
  photos: Photo[]
  salonName: string
}

export default function PhotoGallery({ photos, salonName }: Props) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

  const openLightbox = (index: number) => {
    setSelectedPhotoIndex(index)
  }

  const closeLightbox = () => {
    setSelectedPhotoIndex(null)
  }

  const goToPrevious = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1)
    }
  }

  const goToNext = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') goToPrevious()
    if (e.key === 'ArrowRight') goToNext()
  }

  if (photos.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-pink-50 rounded-2xl p-12 text-center border border-gray-200">
        <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Нет фотографий</h3>
        <p className="text-gray-600">Фото портфолио еще не добавлены</p>
      </div>
    )
  }

  return (
    <div>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(index)}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
            style={{
              animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
            }}
          >
            <img
              src={photo.url}
              alt={photo.caption || `${salonName} фото ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center justify-center gap-2 text-white">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Посмотреть</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhotoIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous button */}
          {selectedPhotoIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevious()
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all transform hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next button */}
          {selectedPhotoIndex < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all transform hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-7xl max-h-[90vh] animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[selectedPhotoIndex].url}
              alt={photos[selectedPhotoIndex].caption || `${salonName} фото ${selectedPhotoIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />

            {/* Caption */}
            {photos[selectedPhotoIndex].caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-2xl">
                <p className="text-white text-center">{photos[selectedPhotoIndex].caption}</p>
              </div>
            )}

            {/* Counter */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium">
              {selectedPhotoIndex + 1} / {photos.length}
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/60 text-sm">
            <span className="hidden md:inline">Используйте ← → для навигации, ESC для закрытия</span>
            <span className="md:hidden">Нажмите для закрытия</span>
          </div>
        </div>
      )}
    </div>
  )
}
