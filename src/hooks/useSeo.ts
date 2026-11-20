import { useEffect } from 'react';
import { getRouteSeo } from '../seo/seoConfig';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSeo(view: string, param?: string) {
  useEffect(() => {
    const seo = getRouteSeo(view, param);
    document.title = seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertMeta(
      'name',
      'robots',
      seo.noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    upsertMeta('property', 'og:type', seo.ogType);
    upsertMeta('property', 'og:site_name', 'Nexus Finance LTD');
    upsertMeta('property', 'og:locale', 'en_NG');
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', seo.canonical);
    upsertMeta('property', 'og:image', seo.ogImage);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', seo.ogImage);

    upsertLink('canonical', seo.canonical);

    let script = document.getElementById('nexus-seo-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'nexus-seo-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(seo.jsonLd);
  }, [view, param]);
}
