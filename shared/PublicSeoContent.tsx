import React from "react";
import { copy, languages, localizedPath, cityFor, type PublicDocument } from "./public-seo";
const price = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export function DiscoveryLinks({ data }: { data: PublicDocument }) {
  if (!data.links.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 py-10" aria-label={copy[data.language].browse}>
      <h2 className="mb-5 text-2xl font-serif">{copy[data.language].browse}</h2>
      <ul className="flex flex-wrap gap-3">
        {data.links.map((link) => (
          <li key={link.path}>
            <a
              className="inline-block rounded-full border border-border bg-card px-4 py-2 text-sm hover:text-primary"
              href={localizedPath(link.path, data.language)}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PublicSeoContent({ data }: { data: PublicDocument }) {
  const t = copy[data.language];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <a className="font-serif text-2xl" href={`/${data.language}`}>
            AURELLE
          </a>
          <div className="flex gap-4">
            {languages.map((lang) => (
              <a
                key={lang}
                href={localizedPath(data.path, lang)}
                hrefLang={lang}
                lang={lang}
                aria-current={lang === data.language ? "page" : undefined}
                className={lang === data.language ? "font-bold text-primary" : ""}
              >
                {lang.toUpperCase()}
              </a>
            ))}
          </div>
          <a href="/auth">{t.login}</a>
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-6 py-10">
        <a className="text-sm text-primary" href={`/${data.language}/search`}>
          {t.back}
        </a>
        <h1 className="mt-5 max-w-4xl font-serif text-3xl md:text-5xl">{data.title}</h1>
        <p className="my-6 max-w-3xl text-muted-foreground leading-relaxed">{data.description}</p>
        {!data.listings.length && data.status === 200 && <p>{t.empty}</p>}
        <div className="grid gap-6 md:grid-cols-2">
          {data.listings.map((item) => (
            <article
              key={item.path}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              {item.photo && (
                <img
                  className="h-52 w-full object-cover"
                  src={item.photo}
                  alt={item.name}
                  loading="lazy"
                />
              )}
              <div className="p-6">
                <h2 className="font-serif text-2xl">
                  <a href={localizedPath(item.path, data.language)}>{item.name}</a>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {cityFor(item.city)?.[data.language] || item.city} · {item.address}
                </p>
                {item.description && <p className="mt-4 leading-relaxed">{item.description}</p>}
                {item.phone && (
                  <p className="mt-3">
                    <a href={`tel:${item.phone}`}>{item.phone}</a>
                  </p>
                )}
                {!!item.services.length && <h3 className="mt-6 font-semibold">{t.services}</h3>}
                <ul className="divide-y divide-border">
                  {item.services.map((service) => (
                    <li key={service.id} className="py-4">
                      <p className="font-medium">{service.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {price(service.priceMin)}
                        {service.priceMax && service.priceMax !== service.priceMin
                          ? ` – ${price(service.priceMax)}`
                          : ""}{" "}
                        UZS · {service.duration} {t.minutes}
                      </p>
                      <a
                        className="mt-2 inline-block text-sm font-medium text-primary"
                        href={`${localizedPath(item.path, data.language)}?serviceId=${encodeURIComponent(service.id)}#services`}
                      >
                        {t.book}
                      </a>
                    </li>
                  ))}
                </ul>
                <a
                  className="mt-5 inline-block rounded-lg bg-primary px-5 py-3 text-primary-foreground"
                  href={localizedPath(item.path, data.language)}
                >
                  {t.view}
                </a>
              </div>
            </article>
          ))}
        </div>
        {!!data.hours?.length && (
          <section className="mt-10">
            <h2 className="mb-4 text-2xl font-serif">{t.hours}</h2>
            <ul>
              {data.hours.map((h) => (
                <li key={h.dayOfWeek}>
                  {t.days[h.dayOfWeek]}: {h.isClosed ? t.closed : `${h.openTime}–${h.closeTime}`}
                </li>
              ))}
            </ul>
          </section>
        )}
        {!!data.team?.length && (
          <section className="mt-10">
            <h2 className="text-2xl font-serif">{t.team}</h2>
            <ul>
              {data.team.map((m, i) => (
                <li key={i}>{m.name}</li>
              ))}
            </ul>
          </section>
        )}
        {!!data.reviews?.length && (
          <section className="mt-10">
            <h2 className="text-2xl font-serif">{t.reviews}</h2>
            {data.reviews.map((r, i) => (
              <blockquote className="mt-4 rounded-lg border border-border p-4" key={i}>
                <p>{r.rating}/5</p>
                <p>{r.comment}</p>
              </blockquote>
            ))}
          </section>
        )}
      </main>
      <DiscoveryLinks data={data} />
    </div>
  );
}
