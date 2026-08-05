import { SERVICE_LINES } from "@/content/services";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * JSON-LD, NFR-11: Organization, Service, Article and BreadcrumbList.
 *
 * Emitted as a script tag rather than through a helper library, because the
 * whole of it is four object literals and a serialiser — a dependency here
 * would be more code to audit than the thing it replaces.
 *
 * `JSON.stringify` output goes into a script of type `application/ld+json`,
 * which browsers do not execute. The only injection surface is a `</script>`
 * sequence appearing inside the data, so that is escaped rather than trusted:
 * every string here is authored in-repo today, and the escaping is what keeps
 * that from being a load-bearing assumption if it ever stops being true.
 */

function Ld({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/<\/(script)/gi, "<\\/$1");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/** The studio itself. Sits in the root layout, so it is on every page. */
export function OrganizationSchema() {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        description:
          "A sonic identity studio. We build the sound of a brand as a system: mnemonics, product sound, soundscapes and the guidelines that keep them coherent.",
        foundingDate: "2019",
        address: {
          "@type": "PostalAddress",
          addressLocality: "London",
          addressCountry: "GB",
        },
        knowsAbout: SERVICE_LINES.map((line) => line.name),
      }}
    />
  );
}

/** The six service lines, on /services. */
export function ServiceSchema() {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Sonic identity services",
        itemListElement: SERVICE_LINES.map((line, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Service",
            name: line.name,
            description: line.description,
            provider: { "@type": "Organization", name: SITE_NAME },
            areaServed: "Worldwide",
          },
        })),
      }}
    />
  );
}

/** A journal entry. */
export function ArticleSchema({
  title,
  description,
  datePublished,
  path,
}: {
  title: string;
  description: string;
  datePublished: string;
  path: string;
}) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        datePublished,
        mainEntityOfPage: absoluteUrl(path),
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME },
      }}
    />
  );
}

/**
 * Where a page sits in the site, for the trail Google shows under a result.
 *
 * `trail` is ordered from the site root outward and excludes the home page,
 * which is added here so no caller has to remember it.
 */
export function BreadcrumbSchema({
  trail,
}: {
  trail: readonly { name: string; path: string }[];
}) {
  const items = [{ name: "Home", path: "/" }, ...trail];

  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      }}
    />
  );
}
