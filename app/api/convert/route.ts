import { convertUrl } from "@/features/url-to-markdown";

const STATUS = {
  "invalid-url": 400,
  "fetch-failed": 502,
  "no-content": 422,
} as const;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const url =
    typeof body === "object" && body !== null && "url" in body
      ? String(body.url)
      : "";

  const result = await convertUrl(url);
  return Response.json(result, {
    status: result.ok ? 200 : STATUS[result.reason],
  });
}
