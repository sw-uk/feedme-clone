// @vitest-environment node
import { expect, test } from "vitest";

import { convertUrl } from "./convert";

const paragraph =
  "14개 서비스를 REST에서 tRPC로 옮기는 데 6주가 걸렸습니다. 처음 잡았던 일정은 3주였고, 두 배가 된 이유는 코드가 아니라 계약에 있었습니다. 프런트엔드와 백엔드가 같은 타입을 두 번 선언하고 있었고, 스펙을 고치면 클라이언트를 다시 생성해야 했습니다.";

const article = (author = '<meta name="author" content="김지현">') => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>REST에서 tRPC로 옮기며 배운 것 | Example Engineering</title>
${author}
<meta property="og:site_name" content="Example Engineering">
</head><body>
<nav><a href="/">홈</a> <a href="/about">소개</a></nav>
<article><h1>REST에서 tRPC로 옮기며 배운 것</h1>
<p>${paragraph}</p><p>${paragraph}</p><h2>이관 순서</h2><p>${paragraph}</p>
</article><footer>© Example</footer></body></html>`;

const html = (body: string, init: ResponseInit = {}) =>
  new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    ...init,
  });

test("기사 페이지는 제목, 저자, 본문 Markdown으로 변환된다", async () => {
  const result = await convertUrl("https://example.com/post", async () =>
    html(article())
  );

  expect(result).toMatchObject({ ok: true, author: "김지현" });
  if (!result.ok) return;
  expect(result.title).toContain("REST에서 tRPC로");
  expect(result.markdown).toContain("14개 서비스를 REST에서 tRPC로");
  expect(result.markdown).toContain("## 이관 순서");
});

test("저자 정보가 없으면 빈 문자열을 돌려준다", async () => {
  const result = await convertUrl("https://example.com/post", async () =>
    html(article(""))
  );

  expect(result).toMatchObject({ ok: true, author: "" });
});

test.each(["example.com/post", "ftp://example.com/a", "javascript:alert(1)", "   "])(
  "http·https가 아닌 주소 %j는 가져오지 않고 invalid-url로 거절한다",
  async (input) => {
    let called = false;
    const result = await convertUrl(input, async () => {
      called = true;
      return html("");
    });

    expect(result).toEqual({ ok: false, reason: "invalid-url" });
    expect(called).toBe(false);
  }
);

test("서버가 4xx·5xx를 돌려주면 fetch-failed와 상태 코드를 알려준다", async () => {
  const result = await convertUrl("https://example.com/missing", async () =>
    html("not found", { status: 404 })
  );

  expect(result).toEqual({ ok: false, reason: "fetch-failed", status: 404 });
});

test("네트워크 오류는 상태 코드 없는 fetch-failed가 된다", async () => {
  const result = await convertUrl("https://example.com/down", async () => {
    throw new TypeError("fetch failed");
  });

  expect(result).toEqual({ ok: false, reason: "fetch-failed" });
});

test("본문이 비어 있거나 HTML이 아니면 no-content가 된다", async () => {
  const empty = await convertUrl("https://example.com/spa", async () =>
    html("<!doctype html><html><head><title>앱</title></head><body><div id='root'></div></body></html>")
  );
  const pdf = await convertUrl("https://example.com/a.pdf", async () =>
    new Response("%PDF-1.7", { headers: { "content-type": "application/pdf" } })
  );

  expect(empty).toEqual({ ok: false, reason: "no-content" });
  expect(pdf).toEqual({ ok: false, reason: "no-content" });
});
