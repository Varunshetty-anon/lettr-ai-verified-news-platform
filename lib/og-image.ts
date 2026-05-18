/**
 * Fetches the Open Graph image from a URL by parsing HTML meta tags.
 * This is used to provide images for posts that don't have inline media.
 */
export async function fetchOGImage(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LettrBot/1.0 (OG Image Fetcher)',
        'Accept': 'text/html',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    // Only read the first 50KB to find meta tags (don't download entire page)
    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = '';
    const decoder = new TextDecoder();
    let bytesRead = 0;
    const MAX_BYTES = 50000;

    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
      // Stop early if we've passed the head section
      if (html.includes('</head>')) break;
    }

    reader.cancel();

    // Try og:image first (most reliable)
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch?.[1]) {
      const imgUrl = ogMatch[1];
      // Validate it's a real URL
      if (imgUrl.startsWith('http') && /\.(jpg|jpeg|png|gif|webp|svg)/i.test(imgUrl)) {
        return imgUrl;
      }
      // Some og:image URLs don't have extensions but are still valid
      if (imgUrl.startsWith('http')) {
        return imgUrl;
      }
    }

    // Try twitter:image
    const twitterMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
    if (twitterMatch?.[1] && twitterMatch[1].startsWith('http')) {
      return twitterMatch[1];
    }

    return null;
  } catch (error) {
    // Silently fail — OG image fetching is best-effort
    return null;
  }
}
