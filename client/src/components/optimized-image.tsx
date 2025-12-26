import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  fallback?: string;
  className?: string;
}

// Дефолтные fallback изображения
const DEFAULT_FALLBACKS = {
  salon: "/assets/stock_images/luxury_beauty_salon__29a49bfb.jpg",
  master: "/assets/stock_images/happy_woman_client_b_55182bf5.jpg",
  service: "/assets/stock_images/professional_hair_co_bb7062a0.jpg",
  avatar: "/assets/stock_images/happy_woman_client_b_a10a2f35.jpg",
};

export function OptimizedImage({
  src,
  alt,
  fallback,
  className,
  ...props
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Определяем какой fallback использовать
  const getFallbackImage = () => {
    if (fallback) return fallback;

    // Автоопределение по alt тексту или другим подсказкам
    const lowerAlt = alt.toLowerCase();
    if (lowerAlt.includes("salon") || lowerAlt.includes("салон")) {
      return DEFAULT_FALLBACKS.salon;
    }
    if (lowerAlt.includes("master") || lowerAlt.includes("мастер")) {
      return DEFAULT_FALLBACKS.master;
    }
    if (lowerAlt.includes("avatar") || lowerAlt.includes("аватар")) {
      return DEFAULT_FALLBACKS.avatar;
    }
    return DEFAULT_FALLBACKS.service;
  };

  const imageSrc = imageError ? getFallbackImage() : src || getFallbackImage();

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {loading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        {...props}
        src={imageSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setImageError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}

// Компонент для галереи с lightbox
interface ImageGalleryProps {
  images: string[];
  alt?: string;
  className?: string;
  maxDisplay?: number;
}

export function ImageGallery({
  images,
  alt = "Gallery image",
  className,
  maxDisplay = 6,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, maxDisplay);
  const hasMore = images.length > maxDisplay;

  return (
    <>
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        {displayImages.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => setSelectedImage(image)}
          >
            <OptimizedImage
              src={image}
              alt={`${alt} ${index + 1}`}
              className="w-full h-full"
            />
            {hasMore && index === maxDisplay - 1 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">
                +{images.length - maxDisplay}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
              onClick={() => setSelectedImage(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
