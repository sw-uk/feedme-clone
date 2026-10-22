import { expect, test } from "vitest";

import {
  MAX_PREFILL_URL_LENGTH,
  composeMessage,
  planHandoff,
} from "./llm-handoff";

test("프롬프트가 있으면 프롬프트, 빈 줄, 본문 순서로 합친다", () => {
  expect(composeMessage("요약해줘", "# 제목\n본문")).toBe(
    "요약해줘\n\n# 제목\n본문"
  );
});

test("프롬프트가 없거나 공백뿐이면 본문만 전달한다", () => {
  expect(composeMessage("", "본문")).toBe("본문");
  expect(composeMessage("   ", "본문")).toBe("본문");
});

test("짧은 텍스트는 새 대화에 미리 채우는 주소를 만든다", () => {
  const plan = planHandoff("claude", "요약해줘\n\n안녕");

  expect(plan.kind).toBe("prefill");
  expect(plan.url).toBe(
    `https://claude.ai/new?q=${encodeURIComponent("요약해줘\n\n안녕")}`
  );
});

test("ChatGPT도 같은 방식으로 q 파라미터에 채운다", () => {
  const plan = planHandoff("chatgpt", "hello");

  expect(plan).toMatchObject({
    kind: "prefill",
    url: "https://chatgpt.com/?q=hello",
  });
});

test("주소가 길이 제한을 넘으면 새 대화만 열고 클립보드로 넘긴다", () => {
  const long = "가".repeat(MAX_PREFILL_URL_LENGTH);
  const claude = planHandoff("claude", long);
  const chatgpt = planHandoff("chatgpt", long);

  expect(claude).toEqual({ kind: "clipboard", url: "https://claude.ai/new" });
  expect(chatgpt).toEqual({ kind: "clipboard", url: "https://chatgpt.com/" });
});
