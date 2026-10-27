import React from "react";
import { renderToString } from "react-dom/server";
import { PublicSeoContent } from "@shared/PublicSeoContent";
import { languages, localizedPath } from "@shared/public-seo";
import { canonicalUrl, SITE_ORIGIN, xmlEscape } from "@shared/seo-policy";
import { getPublicDocument } from "./public-catalog";
import { resolveDocumentPolicy } from "./document-policy";

export function safeJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
export async function renderPublicDocument(template: string, input: string) {
  const data = await getPublicDocument(input);
  if (!data) return { html: template, ...(await resolveDocumentPolicy(input)) };
  const canonical = canonicalUrl(input);
  const meta = (name: string, value: string, property = false) =>
    `<meta data-rh="true" ${property ? "property" : "name"}="${name}" content="${xmlEscape(value)}"/>`;
  const alternates =
    data.status === 200 && !data.noIndex
      ? [
          ...languages.map(
            (lang) =>
              `<link data-rh="true" rel="alternate" hreflang="${lang}" href="${SITE_ORIGIN}${localizedPath(data.path, lang)}"/>`,
          ),
          `<link data-rh="true" rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${localizedPath(data.path, "ru")}"/>`,
        ].join("")
      : "";
  const title = `${data.title} | AURELLE`;
  const head = `<title>${xmlEscape(title)}</title>${meta("description", data.description)}${meta("robots", data.noIndex ? "noindex, follow" : "index, follow")}${meta("og:title", title, true)}${meta("og:description", data.description, true)}${meta("og:url", canonical, true)}${meta("og:locale", { ru: "ru_RU", uz: "uz_UZ", en: "en_US" }[data.language], true)}${meta("twitter:title", title)}${meta("twitter:description", data.description)}<link data-rh="true" rel="canonical" href="${xmlEscape(canonical)}"/>${alternates}${data.schema ? `<script data-rh="true" type="application/ld+json">${safeJson(data.schema)}</script>` : ""}`;
  const html = template
    .replace(/<html\b[^>]*>/, `<html lang="${data.language}" class="scroll-smooth">`)
    .replace(/<title>[\s\S]*?<\/title>/g, "")
    .replace(
      /<meta\b[^>]*(?:name="(?:description|keywords|robots|twitter:title|twitter:description)"|property="(?:og:title|og:description|og:url|og:locale)")[^>]*>/g,
      "",
    )
    .replace("</head>", () => `${head}</head>`)
    .replace(
      '<div id="root"></div>',
      () =>
        `<div id="root">${renderToString(<PublicSeoContent data={data} />)}</div><script id="public-document" type="application/json">${safeJson(data)}</script>`,
    );
  return { html, status: data.status, noIndex: data.noIndex };
}
