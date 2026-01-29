# 📸 Image Upload - Status & Configuration

## ✅ Что реализовано

### Image Upload System Полностью Готов!

**Файлы:**

- [server/uploadRoutes.ts](server/uploadRoutes.ts) - Upload endpoints
- [server/upload.ts](server/upload.ts) - Multer configuration
- [server/imageOptimization.ts](server/imageOptimization.ts) - Sharp optimization
- [server/initUploads.ts](server/initUploads.ts) - Directory initialization

---

## 📊 Features

### 1. Multiple Upload Endpoints

#### Salon Photos

```typescript
POST /api/upload/salon-photo     // Single
POST /api/upload/salon-photos    // Multiple (max 10)

// Optimization:
width: 1200px
quality: 85%
format: WebP/JPEG
```

#### Master Photos

```typescript
POST /api/upload/master-photo

// Optimization:
width: 800px
quality: 85%
```

#### Portfolio Images

```typescript
POST /api/upload/portfolio

// Optimization:
width: 1000px
quality: 85%
```

#### Avatars

```typescript
POST /api/upload/avatar

// Optimization:
width: 400px
height: 400px (square)
quality: 85%
```

### 2. Image Optimization (Sharp)

- ✅ Automatic resizing
- ✅ Quality compression
- ✅ Format conversion (WebP support)
- ✅ Maintains aspect ratio (except avatars)

### 3. File Management

- ✅ Organized by type (salons/masters/portfolio/avatars)
- ✅ Unique filenames (timestamp + random)
- ✅ Delete endpoint
- ✅ File validation (mimetype, size)

### 4. Security

- ✅ Authentication required (isAuthenticated)
- ✅ Rate limiting (uploadLimiter: 20/15min)
- ✅ File type whitelist (images only)
- ✅ Size limits (10MB max)

---

## 🚀 Current Storage: Local Filesystem

### Directory Structure

```
/app/server/uploads/
├── salons/       # Salon photos
├── masters/      # Master photos
├── portfolio/    # Portfolio images
└── avatars/      # User avatars
```

### Initialization

```typescript
// server/index.ts:68
initializeUploadDirectories();

// Creates directories on startup
```

### File URLs

```
/uploads/salons/1673456789-abc123.jpg
/uploads/masters/1673456790-def456.jpg
/uploads/portfolio/1673456791-ghi789.jpg
/uploads/avatars/1673456792-jkl012.jpg
```

---

## 📈 Storage Limits

### Current Configuration

```typescript
// server/upload.ts
limits: {
  fileSize: 10 * 1024 * 1024,  // 10MB per file
}
```

### Docker Volume

```yaml
# docker-compose.yml
volumes:
  - ./uploads:/app/server/uploads # Persist uploads
```

**⚠️ Проблема:** Uploads НЕ персистятся в Docker!

Docker volume НЕ настроен → uploads теряются при restart контейнера.

---

## 🔧 Production Setup Required

### Шаг 1: Создать Volume для uploads

```bash
ssh root@89.39.94.194

# Создать директорию для uploads
mkdir -p /opt/aurelle/uploads/{salons,masters,portfolio,avatars}

# Установить правильные permissions
chown -R 1000:1000 /opt/aurelle/uploads
chmod -R 755 /opt/aurelle/uploads
```

### Шаг 2: Обновить docker-compose.yml

```yaml
# /opt/aurelle/docker-compose.yml
services:
  server:
    # ... existing config ...
    volumes:
      # Add uploads volume
      - /opt/aurelle/uploads:/app/server/uploads
```

### Шаг 3: Перезапустить контейнеры

```bash
cd /opt/aurelle
docker compose down
docker compose up -d
```

### Шаг 4: Проверить

```bash
# Создать тестовый файл
docker exec aurelle-server sh -c 'echo "test" > /app/server/uploads/test.txt'

# Проверить что файл сохранился на хосте
ls /opt/aurelle/uploads/
# Должен показать: test.txt

# Restart контейнера
docker compose restart server

# Проверить что файл остался
docker exec aurelle-server ls /app/server/uploads/
# Должен показать: test.txt ✅
```

---

## 🌐 Alternative: Cloud Storage (Recommended for Scale)

### Option 1: AWS S3

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage multer-s3
```

```typescript
// server/upload-s3.ts
import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";
import multer from "multer";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET!,
    acl: "public-read",
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, `${uploadType}/${filename}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});
```

**Преимущества:**

- ✅ Не занимает место на сервере
- ✅ Automatic backups
- ✅ CDN integration
- ✅ Scalable

**Стоимость:**

- First 5GB free
- $0.023/GB после

### Option 2: Cloudflare R2 (Cheaper S3 alternative)

```bash
npm install @aws-sdk/client-s3  # R2 is S3-compatible
```

**Преимущества:**

