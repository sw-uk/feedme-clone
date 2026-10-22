// @vitest-environment node
import { expect, test, vi } from "vitest";

vi.mock("@/features/url-to-markdown", () => ({
  convertUrl: vi.fn(async (url: string) =>
    url === "https://ok.example/a"
      ? { ok: true, title: "제목", author: "", site: "", markdown: "본문" }
      : url === "https://down.example/a"
        ? { ok: false, reason: "fetch-failed", status: 404 }
        : url === "https://empty.example/a"
          ? { ok: false, reason: "no-content" }
          : { ok: false, reason: "invalid-url" }
  ),
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/convert", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

test("변환에 성공하면 200과 본문을 돌려준다", async () => {
  const res = await post({ url: "https://ok.example/a" });

  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, markdown: "본문" });
});

test.each([
  [{ url: "nope" }, 400, "invalid-url"],
  ["깨진 JSON", 400, "invalid-url"],
  [{ url: "https://down.example/a" }, 502, "fetch-failed"],
  [{ url: "https://empty.example/a" }, 422, "no-content"],
])("실패 %j는 %i와 이유 %s로 응답한다", async (body, status, reason) => {
  const res = await post(body);

  expect(res.status).toBe(status);
  expect(await res.json()).toMatchObject({ ok: false, reason });
});
