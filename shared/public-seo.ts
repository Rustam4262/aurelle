export const languages = ["ru", "uz", "en"] as const;
export type Language = (typeof languages)[number];
export type Translated = Partial<Record<Language, string>>;
export function splitLanguage(path: string) {
  const match = path.match(/^\/(ru|uz|en)(\/|$)/);
  return {
    language: (match?.[1] || "ru") as Language,
    localized: !!match,
    path: match ? path.slice(match[1].length + 1) || "/" : path,
  };
}
export function localizedPath(path: string, language: Language) {
  const clean = splitLanguage(path).path;
  return `/${language}${clean === "/" ? "" : clean}`;
}
export function isPublicPath(path: string) {
  const p = splitLanguage(path).path;
  return (
    ["/", "/search", "/salons"].includes(p) ||
    /^\/(salon|master)\/[^/]+$/.test(p) ||
    (/^\/[^/]+\/[^/]+$/.test(p) && !!cities.find((c) => p.startsWith(`/${c.slug}/`)))
  );
}
export const text = (value: Translated | null | undefined, lang: Language) =>
  value?.[lang] || value?.ru || value?.uz || value?.en || "";

export const cities = [
  {
    slug: "tashkent",
    ru: "Ташкент",
    uz: "Toshkent",
    en: "Tashkent",
    aliases: ["ташкент", "toshkent", "tashkent", "ташкент г."],
  },
  {
    slug: "samarkand",
    ru: "Самарканд",
    uz: "Samarqand",
    en: "Samarkand",
    aliases: ["самарканд", "samarqand", "samarkand"],
  },
  {
    slug: "bukhara",
    ru: "Бухара",
    uz: "Buxoro",
    en: "Bukhara",
    aliases: ["бухара", "buxoro", "bukhara"],
  },
  {
    slug: "andijan",
    ru: "Андижан",
    uz: "Andijon",
    en: "Andijan",
    aliases: ["андижан", "andijon", "andijan"],
  },
  {
    slug: "namangan",
    ru: "Наманган",
    uz: "Namangan",
    en: "Namangan",
    aliases: ["наманган", "namangan"],
  },
  {
    slug: "fergana",
    ru: "Фергана",
    uz: "Farg‘ona",
    en: "Fergana",
    aliases: ["фергана", "fergana", "farg'ona", "farg‘ona", "fargona"],
  },
  { slug: "nukus", ru: "Нукус", uz: "Nukus", en: "Nukus", aliases: ["нукус", "nukus"] },
  {
    slug: "urgench",
    ru: "Ургенч",
    uz: "Urganch",
    en: "Urgench",
    aliases: ["ургенч", "urganch", "urgench"],
  },
  { slug: "navoi", ru: "Навои", uz: "Navoiy", en: "Navoi", aliases: ["навои", "navoiy", "navoi"] },
  {
    slug: "karshi",
    ru: "Карши",
    uz: "Qarshi",
    en: "Karshi",
    aliases: ["карши", "qarshi", "karshi"],
  },
  {
    slug: "jizzakh",
    ru: "Джизак",
    uz: "Jizzax",
    en: "Jizzakh",
    aliases: ["джизак", "jizzax", "jizzakh"],
  },
  {
    slug: "termez",
    ru: "Термез",
    uz: "Termiz",
    en: "Termez",
    aliases: ["термез", "termiz", "termez"],
  },
  {
    slug: "gulistan",
    ru: "Гулистан",
    uz: "Guliston",
    en: "Gulistan",
    aliases: ["гулистан", "guliston", "gulistan"],
  },
];
export const cityFor = (value: string) =>
  cities.find((c) => c.aliases.includes(value.trim().toLowerCase()));
