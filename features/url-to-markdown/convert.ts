import { Defuddle } from "defuddle/node";

import { parseHttpUrl } from "./url";

export type ConvertResult =
  | { ok: true; title: string; author: string; site: string; markdown: string }
  | { ok: false; reason: "invalid-url" }
  | { ok: false; reason: "fetch-failed"; status?: number }
  | { ok: false; reason: "no-content" };

const FETCH_TIMEOUT_MS = 15_000;

/** 외부 페이지를 서버에서 가져와 defuddle로 본문 Markdown을 뽑는다. */
export async function convertUrl(
  input: string,
  fetchPage: typeof fetch = fetch
): Promise<ConvertResult> {
  const url = parseHttpUrl(input);
  if (!url) return { ok: false, reason: "invalid-url" };

  let response: Response;
  try {
    response = await fetchPage(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; url-to-markdown)",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
  if (!response.ok) {
    return { ok: false, reason: "fetch-failed", status: response.status };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !/html/i.test(contentType)) {
    return { ok: false, reason: "no-content" };
  }

  try {
    const html = await response.text();
    const page = await Defuddle(html, url.href, { markdown: true });
    const markdown = page.content?.trim() ?? "";
    if (!markdown) return { ok: false, reason: "no-content" };

    return {
      ok: true,
      title: page.title?.trim() ?? "",
      author: page.author?.trim() ?? "",
      site: page.site?.trim() ?? "",
      markdown,
    };
  } catch {
    return { ok: false, reason: "no-content" };
  }
}
