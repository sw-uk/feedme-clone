import { ThemeToggle } from "@/components/theme-toggle";
import { Converter } from "@/features/url-to-markdown";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-lg font-semibold tracking-tight">
          URL → Markdown{" "}
          <span className="font-normal text-muted-foreground">
            · LLM에 바로 넘기기
          </span>
        </h1>
        <ThemeToggle />
      </header>
      <Converter />
    </main>
  );
}
