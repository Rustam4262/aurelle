import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { cn } from "@/lib/utils";
import { Expand, Image as ImageIcon } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  columns?: 2 | 3 | 4;
  aspectRatio?: "square" | "video" | "portrait";
  className?: string;
  showExpandIcon?: boolean;
  enableLazyLoad?: boolean;
}

export function ImageGallery({
  images,
  columns = 3,
  aspectRatio = "video",
  className = "",
  showExpandIcon = true,
  enableLazyLoad = true,
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>No images available</p>
        </div>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const columnClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  }[columns];

  const aspectClass = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
  }[aspectRatio];

  // Convert images to lightbox format
  const lightboxSlides = images.map((src) => ({ src }));

  return (
    <>
      <div className={cn("grid gap-4", columnClass, className)}>
        {images.map((image, index) => (
          <div
            key={index}
            className={cn(
              "relative group cursor-pointer overflow-hidden rounded-lg border bg-muted",
              aspectClass,
            )}
            onClick={() => openLightbox(index)}
          >
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className={cn(
                "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105",
              )}
              loading={enableLazyLoad ? "lazy" : undefined}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />

            {/* Expand icon */}
            {showExpandIcon && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/90 p-3 rounded-full">
                  <Expand className="h-6 w-6 text-gray-900" />
                </div>
              </div>
            )}

            {/* Image number badge */}
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {index + 1}/{images.length}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox with zoom and navigation */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
        }}
        carousel={{
          finite: false,
          preload: 2,
        }}
        controller={{
          closeOnBackdropClick: true,
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
        }}
        render={{
          buttonPrev: images.length > 1 ? undefined : () => null,
          buttonNext: images.length > 1 ? undefined : () => null,
        }}
      />
    </>
  );
}

// Specialized variant for salon photos (hero + grid)
interface SalonGalleryProps {
  images: string[];
  className?: string;
}

export function SalonGallery({ images, className = "" }: SalonGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>No salon photos available</p>
        </div>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const [heroImage, ...restImages] = images;
  const lightboxSlides = images.map((src) => ({ src }));

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {/* Hero Image */}
        <div
          className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group border"
          onClick={() => openLightbox(0)}
        >
          <img
            src={heroImage}
            alt="Salon hero"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/90 p-3 rounded-full">
              <Expand className="h-6 w-6 text-gray-900" />
            </div>
          </div>
          <div className="absolute top-4 left-4 bg-black/60 text-white text-sm px-3 py-1.5 rounded">
            1/{images.length}
          </div>
        </div>

        {/* Thumbnail Grid */}
        {restImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {restImages.slice(0, 7).map((image, index) => {
              const actualIndex = index + 1;
              const isLastVisible = index === 6 && restImages.length > 7;
              const remainingCount = restImages.length - 7;

              return (
                <div
                  key={actualIndex}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border"
                  onClick={() => openLightbox(actualIndex)}
                >
                  <img
                    src={image}
                    alt={`Salon ${actualIndex + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />

                  {/* +N more overlay on last image */}
                  {isLastVisible && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-semibold">+{remainingCount}</span>
                    </div>
                  )}

                  {!isLastVisible && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/90 p-2 rounded-full">
                        <Expand className="h-4 w-4 text-gray-900" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
        }}
        carousel={{
          finite: false,
          preload: 2,
        }}
        controller={{
          closeOnBackdropClick: true,
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
        }}
      />
    </>
  );
}

// Master Portfolio Gallery (optimized for portfolio images)
interface PortfolioGalleryProps {
  images: string[];
  masterName?: string;
  className?: string;
}

export function PortfolioGallery({
  images,
  masterName = "Master",
  className = "",
}: PortfolioGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>No portfolio images yet</p>
        </div>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxSlides = images.map((src) => ({ src }));

  return (
    <>
      {/* Masonry-style grid for portfolio */}
      <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4", className)}>
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border bg-muted"
            onClick={() => openLightbox(index)}
          >
            <img
              src={image}
              alt={`${masterName} portfolio ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-white/90 p-3 rounded-full">
                <Expand className="h-5 w-5 text-gray-900" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
        }}
        carousel={{
          finite: false,
          preload: 2,
        }}
        controller={{
          closeOnBackdropClick: true,
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
        }}
      />
    </>
  );
}
