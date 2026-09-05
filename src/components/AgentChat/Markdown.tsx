/**
 * 浮窗内的 markdown 渲染(M6:表格 / 代码块高亮+复制 / LaTeX 公式)。
 *
 * - remark-gfm:表格、删除线、自动链接
 * - remark-math + rehype-katex:$...$ 行内与 $$...$$ 块级公式(throwOnError=false,
 *   公式语法错误降级为原文,不炸整个气泡)
 * - rehype-highlight:代码块语言高亮(highlight.js github 主题)
 * - 安全:不启用 rehype-raw,LLM 输出里的 HTML 标签按纯文本展示(防注入)
 *
 * 流式期间 content 每个 delta 都会变,组件 memo 后只有最后一条消息在重渲染。
 */
import React, { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";
import "./markdown.scss";

/** 递归提取 React 节点里的纯文本(pre 复制按钮用) */
function extractText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  const props = (node as { props?: { children?: unknown } }).props;
  if (props) return extractText(props.children);
  return "";
}

/** 代码块:语言标签 + 一键复制 */
function CodeBlock({ children }: { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const first: unknown = Array.isArray(children) ? children[0] : children;
  const className: string =
    ((first as { props?: { className?: string } })?.props?.className as string) || "";
  const lang = /language-([\w-]+)/.exec(className)?.[1] ?? "代码";
  const raw = extractText(children);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用(非 https/权限)——静默 */
    }
  };

  return (
    <div className="agent-md-code">
      <div className="agent-md-code__bar">
        <span className="agent-md-code__lang">{lang}</span>
        <button type="button" className="agent-md-code__copy" onClick={onCopy}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="agent-md">
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, { throwOnError: false, output: "html" }],
        rehypeHighlight,
      ]}
      components={{
        // 宽表格在 390px 抽屉里横向滚动
        table: ({ children }: { children?: React.ReactNode }) => (
          <div className="agent-md__table-wrap">
            <table>{children}</table>
          </div>
        ),
        pre: CodeBlock as React.FC<{ children?: React.ReactNode }>,
        a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

export default memo(MarkdownContent);
