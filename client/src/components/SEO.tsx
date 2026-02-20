import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile' | 'business.business';
  locale?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  structuredData?: any; // Schema.org JSON-LD
  noIndex?: boolean;
  canonical?: string;
}

const defaultProps: Partial<SEOProps> = {
  siteName: 'AURELLE',
  type: 'website',
  locale: 'ru_RU',
  twitterCard: 'summary_large_image',
  twitterSite: '@aurelle_uz',
  image: 'https://aurelle.uz/og-image.jpg', // Default OG image
  description: 'AURELLE - современная платформа для поиска салонов красоты и записи к мастерам в Узбекистане. Маникюр, педикюр, стрижки, макияж и другие услуги онлайн.',
};

export function SEO(props: SEOProps) {
  const {
    title,
    description = defaultProps.description,
    keywords,
    image = defaultProps.image,
    url,
    type = defaultProps.type,
    locale = defaultProps.locale,
    siteName = defaultProps.siteName,
    author,
    publishedTime,
    modifiedTime,
    twitterCard = defaultProps.twitterCard,
    twitterSite = defaultProps.twitterSite,
    structuredData,
    noIndex = false,
    canonical,
  } = props;

  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://aurelle.uz');
  const canonicalUrl = canonical || currentUrl;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (Schema.org) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

// Predefined SEO configurations for common pages

export const HomeSEO = () => (
  <SEO
    title="Поиск салонов красоты и запись к мастерам онлайн"
    description="AURELLE - современная платформа для поиска салонов красоты и записи к мастерам в Узбекистане. 500+ салонов, 10,000+ мастеров. Маникюр, педикюр, стрижки, макияж."
    keywords="салон красоты, маникюр, педикюр, стрижка, макияж, парикмахерская, барбершоп, spa, массаж, Ташкент, Узбекистан, онлайн запись"
    structuredData={{
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "AURELLE",
      "url": "https://aurelle.uz",
      "description": "Платформа для поиска салонов красоты и записи к мастерам",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://aurelle.uz/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }}
  />
);

export const SearchSEO = () => (
  <SEO
    title="Поиск салонов и мастеров"
    description="Найдите лучшие салоны красоты и профессиональных мастеров в вашем городе. Фильтры по услугам, рейтингу и расположению."
    keywords="поиск салонов, найти мастера, салон рядом, запись онлайн"
  />
);

export const SalonSEO = ({
  salonName,
  description,
  image,
  rating,
  address,
  phone,
  services
}: {
  salonName: string;
  description?: string;
  image?: string;
  rating?: number;
  address?: string;
  phone?: string;
  services?: string[];
}) => (
  <SEO
    title={`${salonName} - салон красоты`}
    description={description || `Запись в салон ${salonName}. Профессиональные услуги красоты в Узбекистане.`}
    image={image}
    type="business.business"
    structuredData={{
      "@context": "https://schema.org",
      "@type": "BeautySalon",
      "name": salonName,
      "description": description,
      "image": image,
      "address": address ? {
        "@type": "PostalAddress",
        "streetAddress": address
      } : undefined,
      "telephone": phone,
      "aggregateRating": rating ? {
        "@type": "AggregateRating",
        "ratingValue": rating,
        "bestRating": "5"
      } : undefined,
      "hasOfferCatalog": services ? {
        "@type": "OfferCatalog",
        "name": "Beauty Services",
        "itemListElement": services.map((service, index) => ({
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": service
          }
        }))
      } : undefined
    }}
  />
);

export const MasterSEO = ({
  masterName,
  specialty,
  bio,
  image,
  rating
}: {
  masterName: string;
  specialty?: string;
  bio?: string;
  image?: string;
  rating?: number;
}) => (
  <SEO
    title={`${masterName}${specialty ? ` - ${specialty}` : ''}`}
    description={bio || `Запись к мастеру ${masterName}. Профессиональные услуги красоты.`}
    image={image}
    type="profile"
    structuredData={{
      "@context": "https://schema.org",
      "@type": "Person",
      "name": masterName,
      "description": bio,
      "image": image,
      "jobTitle": specialty,
      "aggregateRating": rating ? {
        "@type": "AggregateRating",
        "ratingValue": rating,
        "bestRating": "5"
      } : undefined
    }}
  />
);

export const BlogPostSEO = ({
  title,
  description,
  image,
  author,
  publishedTime,
  modifiedTime,
  tags
}: {
  title: string;
  description: string;
  image?: string;
  author: string;
  publishedTime: string;
  modifiedTime?: string;
  tags?: string[];
}) => (
  <SEO
    title={title}
    description={description}
    image={image}
    type="article"
    author={author}
    publishedTime={publishedTime}
    modifiedTime={modifiedTime}
    keywords={tags?.join(', ')}
    structuredData={{
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "image": image,
      "author": {
        "@type": "Person",
        "name": author
      },
      "datePublished": publishedTime,
      "dateModified": modifiedTime || publishedTime,
      "keywords": tags?.join(', ')
    }}
  />
);
