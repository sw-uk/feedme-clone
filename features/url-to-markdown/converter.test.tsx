import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));

import { Converter } from "./converter";
import { MAX_PREFILL_URL_LENGTH } from "./llm-handoff";

const ARTICLE_URL = "https://engineering.example.com/posts/trpc";

const done = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  title: "REST에서 tRPC로 옮기며 배운 것",
  author: "김지현",
  site: "Example Engineering",
  markdown: "## 왜 옮겼나\n\n타입을 **두 번** 선언하고 있었습니다.",
  ...overrides,
});

function mockConvert(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function convert(url = ARTICLE_URL) {
  fireEvent.change(screen.getByLabelText("페이지 주소"), {
    target: { value: url },
  });
  fireEvent.click(screen.getByRole("button", { name: "변환하기" }));
}

async function showResult(overrides: Record<string, unknown> = {}) {
  mockConvert(done(overrides));
  render(<Converter />);
  convert();
  await screen.findByRole("heading", { name: /REST에서 tRPC로/ });
}

const writeText = vi.fn(async () => undefined);
const open = vi.fn();

beforeEach(() => {
  vi.stubGlobal("open", open);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("처음에는 안내만 보이고 지우기(X)는 보이지 않는다", () => {
  render(<Converter />);

  expect(screen.getByText("주소를 붙여넣고 변환을 누르세요")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "지우기" })).not.toBeInTheDocument();
});

test("입력란에 글자가 있을 때만 X가 보이고, 누르면 입력과 결과가 모두 사라진다", async () => {
  await showResult();
  expect(screen.getByRole("button", { name: "지우기" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "지우기" }));

  expect(screen.getByLabelText("페이지 주소")).toHaveValue("");
  expect(screen.queryByRole("heading", { name: /REST에서 tRPC로/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "지우기" })).not.toBeInTheDocument();
});

test("변환에 성공하면 제목, 저자, 렌더링된 Markdown을 보여준다", async () => {
  const fetchMock = mockConvert(done());
  render(<Converter />);

  convert();

  expect(
    await screen.findByRole("heading", { level: 2, name: "REST에서 tRPC로 옮기며 배운 것" })
  ).toBeInTheDocument();
  expect(screen.getByText("김지현")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "왜 옮겼나" })).toBeInTheDocument();
  expect(screen.getByText("두 번").tagName).toBe("STRONG");
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/convert",
    expect.objectContaining({ body: JSON.stringify({ url: ARTICLE_URL }) })
  );
});

test("저자를 모르면 저자 줄을 생략한다", async () => {
  await showResult({ author: "" });

  expect(screen.queryByText(/저자/)).not.toBeInTheDocument();
});

test("변환 중에는 진행 상태를 보이고 버튼을 막는다", () => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  render(<Converter />);

  convert();

  expect(screen.getByRole("button", { name: "변환 중…" })).toBeDisabled();
  expect(screen.getByLabelText("변환 중")).toHaveAttribute("aria-busy", "true");
});

test("http·https가 아닌 주소는 서버를 부르지 않고 입력 오류로 안내한다", async () => {
  const fetchMock = mockConvert(done());
  render(<Converter />);

  convert("example.com/post");

  expect(await screen.findByText("주소 형식이 올바르지 않습니다")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("가져오기 실패는 상태 코드와 함께 알리고 다시 시도하면 변환된다", async () => {
  const fetchMock = mockConvert({ ok: false, reason: "fetch-failed", status: 404 }, 502);
  render(<Converter />);
  convert();

  expect(await screen.findByText("페이지를 가져오지 못했습니다")).toBeInTheDocument();
  expect(screen.getByText(/404/)).toBeInTheDocument();

  fetchMock.mockResolvedValueOnce(Response.json(done()));
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

  expect(await screen.findByRole("heading", { name: /REST에서 tRPC로/ })).toBeInTheDocument();
});

test("본문을 못 찾으면 이유를 알리고, 서버에 닿지 못해도 오류로 안내한다", async () => {
  mockConvert({ ok: false, reason: "no-content" }, 422);
  render(<Converter />);
  convert();
  expect(await screen.findByText("본문을 찾지 못했습니다")).toBeInTheDocument();

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("offline");
    })
  );
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(await screen.findByText("페이지를 가져오지 못했습니다")).toBeInTheDocument();
});

