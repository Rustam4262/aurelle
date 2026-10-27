import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import i18n from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import { languages, splitLanguage, localizedPath, type PublicDocument } from "@shared/public-seo";
import { PublicSeoContent, DiscoveryLinks } from "@shared/PublicSeoContent";
import { canonicalUrl, SITE_ORIGIN } from "@shared/seo-policy";

function initialDocument(): PublicDocument | undefined {
  const element = document.getElementById("public-document");
  try {
    return element ? JSON.parse(element.textContent || "") : undefined;
  } catch {
    return undefined;
  }
}
const initial = initialDocument();
const initialUrl = window.location.pathname + window.location.search;
export function usePublicDocument() {
  useLocation();
  useSearch();
  const path = window.location.pathname + window.location.search;
  return useQuery<PublicDocument | null>({
    queryKey: ["public-document", path],
    enabled: splitLanguage(window.location.pathname).localized,
    initialData: path === initialUrl ? initial : undefined,
    staleTime: 30_000,
    queryFn: async () => {
      const response = await fetch(`/api/public-document?path=${encodeURIComponent(path)}`);
      const body = await response.json();
      if (body.language) return body;
      if (response.status === 404) return null;
      throw new Error("Public page unavailable");
    },
  });
}
export function PublicMetadata() {
  const { data } = usePublicDocument();
  const [location] = useLocation();
  useEffect(() => {
    const info = splitLanguage(window.location.pathname);
    if (info.localized) {
      void i18n.changeLanguage(info.language);
      localStorage.setItem("language", info.language);
    }
  }, [location, data?.language]);
  if (!data) return null;
  const canonical = canonicalUrl(window.location.href);
  const title = `${data.title} | AURELLE`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={data.description} />
      <meta name="robots" content={data.noIndex ? "noindex, follow" : "index, follow"} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={data.description} />
      <meta property="og:url" content={canonical} />
      <meta
        property="og:locale"
        content={{ ru: "ru_RU", uz: "uz_UZ", en: "en_US" }[data.language]}
      />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={data.description} />
      {data.status === 200 &&
        !data.noIndex &&
        languages.map((lang) => (
          <link
            key={lang}
            rel="alternate"
            hrefLang={lang}
            href={SITE_ORIGIN + localizedPath(data.path, lang)}
          />
        ))}
      {data.status === 200 && !data.noIndex && (
        <link
          rel="alternate"
          hrefLang="x-default"
          href={SITE_ORIGIN + localizedPath(data.path, "ru")}
        />
      )}
      {data.schema && (
        <script type="application/ld+json">
          {JSON.stringify(data.schema).replace(/</g, "\\u003c")}
        </script>
      )}
    </Helmet>
  );
}
export function PublicDiscoveryLinks() {
  const { data } = usePublicDocument();
  return data ? <DiscoveryLinks data={data} /> : null;
}
export function PublicLandingPage() {
  const { data, isError, refetch } = usePublicDocument();
  if (isError)
    return (
      <div role="alert" className="p-8">
        <p>
          {i18n.language === "en"
            ? "Unable to load this page"
            : i18n.language === "uz"
              ? "Sahifani yuklab bo‘lmadi"
              : "Не удалось загрузить страницу"}
        </p>
        <button onClick={() => refetch()}>↻</button>
      </div>
    );
  return data ? (
    <PublicSeoContent data={data} />
  ) : data === null ? (
    <NotFound />
  ) : (
    <div className="p-8" role="status">
      …
    </div>
  );
}
export function InitialPublicContent() {
  return initial && window.location.pathname + window.location.search === initialUrl ? (
    <PublicSeoContent data={initial} />
  ) : (
    <div className="p-8" role="status">
      …
    </div>
  );
}
