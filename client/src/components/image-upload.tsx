import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  maxSize?: number; // в MB
  accept?: string;
  uploadType: "salons" | "masters" | "portfolio" | "avatars";
  className?: string;
  preview?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  label = "Upload Image",
  maxSize = 5,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  uploadType,
  className = "",
  preview = true,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера файла
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSize}MB`,
        variant: "destructive",
      });
      return;
    }

    // Проверка типа файла
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Создаем preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Загружаем на сервер
      const formData = new FormData();
      formData.append("image", file);

      const endpoint = `/api/upload/${
        uploadType === "salons"
          ? "salon-photo"
          : uploadType === "masters"
          ? "master-photo"
          : uploadType === "portfolio"
          ? "portfolio"
          : "avatar"
      }`;

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      onChange(data.url);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      setPreviewUrl("");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl("");
    if (onRemove) {
      onRemove();
    } else {
      onChange("");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && <Label>{label}</Label>}

      <div className="flex items-center gap-4">
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id={`file-upload-${uploadType}`}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </>
          )}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {preview && previewUrl && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Accepts: JPEG, PNG, WebP. Max size: {maxSize}MB
      </p>
    </div>
  );
}

// Компонент для множественной загрузки
interface MultiImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  uploadType: "salons" | "portfolio";
  className?: string;
}

export function MultiImageUpload({
  values = [],
  onChange,
  maxImages = 10,
  uploadType,
  className = "",
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Проверка лимита
    if (values.length + files.length > maxImages) {
      toast({
        title: "Too many images",
        description: `Maximum ${maxImages} images allowed`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch("/api/upload/salon-photos", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onChange([...values, ...data.urls]);

      toast({
        title: "Success",
        description: `${files.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    onChange(newValues);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Label>
          Images ({values.length}/{maxImages})
        </Label>

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          disabled={uploading || values.length >= maxImages}
          className="hidden"
          id="multi-file-upload"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || values.length >= maxImages}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Add Images
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {values.map((url, index) => (
          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
            <img
              src={url}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