test("복사하기는 프롬프트 없이 본문 Markdown만 클립보드에 넣고 알린다", async () => {
  await showResult();
  fireEvent.click(screen.getByRole("button", { name: "요약해줘" }));

  fireEvent.click(screen.getByRole("button", { name: "복사하기" }));

  await waitFor(() => expect(writeText).toHaveBeenCalledWith(done().markdown));
  expect(toast.success).toHaveBeenCalledWith("Markdown 본문을 클립보드에 복사했습니다");
});

test(".md 다운로드는 제목으로 만든 파일명으로 저장한다", async () => {
  await showResult();
  const createObjectURL = vi.fn((blob: Blob) => {
    void blob;
    return "blob:md";
  });
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
  const downloads: string[] = [];
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });

  fireEvent.click(screen.getByRole("button", { name: ".md 다운로드" }));

  expect(downloads).toEqual(["REST에서-tRPC로-옮기며-배운-것.md"]);
  expect(await createObjectURL.mock.calls[0][0].text()).toBe(done().markdown);
  click.mockRestore();
});

test("프리셋을 고르고 열면 프롬프트와 본문을 합쳐 새 대화에 미리 채운다", async () => {
  await showResult();

  fireEvent.click(screen.getByRole("button", { name: "요약해줘" }));
  fireEvent.click(screen.getByRole("button", { name: /Claude로 열기/ }));

  const expected = `https://claude.ai/new?q=${encodeURIComponent(`요약해줘\n\n${done().markdown}`)}`;
  expect(open).toHaveBeenCalledWith(expected, "_blank", "noopener,noreferrer");
  expect(writeText).not.toHaveBeenCalled();
});

test("프롬프트를 고르지 않으면 본문만 전달하고, 같은 칩을 다시 누르면 해제된다", async () => {
  await showResult();
  const chip = screen.getByRole("button", { name: "쉽게 설명해줘" });

  fireEvent.click(chip);
  fireEvent.click(chip);
  fireEvent.click(screen.getByRole("button", { name: /ChatGPT로 열기/ }));

  expect(open).toHaveBeenCalledWith(
    `https://chatgpt.com/?q=${encodeURIComponent(done().markdown)}`,
    "_blank",
    "noopener,noreferrer"
  );
});

test("직접 입력을 고르면 입력란이 나타나고 거기에 쓴 문장이 앞에 붙는다", async () => {
  await showResult();
  expect(screen.queryByLabelText("직접 입력한 프롬프트")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "직접 입력" }));
  fireEvent.change(screen.getByLabelText("직접 입력한 프롬프트"), {
    target: { value: "핵심만 세 줄로" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Claude로 열기/ }));

  expect(open.mock.calls[0][0]).toContain(
    encodeURIComponent(`핵심만 세 줄로\n\n${done().markdown}`)
  );
});

test("본문이 길면 전체 텍스트를 클립보드에 복사하고 새 대화만 열며 붙여넣기를 안내한다", async () => {
  const markdown = "가".repeat(MAX_PREFILL_URL_LENGTH);
  await showResult({ markdown });
  fireEvent.click(screen.getByRole("button", { name: "요약해줘" }));

  expect(screen.getByText(/URL에 담을 수 없습니다/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Claude로 열기/ }));

  await waitFor(() => expect(writeText).toHaveBeenCalledWith(`요약해줘\n\n${markdown}`));
  expect(open).toHaveBeenCalledWith("https://claude.ai/new", "_blank", "noopener,noreferrer");
  const notice = await screen.findByRole("status");
  expect(within(notice).getByText("전체 텍스트를 복사했습니다")).toBeInTheDocument();
});