- ✅ S3-compatible API
- ✅ Бесплатно 10GB storage
- ✅ Бесплатный egress (no transfer fees)
- ✅ Automatic CDN

**Стоимость:**

- $0.015/GB storage (дешевле S3)
- $0 egress fees (vs $0.09/GB в S3)

### Option 3: Backblaze B2 (Cheapest)

```bash
npm install backblaze-b2
```

**Преимущества:**

- ✅ Самый дешёвый ($0.005/GB)
- ✅ First 10GB free
- ✅ S3-compatible API

**Минусы:**

- ⚠️ Медленнее чем S3/R2
- ⚠️ Нет встроенного CDN

---

## 🧪 Testing Uploads

### Test via curl:

```bash
# Upload salon photo
curl -X POST https://aurelle.uz/api/upload/salon-photo \
  -H "Cookie: connect.sid=<your-session>" \
  -F "image=@/path/to/photo.jpg"

# Response:
{
  "success": true,
  "url": "/uploads/salons/1673456789-abc123.jpg",
  "filename": "1673456789-abc123.jpg"
}

# Access uploaded image:
curl https://aurelle.uz/uploads/salons/1673456789-abc123.jpg
```

### Test via UI:

```
1. Login to AURELLE
2. Create/Edit salon
3. Upload photo (drag & drop or browse)
4. Check Network tab in DevTools:
   - POST /api/upload/salon-photo
   - Response: 200 OK with URL
5. Image should display in UI
```

---

## 📊 Storage Usage Monitoring

### Check disk usage:

```bash
ssh root@89.39.94.194

# Total uploads size
du -sh /opt/aurelle/uploads/
# Example: 156M

# Per category
du -sh /opt/aurelle/uploads/*
# 89M  salons
# 45M  portfolio
# 18M  masters
# 4M   avatars

# Largest files
find /opt/aurelle/uploads -type f -exec du -h {} + | sort -rh | head -20
```

### Cleanup old/unused uploads:

```bash
# Find files older than 30 days not referenced in DB
# (requires script to check DB references)

# Delete test files
find /opt/aurelle/uploads -name "test*" -delete
```

---

## ⚡ Performance Optimization

### Current: Synchronous Optimization

```typescript
// Blocks request until optimization complete
const optimizedBuffer = await optimizeImage(file.path, {...});
await fs.writeFile(file.path, optimizedBuffer);
```

### Better: Async Queue (BullMQ)

```bash
npm install bullmq
```

```typescript
// server/queues/image-optimization.ts
import { Queue, Worker } from "bullmq";

const imageQueue = new Queue("image-optimization");

// Add to queue (fast response)
router.post("/upload/salon-photo", async (req, res) => {
  // Save original file
  const filePath = req.file.path;

  // Add optimization job to queue
  await imageQueue.add("optimize", {
    filePath,
    options: { width: 1200, quality: 85 },
  });

  // Respond immediately
  return res.json({
    success: true,
    url: getFileUrl(req.file.filename, "salons"),
  });
});

// Worker processes queue in background
const worker = new Worker("image-optimization", async (job) => {
  const { filePath, options } = job.data;
  const optimizedBuffer = await optimizeImage(filePath, options);
  await fs.writeFile(filePath, optimizedBuffer);
});
```

**Преимущества:**

- ✅ Fast API response (< 100ms)
- ✅ Background processing
- ✅ Retry on failure
- ✅ Progress tracking

---

## 🎯 Recommendations

### For Current Load (< 1000 users):

✅ **Local filesystem** с Docker volume - достаточно

### For Medium Load (1000-10,000 users):

✅ **Cloudflare R2** - лучший баланс цена/производительность

### For High Load (> 10,000 users):

✅ **AWS S3** + CloudFront CDN - максимальная производительность

---

## 📝 Next Steps

### Immediate (Required):

1. ✅ Create `/opt/aurelle/uploads` directory
2. ✅ Add volume mount to docker-compose.yml
3. ✅ Restart containers
4. ✅ Test upload via UI

### Short-term (Optional):

- [ ] Add cleanup cron for orphaned files
- [ ] Implement usage monitoring
- [ ] Add image thumbnails generation
- [ ] Add progress bars for uploads

### Long-term (When scaling):

- [ ] Migrate to Cloudflare R2 or S3
- [ ] Add CDN for faster delivery
- [ ] Implement async optimization queue
- [ ] Add image transformation API

---

## ✅ Summary

**Image Upload System: ✅ Полностью реализован**

### Что работает:

- ✅ 4 типа uploads (salon/master/portfolio/avatar)
- ✅ Automatic optimization (Sharp)
- ✅ Security (auth, rate limiting, validation)
- ✅ Multiple endpoints

### Что нужно настроить:

- ⏳ Docker volume для persistence (5 минут)
- 💡 Cloud storage для масштабирования (опционально)

**Для production: Добавить Docker volume - и готово!** ✅
