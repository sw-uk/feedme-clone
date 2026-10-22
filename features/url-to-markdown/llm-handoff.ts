export const PROMPT_PRESETS = [
  "요약해줘",
  "한국어로 번역해줘",
  "쉽게 설명해줘",
] as const;

export type LlmService = "chatgpt" | "claude";

export const LLM_SERVICES: Record<
  LlmService,
  { label: string; newChatUrl: string; prefillUrl: (text: string) => string }
> = {
  chatgpt: {
    label: "ChatGPT",
    newChatUrl: "https://chatgpt.com/",
    prefillUrl: (text) => `https://chatgpt.com/?q=${encodeURIComponent(text)}`,
  },
  claude: {
    label: "Claude",
    newChatUrl: "https://claude.ai/new",
    prefillUrl: (text) => `https://claude.ai/new?q=${encodeURIComponent(text)}`,
  },
};

/** 미리 채우기 주소의 최대 길이. 서버와 브라우저의 주소 길이 제한 안쪽으로 보수적으로 잡는다. */
export const MAX_PREFILL_URL_LENGTH = 6000;

/** 프롬프트가 있으면 `프롬프트 + 빈 줄 + 본문`, 없으면 본문만. */
export function composeMessage(prompt: string, markdown: string): string {
  const trimmed = prompt.trim();
  return trimmed ? `${trimmed}\n\n${markdown}` : markdown;
}

export type HandoffPlan =
  | { kind: "prefill"; url: string }
  | { kind: "clipboard"; url: string };

/** 주소에 담을 수 있으면 미리 채우고, 넘치면 새 대화만 열고 클립보드로 넘긴다. */
export function planHandoff(service: LlmService, text: string): HandoffPlan {
  const { prefillUrl, newChatUrl } = LLM_SERVICES[service];
  const url = prefillUrl(text);
  return url.length <= MAX_PREFILL_URL_LENGTH
    ? { kind: "prefill", url }
    : { kind: "clipboard", url: newChatUrl };
}
