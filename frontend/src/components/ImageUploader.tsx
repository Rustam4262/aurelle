import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { uploadsApi } from '../api/uploads'

interface ImageUploaderProps {
  onUpload: (url: string) => void
  maxSizeMB?: number
  accept?: string
  preview?: string
  className?: string
}

export default function ImageUploader({
  onUpload,
  maxSizeMB = 5,
  accept = 'image/*',
  preview,
  className = ''
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(preview || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      setError(`Размер файла не должен превышать ${maxSizeMB} МБ`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    setUploading(true)
    try {
      const uploadedUrl = await uploadsApi.uploadFile(file)
      onUpload(uploadedUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Не удалось загрузить изображение')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`relative ${className}`}>
      {previewUrl ? (
        // Preview mode
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-64 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                <p>Загрузка...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Upload zone
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div className="text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3"></div>
              <p>Загрузка изображения...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">
                Перетащите изображение сюда
              </p>
              <p className="text-gray-500 text-sm mb-4">
                или нажмите для выбора файла
              </p>
              <div className="flex items-center justify-center text-xs text-gray-500 space-x-4">
                <div className="flex items-center">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  <span>PNG, JPG, GIF</span>
                </div>
                <div>
                  <span>Макс. {maxSizeMB} МБ</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-3 flex items-center text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
