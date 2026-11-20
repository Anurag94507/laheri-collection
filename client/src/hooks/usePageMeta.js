import { useEffect } from 'react';

export const SITE_URL = 'https://site-ac9250f405614c4fb38fb9ad6a70c64a.freebuff.page';

const upsert = (selector, create) => {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = create();
    document.head.appendChild(tag);
  }
  return tag;
};

const setMeta = (key, content, attr = 'name') => {
  if (!content) return;
  const tag = upsert(`meta[${attr}="${key}"]`, () => {
    const element = document.createElement('meta');
    element.setAttribute(attr, key);
    return element;
  });
  tag.setAttribute('content', content);
};

/**
 * Keeps the document head consistent for each storefront page: title,
 * description, canonical URL and the Open Graph/Twitter preview.
 */
export default function usePageMeta({ title, description, path = '/', image }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, 'property');
      setMeta('twitter:description', description);
    }
    if (title) {
      setMeta('og:title', title, 'property');
      setMeta('twitter:title', title);
    }

    const url = `${SITE_URL}${path}`;
    const canonical = upsert('link[rel="canonical"]', () => {
      const element = document.createElement('link');
      element.setAttribute('rel', 'canonical');
      return element;
    });
    canonical.setAttribute('href', url);
    setMeta('og:url', url, 'property');

    if (image) {
      const absolute = image.startsWith('http') ? image : `${SITE_URL}${image}`;
      setMeta('og:image', absolute, 'property');
      setMeta('twitter:image', absolute);
    }
  }, [title, description, path, image]);
}
