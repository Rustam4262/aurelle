const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');

const newKeys = {
  ru: {
    notFound: {
      title: "404 — Страница не найдена",
      description: "Возможно, вы забыли добавить страницу в роутер?"
    },
    upload: {
      uploadImage: "Загрузить изображение",
      tooLarge: "Файл слишком большой",
      maxSizeDesc: "Максимальный размер файла {{size}} МБ",
      invalidType: "Неверный тип файла",
      selectImageDesc: "Пожалуйста, выберите файл изображения",
      successDesc: "Изображение успешно загружено",
      uploadFailed: "Ошибка загрузки",
      failedDesc: "Не удалось загрузить изображение. Попробуйте ещё раз.",
      uploaded: "Загружено!",
      uploading: "Загрузка...",
      chooseFile: "Выбрать файл",
      progressPercent: "{{progress}}% загружено",
      accepts: "Принимаются: JPEG, PNG, WebP. Макс. размер: {{size}} МБ",
      tooManyImages: "Слишком много изображений",
      maxImagesDesc: "Максимум {{max}} изображений",
      multiSuccessDesc: "{{count}} изображение(й) успешно загружено",
      multiFailedDesc: "Не удалось загрузить изображения. Попробуйте ещё раз.",
      imagesCount: "Изображения ({{count}}/{{max}})",
      addImages: "Добавить изображения",
      uploadingPercent: "Загрузка {{progress}}%"
    },
    location: {
      salon: "Салон",
      addressCopied: "Адрес скопирован",
      addressCopiedDesc: "Адрес успешно скопирован в буфер обмена",
      address: "Адрес:",
      copyAddress: "Скопировать адрес",
      openInYandex: "Открыть в Яндекс.Картах",
      coordinates: "Координаты:"
    }
  },
  en: {
    notFound: {
      title: "404 Page Not Found",
      description: "Did you forget to add the page to the router?"
    },
    upload: {
      uploadImage: "Upload Image",
      tooLarge: "File too large",
      maxSizeDesc: "Maximum file size is {{size}}MB",
      invalidType: "Invalid file type",
      selectImageDesc: "Please select an image file",
      successDesc: "Image uploaded successfully",
      uploadFailed: "Upload failed",
      failedDesc: "Failed to upload image. Please try again.",
      uploaded: "Uploaded!",
      uploading: "Uploading...",
      chooseFile: "Choose File",
      progressPercent: "{{progress}}% uploaded",
      accepts: "Accepts: JPEG, PNG, WebP. Max size: {{size}}MB",
      tooManyImages: "Too many images",
      maxImagesDesc: "Maximum {{max}} images allowed",
      multiSuccessDesc: "{{count}} image(s) uploaded successfully",
      multiFailedDesc: "Failed to upload images. Please try again.",
      imagesCount: "Images ({{count}}/{{max}})",
      addImages: "Add Images",
      uploadingPercent: "Uploading {{progress}}%"
    },
    location: {
      salon: "Salon",
      addressCopied: "Address copied",
      addressCopiedDesc: "Address successfully copied to clipboard",
      address: "Address:",
      copyAddress: "Copy address",
      openInYandex: "Open in Yandex Maps",
      coordinates: "Coordinates:"
    }
  },
  uz: {
    notFound: {
      title: "404 — Sahifa topilmadi",
      description: "Sahifani routerga qo'shishni unutdingizmi?"
    },
    upload: {
      uploadImage: "Rasm yuklash",
      tooLarge: "Fayl juda katta",
      maxSizeDesc: "Maksimal fayl hajmi {{size}} MB",
      invalidType: "Noto'g'ri fayl turi",
      selectImageDesc: "Iltimos, rasm faylini tanlang",
      successDesc: "Rasm muvaffaqiyatli yuklandi",
      uploadFailed: "Yuklash xatosi",
      failedDesc: "Rasmni yuklab bo'lmadi. Qaytadan urinib ko'ring.",
      uploaded: "Yuklandi!",
      uploading: "Yuklanmoqda...",
      chooseFile: "Fayl tanlash",
      progressPercent: "{{progress}}% yuklandi",
      accepts: "Qabul qilinadi: JPEG, PNG, WebP. Maks. hajm: {{size}} MB",
      tooManyImages: "Juda ko'p rasm",
      maxImagesDesc: "Maksimal {{max}} ta rasm",
      multiSuccessDesc: "{{count}} ta rasm muvaffaqiyatli yuklandi",
      multiFailedDesc: "Rasmlarni yuklab bo'lmadi. Qaytadan urinib ko'ring.",
      imagesCount: "Rasmlar ({{count}}/{{max}})",
      addImages: "Rasm qo'shish",
      uploadingPercent: "Yuklanmoqda {{progress}}%"
    },
    location: {
      salon: "Salon",
      addressCopied: "Manzil nusxalandi",
      addressCopiedDesc: "Manzil vaqtinchalik xotiraga nusxalandi",
      address: "Manzil:",
      copyAddress: "Manzilni nusxalash",
      openInYandex: "Yandex.Xaritada ochish",
      coordinates: "Koordinatalar:"
    }
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      if (target[key] === undefined) target[key] = source[key];
    }
  }
  return target;
}

for (const lang of ['ru', 'en', 'uz']) {
  const filePath = path.join(localesDir, `${lang}.json`);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  deepMerge(existing, newKeys[lang]);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`✓ ${lang}`);
}
console.log('Done!');
