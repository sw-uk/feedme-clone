import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("홈 화면은 서비스 제목, 주소 입력란, 다크모드 토글을 보여준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: /URL → Markdown/ })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("페이지 주소")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "변환하기" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "다크모드" })).toBeInTheDocument();
});
