import { Component, createMemo } from "solid-js";
import { marked } from "marked";
import { text } from "../store/appStore";

const MarkdownPreview: Component = () => {
  const html = createMemo(() => {
    // Configure marked options if needed (e.g. breaks: true)
    return marked.parse(text(), { breaks: true }) as string;
  });

  return (
    <div class="markdown-preview-container">
      <div 
        class="markdown-body" 
        innerHTML={html()} 
      />
    </div>
  );
};

export default MarkdownPreview;
