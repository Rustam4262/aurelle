import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Plus,
  FileImage,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PortfolioImage {
  id: string;
  file: File;
  preview: string;
  title?: string;
  description?: string;
  category?: string;
  uploaded?: boolean;
  uploadProgress?: number;
}

interface PortfolioUploadProps {
  masterId: string;
  maxImages?: number;
  onUploadSuccess?: (urls: string[]) => void;
  className?: string;
}

export function PortfolioUpload({
  masterId,
  maxImages = 10,
  onUploadSuccess,
  className = "",
}: PortfolioUploadProps) {
  const { t } = useTranslation();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editingImage, setEditingImage] = useState<PortfolioImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle file selection
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      // Check max images limit
      if (images.length + fileArray.length > maxImages) {
        toast({
          title: t("marketplace.portfolio.upload.errors.tooMany"),
          description: t("marketplace.portfolio.upload.errors.tooManyDesc", { max: maxImages }),
          variant: "destructive",
        });
        return;
      }

      // Validate and create previews
      const validImages: PortfolioImage[] = [];

      fileArray.forEach((file) => {
        // Check file type
        if (!file.type.startsWith("image/")) {
          toast({
            title: t("marketplace.portfolio.upload.errors.invalidType"),
            description: t("marketplace.portfolio.upload.errors.invalidTypeDesc", {
              name: file.name,
            }),
            variant: "destructive",
          });
          return;
        }

        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: t("marketplace.portfolio.upload.errors.tooLarge"),
            description: t("marketplace.portfolio.upload.errors.tooLargeDesc", { name: file.name }),
            variant: "destructive",
          });
          return;
        }

        // Create preview
        const preview = URL.createObjectURL(file);
        validImages.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
          uploaded: false,
          uploadProgress: 0,
        });
      });

      setImages((prev) => [...prev, ...validImages]);
    },
    [images.length, maxImages, toast],
  );

  // Handle drag & drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Remove image
  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  // Open edit dialog
  const handleEditImage = (image: PortfolioImage) => {
    setEditingImage(image);
  };

  // Save image metadata
  const handleSaveMetadata = () => {
    if (!editingImage) return;

    setImages((prev) =>
      prev.map((img) =>
        img.id === editingImage.id
          ? {
              ...img,
              title: editingImage.title,
              description: editingImage.description,
              category: editingImage.category,
            }
          : img,
      ),
    );
    setEditingImage(null);
  };

  // Upload all images
  const handleUploadAll = async () => {
    if (images.length === 0) {
      toast({
        title: t("marketplace.portfolio.upload.errors.noImages"),
        description: t("marketplace.portfolio.upload.errors.noImagesDesc"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      // Upload images one by one
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (image.uploaded) continue;

        // Update progress
        setImages((prev) =>
          prev.map((img) => (img.id === image.id ? { ...img, uploadProgress: 0 } : img)),
        );

        // Simulate progress during upload
        const progressInterval = setInterval(() => {
          setImages((prev) =>
            prev.map((img) => {
              if (img.id === image.id && img.uploadProgress! < 90) {
                return { ...img, uploadProgress: img.uploadProgress! + 10 };
              }
              return img;
            }),
          );
        }, 200);

        // Upload to server
        const formData = new FormData();
        formData.append("image", image.file);
        if (image.title) formData.append("title", image.title);
        if (image.description) formData.append("description", image.description);
        if (image.category) formData.append("category", image.category);

        const response = await fetch(`/api/portfolio/master/${masterId}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          throw new Error(`Failed to upload ${image.file.name}`);
        }

        const data = await response.json();
        uploadedUrls.push(data.url);

        // Mark as uploaded
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, uploaded: true, uploadProgress: 100 } : img,
          ),
        );
      }

      toast({
        title: t("marketplace.portfolio.upload.success.title"),
        description: t("marketplace.portfolio.upload.success.description", {
          count: images.length,
        }),
      });

      if (onUploadSuccess) {
        onUploadSuccess(uploadedUrls);
      }

      // Clear uploaded images after a delay
      setTimeout(() => {
        setImages([]);
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: t("marketplace.portfolio.upload.errors.uploadFailed"),
        description: t("marketplace.portfolio.upload.errors.uploadFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploading || images.length >= maxImages}
        />

        <div className="text-center">
          <FileImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("marketplace.portfolio.upload.title")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("marketplace.portfolio.upload.dragDrop")}
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= maxImages}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("marketplace.portfolio.upload.chooseFiles")}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            {t("marketplace.portfolio.upload.limitations", {
              count: images.length,
              max: maxImages,
            })}
          </p>
        </div>
      </div>

      {/* Image Grid Preview */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">
              {t("marketplace.portfolio.upload.selectedImages", { count: images.length })}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  images.forEach((img) => URL.revokeObjectURL(img.preview));
                  setImages([]);
                }}
                disabled={uploading}
              >
                {t("marketplace.portfolio.upload.clearAll")}
              </Button>
              <Button
                size="sm"
                onClick={handleUploadAll}
                disabled={uploading || images.every((img) => img.uploaded)}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("marketplace.portfolio.upload.uploading")}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("marketplace.portfolio.upload.uploadAll")}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="relative group overflow-hidden">
                {/* Image Preview */}
                <div className="aspect-square relative">
                  <img
                    src={image.preview}
                    alt={image.title || "Portfolio preview"}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditImage(image)}
                      disabled={uploading}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveImage(image.id)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Upload status badge */}
                  {image.uploaded && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t("marketplace.portfolio.upload.uploaded")}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {uploading && !image.uploaded && typeof image.uploadProgress === "number" && (
                  <div className="p-2">
                    <Progress value={image.uploadProgress} className="h-1" />
                  </div>
                )}

                {/* Metadata */}
                {(image.title || image.description || image.category) && (
                  <div className="p-2 border-t">
                    {image.title && (
                      <p className="text-xs font-medium line-clamp-1">{image.title}</p>
                    )}
                    {image.category && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {image.category}
                      </Badge>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">{t("marketplace.portfolio.upload.emptyState")}</p>
        </Card>
      )}

      {/* Edit Image Dialog */}
      <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.portfolio.upload.editDetails")}</DialogTitle>
          </DialogHeader>

          {editingImage && (
            <div className="space-y-4 py-4">
              {/* Preview */}
              <div className="aspect-video rounded-lg overflow-hidden border">
                <img
                  src={editingImage.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">{t("marketplace.portfolio.upload.titleLabel")}</Label>
                <Input
                  id="title"
                  value={editingImage.title || ""}
                  onChange={(e) => setEditingImage({ ...editingImage, title: e.target.value })}
                  placeholder={t("marketplace.portfolio.upload.titlePlaceholder")}
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">
                  {t("marketplace.portfolio.upload.descriptionLabel")}
                </Label>
                <Textarea
                  id="description"
                  value={editingImage.description || ""}
                  onChange={(e) =>
                    setEditingImage({ ...editingImage, description: e.target.value })
                  }
                  placeholder={t("marketplace.portfolio.upload.descriptionPlaceholder")}
                  rows={3}
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">{t("marketplace.portfolio.upload.categoryLabel")}</Label>
                <Input
                  id="category"
                  value={editingImage.category || ""}
                  onChange={(e) => setEditingImage({ ...editingImage, category: e.target.value })}
                  placeholder={t("marketplace.portfolio.upload.categoryPlaceholder")}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingImage(null)}>
              {t("marketplace.portfolio.upload.cancel")}
            </Button>
            <Button onClick={handleSaveMetadata}>
              {t("marketplace.portfolio.upload.saveDetails")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
