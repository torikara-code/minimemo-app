import { Component, createMemo, onMount, onCleanup, createEffect, createSignal, For, Show } from "solid-js";
import { 
  text, setText, showToast, focusTrigger,
  editingTemplateId, editingTemplateMeta, setEditingTemplateMeta,
  saveTemplate, cancelTemplateEdit, hideAndResetApp,
  visualLinesCount, setVisualLinesCount, t
} from "../store/appStore";
import { copyToClipboard } from "../api/tauri";
import { getCurrentWindow } from "@tauri-apps/api/window";

const Editor: Component = () => {
  let textareaRef: HTMLTextAreaElement | undefined;
  let labelRef: HTMLInputElement | undefined;
  let categoryRef: HTMLInputElement | undefined;
  let displayRef: HTMLDivElement | undefined;
  let gutterRef: HTMLDivElement | undefined;
  let contentRef: HTMLDivElement | undefined;
  const [isFocused, setIsFocused] = createSignal(false);

  const focusEditor = () => {
    if (editingTemplateId()) {
      if (editingTemplateId() === "new" && labelRef) {
        labelRef.focus();
      } else if (textareaRef) {
        textareaRef.focus();
      }
    } else if (textareaRef) {
      textareaRef.focus();
      const len = textareaRef.value.length;
      textareaRef.setSelectionRange(len, len);
      textareaRef.scrollTop = textareaRef.scrollHeight;
    }
  };

  onMount(async () => {
    focusEditor();
    const unlisten = await getCurrentWindow().listen('tauri://focus', () => {
      focusEditor();
    });
    onCleanup(() => unlisten());
  });

  createEffect(() => {
    if (focusTrigger() > 0) focusEditor();
  });

  const editorStyle = {
    "white-space": "pre-wrap",
    "overflow-wrap": "anywhere",
    "word-break": "break-all"
  } as any;

  const parseMarkdownHtml = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line) => {
      let escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      let processed = escaped;
      if (processed.match(/^#{1,6}\s+/)) {
        processed = processed.replace(/^(#{1,6})\s+(.*)$/, '<span class="md-heading">$1 $2</span>');
      } else if (processed.match(/^>\s+/)) {
        processed = processed.replace(/^>\s+(.*)$/, '<span class="md-quote">&gt; $1</span>');
      } else if (processed.match(/^([-*]|\d+\.)\s+/)) {
        processed = processed.replace(/^([-*]|\d+\.)\s+(.*)$/, '<span class="md-list">$1 </span>$2');
      }
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<b class="md-bold">**$1**</b>');
      processed = processed.replace(/\*(.*?)\*/g, '<i class="md-italic">*$1*</i>');
      processed = processed.replace(/`(.*?)`/g, '<code class="md-code">`$1`</code>');
      const content = processed || '<span style="visibility: hidden">.</span>';
      return `<div class="editor-line">${content}</div>`;
    }).join("");
  };

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (e.isComposing) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (editingTemplateId()) {
        cancelTemplateEdit();
      } else {
        await hideAndResetApp();
      }
      return;
    }
    
    if (e.ctrlKey) {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (editingTemplateId()) {
          saveTemplate();
        } else if (text().trim() !== "") {
          await copyToClipboard(text());
          showToast(t("t_copied"));
          await hideAndResetApp();
        }
      }
    }
  };

  const handleLabelKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      categoryRef?.focus();
    }
  };

  const handleCategoryKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      textareaRef?.focus();
    }
  };

  const highlightedHTML = createMemo(() => parseMarkdownHtml(text()));

  const updateVisualLines = () => {
    if (contentRef) {
      const lineHeight = 13 * 1.6;
      const count = Math.max(1, Math.round(contentRef.offsetHeight / lineHeight));
      setVisualLinesCount(count);
    }
  };

  createEffect(() => {
    text();
    requestAnimationFrame(updateVisualLines);
  });

  const handleScroll = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    if (displayRef && target !== displayRef) displayRef.scrollTop = target.scrollTop;
    if (textareaRef && target !== textareaRef) textareaRef.scrollTop = target.scrollTop;
    if (gutterRef && target !== gutterRef) gutterRef.scrollTop = target.scrollTop;
  };

  return (
    <div class={`view editor-view ${isFocused() ? 'focused' : ''} ${editingTemplateId() ? 'editing-template' : ''}`}>
      <Show when={editingTemplateId()}>
        <div class="template-edit-header">
          <div class="template-edit-title">{t("editing_template")}</div>
          <div class="template-meta-fields">
            <div class="meta-field">
              <label>{t("template_name")}</label>
              <input 
                ref={labelRef}
                type="text" 
                placeholder={t("name_placeholder")} 
                class="meta-input"
                value={editingTemplateMeta().label}
                onInput={(e) => setEditingTemplateMeta({ ...editingTemplateMeta(), label: e.currentTarget.value })}
                onKeyDown={handleLabelKeyDown}
              />
            </div>
            <div class="meta-field">
              <label>{t("template_category")}</label>
              <input 
                ref={categoryRef}
                type="text" 
                placeholder={t("category_placeholder")} 
                class="meta-input"
                value={editingTemplateMeta().category}
                onInput={(e) => setEditingTemplateMeta({ ...editingTemplateMeta(), category: e.currentTarget.value })}
                onKeyDown={handleCategoryKeyDown}
              />
            </div>
          </div>
        </div>
      </Show>

      <div class="editor-container-outer">
        <div class="editor-gutter" ref={gutterRef}>
          <For each={Array.from({ length: visualLinesCount() }, (_, i) => i + 1)}>
            {(num) => <div class="gutter-num">{num}</div>}
          </For>
        </div>
        <div class="editor-container">
          <div ref={displayRef} class="editor-base editor-display" style={editorStyle}>
            <div ref={contentRef} innerHTML={highlightedHTML()} />
          </div>
          <textarea
            ref={textareaRef}
            class="editor-base editor-input"
            style={editorStyle}
            spellcheck={false}
            placeholder={editingTemplateId() ? t("template_placeholder") : t("placeholder")}
            value={text()}
            onInput={(e) => setText(e.currentTarget.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>
      </div>

      </div>
    );
  };
export default Editor;
