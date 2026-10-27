import { db } from "../db";
import { matchesAudience, matchesCategory, type CatalogueAudience } from "@shared/service-audience";
import {
  salons,
  services,
  masters,
  soloMasterServices,
  salonWorkingHours,
  masterWorkingHours,
  reviews,
} from "@shared/schema";
import { and, eq, sql, asc, desc } from "drizzle-orm";
import {
  cities,
  categories,
  cityFor,
  copy,
  splitLanguage,
  text,
  type PublicDocument,
  type PublicListing,
  type Language,
} from "@shared/public-seo";
import { SITE_ORIGIN, canonicalUrl, documentPolicy } from "@shared/seo-policy";

// Explicit public projections: never serialize account IDs, email or booking data into HTML.
export async function readPublicCatalog(language: Language) {
  const [salonRows, serviceRows, masterRows, soloServices] = await Promise.all([
    db
      .select({
        id: salons.id,
        name: salons.name,
        description: salons.description,
        address: salons.address,
        city: salons.city,
        phone: salons.phone,
        photos: salons.photos,
      })
      .from(salons)
      .where(
        and(
          eq(salons.isActive, true),
          eq(salons.status, "active"),
          sql`NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ${salons.ownerId} AND u.is_blocked = true)`,
        ),
      )
      .orderBy(asc(salons.id)),
    db
      .select({
        id: services.id,
        parent: services.salonId,
        name: services.name,
        category: services.category,
        audience: services.audience,
        priceMin: services.priceMin,
        priceMax: services.priceMax,
        duration: services.duration,
      })
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.displayOrder), asc(services.id)),
    db
      .select({
        id: masters.id,
        slug: masters.slug,
        name: masters.name,
        description: masters.bio,
        address: masters.address,
        city: masters.city,
        phone: masters.phone,
        photo: masters.photo,
      })
      .from(masters)
      .where(
        and(
          eq(masters.isSoloMaster, true),
          eq(masters.isActive, true),
          eq(masters.status, "active"),
          sql`NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ${masters.userId} AND u.is_blocked = true)`,
        ),
      )
      .orderBy(asc(masters.id)),
    db
      .select({
        id: soloMasterServices.id,
        parent: soloMasterServices.masterId,
        name: soloMasterServices.name,
        category: soloMasterServices.category,
        audience: soloMasterServices.audience,
        priceMin: soloMasterServices.priceMin,
        priceMax: soloMasterServices.priceMax,
        duration: soloMasterServices.duration,
      })
      .from(soloMasterServices)
      .where(eq(soloMasterServices.isActive, true))
      .orderBy(asc(soloMasterServices.displayOrder), asc(soloMasterServices.id)),
  ]);
  const listings: PublicListing[] = [
    ...salonRows.map((s) => ({
      id: s.id,
      path: `/salon/${encodeURIComponent(s.id)}`,
      name: text(s.name, language),
      description: text(s.description, language),
      city: s.city,
      address: s.address,
      phone: s.phone,
      photo: safeImage(s.photos?.[0]),
      services: serviceRows
        .filter((v) => v.parent === s.id)
        .map(({ parent: _parent, ...v }) => ({ ...v, name: text(v.name, language) })),
    })),
    ...masterRows
      .filter((m) => m.slug)
      .map((m) => ({
        id: m.id,
        path: `/master/${encodeURIComponent(m.slug!)}`,
        name: m.name,
        description: text(m.description, language),
        city: m.city || "",
        address: m.address || "",
        phone: m.phone || undefined,
        photo: safeImage(m.photo),
        services: soloServices
          .filter((v) => v.parent === m.id)
          .map(({ parent: _parent, ...v }) => ({ ...v, name: text(v.name, language) })),
      })),
  ];
  return listings;
}
function safeImage(value?: string | null) {
  return value && (/^https?:\/\//.test(value) || /^\/(?!\/)/.test(value)) ? value : undefined;
}
export function landingLinks(listings: PublicListing[], language: Language) {
  const result: PublicDocument["links"] = [];
  for (const city of cities) {
    const available = listings.filter(
      (s) => cityFor(s.city)?.slug === city.slug && s.services.length,
    );
    if (!available.length) continue;
    result.push({
      path: `/${city.slug}/salons`,
      label: `${copy[language].catalog} · ${city[language]}`,
    });
    for (const category of categories) {
      if (available.some((s) => s.services.some((v) => category.values.includes(v.category)))) {
        result.push({
          path: `/${city.slug}/${category.slug}`,
          label: `${category[language]} · ${city[language]}`,
        });
      }
    }
  }
  return result;
}
export async function getPublicDocument(input: string): Promise<PublicDocument | null> {
  const url = new URL(input, SITE_ORIGIN);
  const { language, localized, path } = splitLanguage(url.pathname.replace(/\/$/, "") || "/");
  if (!localized) return null;
  const listingMatch = path.match(/^\/(salon|master)\/([^/]+)$/);
  const landingMatch = path.match(/^\/([^/]+)\/([^/]+)$/);
  const city = cities.find((c) => c.slug === landingMatch?.[1]);
  if (!listingMatch && !city && !["/", "/search", "/salons"].includes(path)) return null;
  const t = copy[language];
  const kind = listingMatch
    ? (listingMatch[1] as "salon" | "master")
    : city
      ? "landing"
      : path === "/"
        ? "home"
        : "search";
  const result: PublicDocument = {
    path,
    language,
    kind,
    status: 200,
    noIndex: false,
    title: kind === "home" ? t.home : t.catalog,
    description: t.intro,
    listings: [],
    links: [],
  };
  try {
    const all = await readPublicCatalog(language);
    result.links = landingLinks(all, language);
    result.listings = all;
    if (listingMatch) {
      const listing = all.find((s) => s.path === path);
      if (!listing)
        return {
          ...result,
          status: 404,
          noIndex: true,
          title: t.unavailable,
          description: "",
          listings: [],
        };
      result.listings = [listing];
      result.title = `${listing.name} · ${cityFor(listing.city)?.[language] || listing.city}`;
      result.description = listing.description || t.description;
      const isSalon = kind === "salon";
      result.hours = isSalon
        ? await db
            .select({
              dayOfWeek: salonWorkingHours.dayOfWeek,
              openTime: salonWorkingHours.openTime,
              closeTime: salonWorkingHours.closeTime,
              isClosed: salonWorkingHours.isClosed,
            })
            .from(salonWorkingHours)
            .where(eq(salonWorkingHours.salonId, listing.id))
            .orderBy(asc(salonWorkingHours.dayOfWeek))
        : await db
            .select({
              dayOfWeek: masterWorkingHours.dayOfWeek,
              openTime: masterWorkingHours.openTime,
              closeTime: masterWorkingHours.closeTime,
              isClosed: masterWorkingHours.isClosed,
            })
            .from(masterWorkingHours)
            .where(eq(masterWorkingHours.masterId, listing.id))
            .orderBy(asc(masterWorkingHours.dayOfWeek));
      result.reviews = await db
        .select({ rating: reviews.rating, comment: reviews.comment })
        .from(reviews)
        .where(
          and(
            isSalon ? eq(reviews.salonId, listing.id) : eq(reviews.masterId, listing.id),
            sql`${reviews.isHidden} IS NOT TRUE`,
          ),
        )
        .orderBy(desc(reviews.createdAt))
        .limit(20);
      if (isSalon)
        result.team = await db
          .select({ name: masters.name })
          .from(masters)
          .where(
            and(
              eq(masters.salonId, listing.id),
              eq(masters.isActive, true),
              sql`NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ${masters.userId} AND u.is_blocked = true)`,
            ),
          );
      result.schema = {
        "@context": "https://schema.org",
        "@type": isSalon ? "BeautySalon" : "Person",
        name: listing.name,
        url: canonicalUrl(url.href),
        description: result.description,
        image: listing.photo,
        telephone: listing.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: listing.address,
          addressLocality: listing.city,
          addressCountry: "UZ",
        },
        ...(isSalon
          ? {
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: t.services,
                itemListElement: listing.services.map((s) => ({
                  ...(s.priceMax && s.priceMax !== s.priceMin
                    ? { "@type": "AggregateOffer", lowPrice: s.priceMin, highPrice: s.priceMax }
                    : { "@type": "Offer", price: s.priceMin }),
                  priceCurrency: "UZS",
                  itemOffered: { "@type": "Service", name: s.name },
                })),
              },
            }
          : {}),
      };
    } else if (city) {
      const category = categories.find((c) => c.slug === landingMatch![2]);
      const allServices = landingMatch![2] === "salons";
      result.listings = all
        .filter((s) => cityFor(s.city)?.slug === city.slug)
        .map((s) => ({
          ...s,
          services: s.services.filter((v) => allServices || category?.values.includes(v.category)),
        }))
        .filter((s) => s.services.length);
      if ((!category && !allServices) || !result.listings.length)
        return {
          ...result,
          status: 404,
          noIndex: true,
          title: t.unavailable,
          description: t.empty,
          listings: [],
        };
      result.title = `${allServices ? t.catalog : category![language]} · ${city[language]}`;
      result.description = t.description;
      result.links = result.links.filter((link) => link.path.startsWith(`/${city.slug}/`));
    } else if (kind === "search" && url.search) {
      // Search remains noindex. Never pretend an unfiltered list matches arbitrary queries.
      result.noIndex = documentPolicy(input).noIndex;
      const cityQuery = url.searchParams.get("city");
      const q = url.searchParams.get("q")?.trim().toLowerCase();
      const category = url.searchParams.get("category");
      const audience = url.searchParams.get("audience") as CatalogueAudience | null;
      const tab = url.searchParams.get("tab");
      if (tab === "masters" || tab === "salons")
        result.listings = result.listings.filter((s) =>
          s.path.startsWith(tab === "masters" ? "/master/" : "/salon/"),
        );
      if (category || (audience && audience !== "all"))
        result.listings = result.listings
          .map((s) => ({
            ...s,
            services: s.services.filter(
              (v) =>
                (!category || matchesCategory(v.category, category)) &&
                (!audience || matchesAudience(v.audience, audience)),
            ),
          }))
          .filter((s) => s.services.length);
      if (cityQuery)
        result.listings = result.listings.filter(
          (s) =>
            (cityFor(s.city)?.slug || s.city.toLowerCase()) ===
            (cityFor(cityQuery)?.slug || cityQuery.toLowerCase()),
        );
      if (q)
        result.listings = result.listings.filter((s) =>
          `${s.name} ${s.address} ${s.services.map((v) => v.name).join(" ")}`
            .toLowerCase()
            .includes(q),
        );
    }
    if (!listingMatch && result.status === 200)
      result.schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "ItemList",
            itemListElement: result.listings.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: s.name,
              url: canonicalUrl(`/${language}${s.path}`),
            })),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "AURELLE",
                item: `${SITE_ORIGIN}/${language}`,
              },
              ...(kind !== "home"
                ? [
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: result.title,
                      item: canonicalUrl(input),
                    },
                  ]
                : []),
            ],
          },
        ],
      };
    return result;
  } catch (error) {
    console.error(
      "Public document unavailable",
      error instanceof Error ? error.message : "database error",
    );
    return { ...result, status: 503, title: t.retry, description: "", listings: [], links: [] };
  }
}
