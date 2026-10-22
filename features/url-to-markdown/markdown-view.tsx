import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 변환된 Markdown을 읽기 좋게 렌더링한다. 원문 HTML은 렌더링하지 않는다. */
export function MarkdownView({ source }: { source: string }) {
  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            void node;
            return <a {...props} target="_blank" rel="noopener noreferrer" />;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
