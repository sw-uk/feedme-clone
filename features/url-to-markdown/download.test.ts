import { expect, test } from "vitest";

import { markdownFilename } from "./download";

test("제목의 공백은 하이픈으로, 파일명에 못 쓰는 문자는 지워서 만든다", () => {
  expect(markdownFilename('REST에서 tRPC로: 14개 서비스, "6주"?')).toBe(
    "REST에서-tRPC로-14개-서비스,-6주.md"
  );
});

test("백슬래시도 파일명에서 지운다", () => {
  expect(markdownFilename("A\\B 정리")).toBe("AB-정리.md");
});

test("제목이 비어 있으면 기본 이름을 쓴다", () => {
  expect(markdownFilename("")).toBe("page.md");
  expect(markdownFilename(' / : * ')).toBe("page.md");
});
