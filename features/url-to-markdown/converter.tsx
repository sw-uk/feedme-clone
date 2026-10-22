"use client";

import {
  ArrowUpRightIcon,
  ClipboardPasteIcon,
  CopyIcon,
  DownloadIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";

import type { ConvertResult } from "./convert";
import { markdownFilename } from "./download";
import {
  LLM_SERVICES,
  PROMPT_PRESETS,
  composeMessage,
  planHandoff,
  type LlmService,
} from "./llm-handoff";
import { MarkdownView } from "./markdown-view";
import { parseHttpUrl } from "./url";

type Page = Extract<ConvertResult, { ok: true }>;
type Failure = Extract<ConvertResult, { ok: false }>;

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; failure: Failure }
  | { kind: "done"; page: Page };

const CUSTOM = "custom";

export function Converter() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [prompt, setPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [pasteNotice, setPasteNotice] = useState<LlmService | null>(null);
  const latestRequest = useRef(0);

  const page = status.kind === "done" ? status.page : null;
  const loading = status.kind === "loading";
  const activePrompt = prompt === CUSTOM ? customPrompt : (prompt ?? "");
  const message = page ? composeMessage(activePrompt, page.markdown) : "";
  const willPrefill = (["chatgpt", "claude"] as const).every(
    (service) => planHandoff(service, message).kind === "prefill"
  );

  function resetExport() {
    setPrompt(null);
    setCustomPrompt("");
    setPasteNotice(null);
  }

  async function convert() {
    const request = ++latestRequest.current;
    resetExport();

    if (!parseHttpUrl(url)) {
      setStatus({
        kind: "error",
        failure: { ok: false, reason: "invalid-url" },
      });
      return;
    }

    setStatus({ kind: "loading" });
    let result: ConvertResult;
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      result = await response.json();
    } catch {
      result = { ok: false, reason: "fetch-failed" };
    }
    if (request !== latestRequest.current) return;

    setStatus(
      result.ok
        ? { kind: "done", page: result }
        : { kind: "error", failure: result }
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void convert();
  }

  function clear() {
    latestRequest.current++;
    setUrl("");
    setStatus({ kind: "idle" });
    resetExport();
  }

  function selectPrompt(value: string, pressed: boolean) {
    setPrompt(pressed ? value : null);
    setPasteNotice(null);
  }

  async function copyMarkdown() {
    if (!page) return;
    try {
      await navigator.clipboard.writeText(page.markdown);
      toast.success("Markdown 본문을 클립보드에 복사했습니다");
    } catch {
      toast.error("클립보드에 복사하지 못했습니다");
    }
  }

  function downloadMarkdown() {
    if (!page) return;
    const filename = markdownFilename(page.title);
    const href = URL.createObjectURL(
      new Blob([page.markdown], { type: "text/markdown;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(href);
    toast.success(`${filename} 파일로 저장했습니다`);
  }

  async function openIn(service: LlmService) {
    const { label } = LLM_SERVICES[service];
    const plan = planHandoff(service, message);

    if (plan.kind === "prefill") {
      window.open(plan.url, "_blank", "noopener,noreferrer");
      setPasteNotice(null);
      toast.success(`${label} 새 대화창을 미리 채워서 열었습니다`);
      return;
    }

    // 사용자 클릭 직후에 복사와 창 열기를 함께 시작해야 팝업이 막히지 않는다.
    const copied = navigator.clipboard.writeText(message);
    window.open(plan.url, "_blank", "noopener,noreferrer");
    try {
      await copied;
      setPasteNotice(service);
    } catch {
      toast.error("클립보드에 복사하지 못했습니다");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-[1_1_100%] sm:flex-1">
          <Input
            aria-label="페이지 주소"
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="https://… 변환할 페이지 주소를 붙여넣으세요"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-10 pr-10"
          />
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="지우기"
              title="지우기"
              onClick={clear}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full text-muted-foreground"
            >
              <XIcon />
            </Button>
          )}
        </div>
        <Button type="submit" size="lg" disabled={loading} className="flex-1 sm:flex-none">
          {loading ? "변환 중…" : "변환하기"}
        </Button>
      </form>

      {status.kind === "idle" && (
        <Card>
          <CardContent className="py-4 text-center text-sm leading-relaxed text-muted-foreground">
            <strong className="mb-1 block text-base font-medium text-foreground">
              주소를 붙여넣고 변환을 누르세요
            </strong>
            광고와 메뉴를 걷어내고 본문만 Markdown으로 뽑아 드립니다.
            <br />
            결과는 복사하거나 .md 파일로 저장하고, ChatGPT·Claude로 바로 넘길 수
            있습니다.
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card aria-busy="true" aria-label="변환 중">
          <CardContent className="flex flex-col gap-2.5">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="mt-2 h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[94%]" />
            <Skeleton className="h-3.5 w-[98%]" />
            <Skeleton className="h-3.5 w-3/5" />
          </CardContent>
        </Card>
      )}

      {status.kind === "error" && (
        <FailureAlert failure={status.failure} onRetry={() => void convert()} />
      )}

      {page && (
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-2">
            <h2 className="text-2xl leading-tight font-semibold tracking-tight text-balance break-keep">
              {page.title || "제목 없음"}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
              {page.author && (
                <span>
                  저자 <b className="font-medium text-foreground">{page.author}</b>
                </span>
              )}
              {page.site && <span>{page.site}</span>}
              <Badge variant="secondary">
                본문 약 {page.markdown.length.toLocaleString("ko-KR")}자
              </Badge>
            </div>
          </header>

          <Card>
            <CardContent className="flex flex-col gap-3.5">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void copyMarkdown()}>
                  <CopyIcon />
                  복사하기
                </Button>
                <Button variant="outline" onClick={downloadMarkdown}>
                  <DownloadIcon />
                  .md 다운로드
                </Button>
              </div>

              <hr className="border-border" />

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[0.8125rem] font-medium text-muted-foreground">
                  프롬프트 (선택)
                </span>
                {[...PROMPT_PRESETS, CUSTOM].map((value) => (
                  <Toggle
                    key={value}
                    variant="outline"
                    size="sm"
                    pressed={prompt === value}
                    onPressedChange={(pressed) => selectPrompt(value, pressed)}
                    className="rounded-full px-3 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {value === CUSTOM ? "직접 입력" : value}
                  </Toggle>
                ))}
              </div>

              {prompt === CUSTOM && (
                <Textarea
                  aria-label="직접 입력한 프롬프트"
                  placeholder="예: 핵심만 세 줄로 정리하고, 반론도 하나 덧붙여줘"
                  value={customPrompt}
                  onChange={(event) => setCustomPrompt(event.target.value)}
                  autoFocus
                />
              )}

              <p className="text-[0.8125rem] leading-normal text-muted-foreground">
                {activePrompt.trim() ? (
                  <>
                    앞에 붙는 문장:{" "}
                    <b className="font-medium text-foreground">
                      {activePrompt.trim()}
                    </b>
                  </>
                ) : (
                  "앞에 붙는 문장 없음, 본문만 전달합니다."
                )}
                <br />
                {willPrefill
                  ? "열기를 누르면 새 대화창에 미리 채워서 엽니다."
                  : "본문이 길어 URL에 담을 수 없습니다. 열기를 누르면 전체 텍스트를 복사하고 새 대화창만 엽니다."}
              </p>

              <div className="flex flex-wrap gap-2">
                {(Object.keys(LLM_SERVICES) as LlmService[]).map((service) => (
                  <Button key={service} onClick={() => void openIn(service)}>
                    {LLM_SERVICES[service].label}로 열기
                    <ArrowUpRightIcon />
                  </Button>
                ))}
              </div>

              {pasteNotice && (
                <Alert role="status">
                  <ClipboardPasteIcon />
                  <AlertTitle>전체 텍스트를 복사했습니다</AlertTitle>
                  <AlertDescription>
                    {LLM_SERVICES[pasteNotice].label} 새 대화창을 열었습니다.
                    입력란에 붙여넣어 주세요 (Ctrl+V / ⌘V).
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <MarkdownView source={page.markdown} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function FailureAlert({
  failure,
  onRetry,
}: {
  failure: Failure;
  onRetry: () => void;
}) {
  const copy = {
    "invalid-url": {
      title: "주소 형식이 올바르지 않습니다",
      body: "http:// 또는 https://로 시작하는 주소를 입력해 주세요.",
    },
    "fetch-failed": {
      title: "페이지를 가져오지 못했습니다",
      body:
        failure.reason === "fetch-failed" && failure.status
          ? `서버가 ${failure.status} 응답을 돌려줬습니다. 주소를 확인한 뒤 다시 시도해 주세요.`
          : "페이지에 연결하지 못했습니다. 주소와 네트워크를 확인한 뒤 다시 시도해 주세요.",
    },
    "no-content": {
      title: "본문을 찾지 못했습니다",
      body: "로그인이 필요하거나 스크립트로 화면을 그리는 페이지일 수 있습니다. 다른 주소로 시도해 보세요.",
    },
  }[failure.reason];

  return (
    <Alert variant="destructive">
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>
        {copy.body}
        {failure.reason !== "invalid-url" && (
          <div className="mt-2">
            <Button variant="link" size="xs" className="h-auto p-0 text-foreground" onClick={onRetry}>
              다시 시도
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