export const categories = [
  {
    slug: "hair-care",
    ru: "Уход за волосами",
    uz: "Soch parvarishi",
    en: "Hair care",
    values: ["hair", "haircut", "coloring", "styling"],
  },
  { slug: "haircuts", ru: "Стрижки", uz: "Soch turmagi", en: "Haircuts", values: ["haircut"] },
  {
    slug: "hair-coloring",
    ru: "Окрашивание волос",
    uz: "Soch bo‘yash",
    en: "Hair coloring",
    values: ["coloring"],
  },
  {
    slug: "nail-services",
    ru: "Ногтевой сервис",
    uz: "Tirnoq parvarishi",
    en: "Nail services",
    values: ["nails", "manicure", "pedicure"],
  },
  { slug: "manicure", ru: "Маникюр", uz: "Manikyur", en: "Manicure", values: ["manicure"] },
  { slug: "pedicure", ru: "Педикюр", uz: "Pedikyur", en: "Pedicure", values: ["pedicure"] },
  {
    slug: "barbershops",
    ru: "Барбер-услуги",
    uz: "Barber xizmatlari",
    en: "Barber services",
    values: ["barbershop", "beard", "shaving"],
  },
  { slug: "massage", ru: "Массаж", uz: "Massaj", en: "Massage", values: ["massage"] },
  { slug: "spa", ru: "СПА", uz: "SPA", en: "Spa", values: ["spa"] },
  { slug: "makeup", ru: "Макияж", uz: "Makiyaj", en: "Makeup", values: ["makeup"] },
  {
    slug: "skincare",
    ru: "Уход за кожей",
    uz: "Teri parvarishi",
    en: "Skin care",
    values: ["skincare", "facial"],
  },
];
export const copy = {
  ru: {
    home: "Салоны и мастера в Узбекистане",
    catalog: "Салоны и мастера",
    intro: "Сравните услуги и цены, выберите салон или мастера и удобное время для записи.",
    browse: "Услуги в вашем городе",
    services: "Услуги и цены",
    book: "Выбрать время",
    view: "Открыть страницу",
    minutes: "мин",
    hours: "График работы",
    closed: "Выходной",
    reviews: "Отзывы",
    team: "Мастера",
    empty: "Пока нет опубликованных предложений",
    unavailable: "Страница не найдена",
    retry: "Временно недоступно. Попробуйте позже.",
    back: "Все салоны и мастера",
    login: "Войти",
    description:
      "Выберите предложение, сравните цены и длительность услуг. Свободное время уточняется при записи.",
    days: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
  },
  uz: {
    home: "O‘zbekistondagi salonlar va ustalar",
    catalog: "Salonlar va ustalar",
    intro:
      "Xizmatlar va narxlarni solishtiring, salon yoki ustani va tashrif uchun qulay vaqtni tanlang.",
    browse: "Shahringizdagi xizmatlar",
    services: "Xizmatlar va narxlar",
    book: "Vaqtni tanlash",
    view: "Sahifani ochish",
    minutes: "daq",
    hours: "Ish vaqti",
    closed: "Dam olish kuni",
    reviews: "Sharhlar",
    team: "Ustalar",
    empty: "Hozircha e’lon qilingan takliflar yo‘q",
    unavailable: "Sahifa topilmadi",
    retry: "Vaqtincha mavjud emas. Keyinroq urinib ko‘ring.",
    back: "Barcha salonlar va ustalar",
    login: "Kirish",
    description:
      "Taklifni tanlang, xizmatlar narxi va davomiyligini solishtiring. Bo‘sh vaqtlar yozilish paytida ko‘rsatiladi.",
    days: ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"],
  },
  en: {
    home: "Salons and beauty professionals in Uzbekistan",
    catalog: "Salons and beauty professionals",
    intro:
      "Compare services and prices, choose a salon or professional, and find a time for your appointment.",
    browse: "Services in your city",
    services: "Services and prices",
    book: "Choose a time",
    view: "View profile",
    minutes: "min",
    hours: "Opening hours",
    closed: "Closed",
    reviews: "Reviews",
    team: "Professionals",
    empty: "No published offers yet",
    unavailable: "Page not found",
    retry: "Temporarily unavailable. Please try again later.",
    back: "All salons and professionals",
    login: "Sign in",
    description:
      "Choose a provider and compare service prices and duration. Available times are shown when you book.",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
};
export type PublicService = {
  id: string;
  name: string;
  category: string;
  audience?: string | null;
  priceMin: number;
  priceMax: number | null;
  duration: number;
};
export type PublicListing = {
  id: string;
  path: string;
  name: string;
  description: string;
  city: string;
  address: string;
  photo?: string;
  phone?: string;
  services: PublicService[];
};
export type PublicDocument = {
  path: string;
  language: Language;
  status: number;
  noIndex: boolean;
  kind: "home" | "search" | "landing" | "salon" | "master";
  title: string;
  description: string;
  listings: PublicListing[];
  links: { path: string; label: string }[];
  hours?: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean | null }[];
  reviews?: { rating: number; comment: string | null }[];
  team?: { name: string }[];
  schema?: Record<string, unknown>;
};
