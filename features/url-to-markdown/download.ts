const FALLBACK_NAME = "page";
const MAX_NAME_LENGTH = 80;

/** 페이지 제목에서 `.md` 파일명을 만든다. */
export function markdownFilename(title: string): string {
  const name = title
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, MAX_NAME_LENGTH);
  return `${name || FALLBACK_NAME}.md`;
}
