const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');

const newKeys = {
  ru: {
    search: {
      backToHome: "Назад",
      subtitle: "Найдите лучшие салоны красоты рядом с вами",
      filters: "Фильтры",
      clearAll: "Сбросить всё",
      searchLabel: "Поиск",
      salonNamePlaceholder: "Название салона...",
      location: "Локация",
      allCities: "Все города",
      serviceCategory: "Категория услуг",
      minRating: "Минимальный рейтинг",
      applyFilters: "Применить фильтры",
      loading: "Загрузка...",
      results: "Результаты",
      filterApplied_one: "{{count}} фильтр применён",
      filterApplied_few: "{{count}} фильтра применено",
      filterApplied_many: "{{count}} фильтров применено",
      searchPrefix: "Поиск:",
      starsLabel: "+ звёзд",
      noSalonsFound: "Салоны не найдены",
      noSalonsDesc: "Попробуйте изменить фильтры или выбрать другой район",
      clearAllFilters: "Сбросить все фильтры"
    },
    owner: {
      registerSalon: "Зарегистрируйте салон",
      registerSalonDesc: "Войдите, чтобы зарегистрировать салон и начать привлекать новых клиентов.",
      signInToContinue: "Войти для продолжения"
    }
  },
  en: {
    search: {
      backToHome: "Back to Home",
      subtitle: "Discover the best beauty salons in your area",
      filters: "Filters",
      clearAll: "Clear all",
      searchLabel: "Search",
      salonNamePlaceholder: "Salon name...",
      location: "Location",
      allCities: "All Cities",
      serviceCategory: "Service Category",
      minRating: "Minimum Rating",
      applyFilters: "Apply Filters",
      loading: "Loading...",
      results: "Results",
      filterApplied_one: "{{count}} filter applied",
      filterApplied_other: "{{count}} filters applied",
      searchPrefix: "Search:",
      starsLabel: "+ Stars",
      noSalonsFound: "No salons found",
      noSalonsDesc: "Try adjusting your filters or search in a different area",
      clearAllFilters: "Clear all filters"
    },
    owner: {
      registerSalon: "Register Your Salon",
      registerSalonDesc: "Sign in to register your salon and start attracting new clients.",
      signInToContinue: "Sign In to Continue"
    }
  },
  uz: {
    search: {
      backToHome: "Orqaga",
      subtitle: "Yaqin atrofingizda eng yaxshi go'zallik salonlarini toping",
      filters: "Filtrlar",
      clearAll: "Hammasini tozalash",
      searchLabel: "Qidirish",
      salonNamePlaceholder: "Salon nomi...",
      location: "Joylashuv",
      allCities: "Barcha shaharlar",
      serviceCategory: "Xizmat kategoriyasi",
      minRating: "Minimal reyting",
      applyFilters: "Filtrlarni qo'llash",
      loading: "Yuklanmoqda...",
      results: "Natijalar",
      filterApplied_one: "{{count}} filtr qo'llanildi",
      filterApplied_other: "{{count}} filtr qo'llanildi",
      searchPrefix: "Qidiruv:",
      starsLabel: "+ yulduz",
      noSalonsFound: "Salonlar topilmadi",
      noSalonsDesc: "Filtrlarni o'zgartiring yoki boshqa hududda qidiring",
      clearAllFilters: "Barcha filtrlarni tozalash"
    },
    owner: {
      registerSalon: "Saloningizni ro'yxatdan o'tkazing",
      registerSalonDesc: "Saloningizni ro'yxatdan o'tkazish va yangi mijozlarni jalb qilish uchun kiring.",
      signInToContinue: "Davom etish uchun kiring"
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
