import { Component, createMemo, onMount, onCleanup, createEffect, createSignal, For, Show } from "solid-js";
import MarkdownPreview from "./MarkdownPreview";
import { 
  text, setText, showToast, focusTrigger,
  editingTemplateId, editingTemplateMeta, setEditingTemplateMeta,
  saveTemplate, cancelTemplateEdit, hideAndResetApp,
  visualLinesCount, setVisualLinesCount, t,
  shortcuts, isShortcutPressed, recordingKey,
  showPreview, setShowPreview,
  showSearch, setShowSearch, focusSearchTrigger,
  isCommandMenuOpen, setIsCommandMenuOpen, setCommandMenuQuery, setCommandMenuPosition
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

  // Search & Replace state
  const [findQuery, setFindQuery] = createSignal("");
  const [replaceQuery, setReplaceQuery] = createSignal("");
  const [matchIdx, setMatchIdx] = createSignal(-1);
  const [matches, setMatches] = createSignal<number[]>([]);
  const [showReplace, setShowReplace] = createSignal(false);
  const [matchCase, setMatchCase] = createSignal(false);
  const [wholeWord, setWholeWord] = createSignal(false);
  let findInputRef: HTMLInputElement | undefined;

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

  createEffect(() => {
    if (focusSearchTrigger() > 0 && findInputRef) {
      findInputRef.focus();
      findInputRef.select();
    }
  });

  const editorStyle = {
    "white-space": "pre-wrap",
    "overflow-wrap": "anywhere",
    "word-break": "break-all"
  } as any;

  const parseMarkdownHtml = (raw: string) => {
    const lines = raw.split('\n');
    let inCodeBlock = false;
    
    return lines.map((line) => {
      let escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      
      let processed = escaped;

      // Fenced Code Block toggle
      if (processed.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        processed = `<span class="md-codeblock-toggle">${processed}</span>`;
        return `<div class="editor-line code-block-line">${processed}</div>`;
      }

      if (inCodeBlock) {
        return `<div class="editor-line code-block-line">${processed}</div>`;
      }

      // Headings
      if (processed.match(/^#{1,6}\s+/)) {
        processed = processed.replace(/^(#{1,6})\s+(.*)$/, '<span class="md-heading">$1 $2</span>');
      } 
      // Blockquotes
      else if (processed.match(/^>\s+/)) {
        processed = processed.replace(/^>\s+(.*)$/, '<span class="md-quote">&gt; $1</span>');
      } 
      // List items with Checkboxes
      else if (processed.match(/^([-*]|\d+\.)\s+\[([ xX])\]\s+/)) {
        processed = processed.replace(/^([-*]|\d+\.)\s+\[([ xX])\]\s+(.*)$/, (_, p1, p2, p3) => {
          const isChecked = p2.toLowerCase() === "x";
          return `<span class="md-list">${p1} </span><span class="md-checkbox ${isChecked ? 'checked' : ''}">[${p2}]</span> ${p3}`;
        });
      }
      // Standard List items
      else if (processed.match(/^([-*]|\d+\.)\s+/)) {
        processed = processed.replace(/^([-*]|\d+\.)\s+(.*)$/, '<span class="md-list">$1 </span>$2');
      }
      // Horizontal Rule
      else if (processed.match(/^(?:---|\*\*\*|___)$/)) {
        processed = `<span class="md-hr">${processed}</span>`;
      }

      // Inline styles (only if not in code block)
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<b class="md-bold">**$1**</b>');
      processed = processed.replace(/\*(.*?)\*/g, '<i class="md-italic">*$1*</i>');
      processed = processed.replace(/`(.*?)`/g, '<code class="md-inline-code">`$1`</code>');
      
      // Links [text](url)
      processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<span class="md-link-text">[$1]</span><span class="md-link-url">($2)</span>');

      const content = processed || '<span style="visibility: hidden">.</span>';
      return `<div class="editor-line">${content}</div>`;
    }).join("");
  };

  const handleMarkdownInput = (e: KeyboardEvent) => {
    if (!textareaRef) return false;
    const { selectionStart, selectionEnd, value } = textareaRef;
    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);
    const lines = before.split('\n');
    const currentLine = lines[lines.length - 1];

    // 1. Enter key: Auto-list continuation
    if (e.key === "Enter" && !e.shiftKey) {
      const match = currentLine.match(/^(\s*)([-*>]|(\d+)\.)(\s+\[[ xX]\]\s+|\s+)/);
      if (match) {
        const indent = match[1];
        const prefix = match[2];
        const isCheckbox = match[4].includes('[');
        
        // If the line is ONLY the prefix, clear it (terminate list)
        const isOnlyPrefix = currentLine.trim() === prefix || (isCheckbox && currentLine.trim().endsWith(']'));
        if (isOnlyPrefix) {
          e.preventDefault();
          const newBefore = before.substring(0, before.length - currentLine.length);
          setText(newBefore + after);
          return true;
        }

        e.preventDefault();
        let nextPrefix = prefix;
        if (match[3]) { // Ordered list
          nextPrefix = (parseInt(match[3]) + 1) + ".";
        }
        
        const checkbox = isCheckbox ? "[ ] " : "";
        const insertion = `\n${indent}${nextPrefix}${match[4].startsWith(' ') ? ' ' : ''}${checkbox}`;
        setText(before + insertion + after);
        setTimeout(() => {
          textareaRef!.selectionStart = textareaRef!.selectionEnd = selectionStart + insertion.length;
        }, 0);
        return true;
      }
    }

    // 2. Tab key: Indentation (2 spaces)
    if (e.key === "Tab") {
      e.preventDefault();
      const insertion = "  ";
      if (!e.shiftKey) {
        setText(before + insertion + after);
        setTimeout(() => {
          textareaRef!.selectionStart = textareaRef!.selectionEnd = selectionStart + insertion.length;
        }, 0);
      } else {
        // Simple backspace-like unindent for 2 spaces
        if (before.endsWith("  ")) {
          setText(before.substring(0, before.length - 2) + after);
          setTimeout(() => {
            textareaRef!.selectionStart = textareaRef!.selectionEnd = selectionStart - 2;
          }, 0);
        }
      }
      return true;
    }
    return false;
  };

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (recordingKey() !== null) return;
    if (e.isComposing) return;

    if (e.key === "Escape") {
      e.preventDefault();
      if (showSearch()) {
        setShowSearch(false);
        focusEditor();
      } else if (showPreview()) {
        setShowPreview(false);
        focusEditor();
      } else if (editingTemplateId()) {
        cancelTemplateEdit();
      } else {
        await hideAndResetApp();
      }
      return;
    }

    // Markdown assistance
    if (handleMarkdownInput(e)) return;

    if (isShortcutPressed(shortcuts.save_copy, e)) {
      e.preventDefault();
      if (editingTemplateId()) {
        saveTemplate();
      } else if (text().trim() !== "") {
        await copyToClipboard(text());
        showToast(t("t_copied"));
        await hideAndResetApp();
      }
      return;
    }

    // Ctrl + F for Find
    if (e.ctrlKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      const next = !showSearch();
      setShowSearch(next);
      if (next) {
        setShowPreview(false); // Can't search in preview
        setTimeout(() => findInputRef?.focus(), 50);
      } else {
        focusEditor();
      }
      return;
    }

    // Ctrl + P for Preview
    if (e.ctrlKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      e.stopImmediatePropagation();
      setShowPreview(!showPreview());
      focusEditor();
      return;
    }

    // -- SLASH COMMANDS --
    if (isCommandMenuOpen()) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter") {
        // Handled by CommandMenu's global listener, but we might want to stop propagation here
        return;
      }
      if (e.key === " ") {
        setIsCommandMenuOpen(false);
      }
    }
  };

  const getCaretCoordinates = () => {
    if (!textareaRef) return { x: 0, y: 0 };
    const selectionStart = textareaRef.selectionStart;
    const textBeforeCaret = textareaRef.value.substring(0, selectionStart);
    
    // Create mirror element
    const mirror = document.createElement("div");
    const style = window.getComputedStyle(textareaRef);
    
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordBreak = "break-all";
    mirror.style.width = style.width;
    mirror.style.font = style.font;
    mirror.style.padding = style.padding;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.border = style.border;
    mirror.style.boxSizing = style.boxSizing;
    
    mirror.textContent = textBeforeCaret;
    const span = document.createElement("span");
    span.textContent = "/"; // Match the trigger character
    mirror.appendChild(span);
    
    document.body.appendChild(mirror);
    const rect = span.getBoundingClientRect();
    document.body.removeChild(mirror);

    // Calculate position relative to viewport
    // Since mirror is absolute on body, rect is already viewport-relative
    const x = rect.left;
    const y = rect.bottom + 4; // 4px gap below the character

    return { x, y };
  };

  const handleInput = (e: any) => {
    const newVal = e.currentTarget.value;
    setText(newVal);

    const selectionStart = textareaRef?.selectionStart || 0;
    const char = newVal[selectionStart - 1];
    
    if (char === "/") {
      const before = newVal.substring(0, selectionStart - 1);
      const isStart = before === "" || before.endsWith("\n") || before.endsWith(" ");
      
      if (isStart) {
        const coords = getCaretCoordinates();
        setCommandMenuPosition(coords);
        setIsCommandMenuOpen(true);
        setCommandMenuQuery("");
      }
    } else if (isCommandMenuOpen()) {
      const slashIndex = newVal.lastIndexOf("/", selectionStart - 1);
      if (slashIndex !== -1) {
        const query = newVal.substring(slashIndex + 1, selectionStart);
        if (query.includes(" ") || query.includes("\n")) {
          setIsCommandMenuOpen(false);
        } else {
          setCommandMenuQuery(query);
        }
      } else {
        setIsCommandMenuOpen(false);
      }
    }
  };

  onMount(() => {
    const handleApply = (e: any) => {
      const insert = e.detail.insert;
      const val = text();
      const start = textareaRef?.selectionStart || 0;
      const slashIndex = val.lastIndexOf("/", start - 1);
      
      if (slashIndex !== -1) {
        const next = val.substring(0, slashIndex) + insert + val.substring(start);
        setText(next);
        setTimeout(() => {
          if (textareaRef) {
            const newPos = slashIndex + insert.length;
            textareaRef.setSelectionRange(newPos, newPos);
            textareaRef.focus();
          }
        }, 0);
      }
    };
    window.addEventListener("apply-slash-command", handleApply);
    onCleanup(() => window.removeEventListener("apply-slash-command", handleApply));
  });

  const findMatches = (query: string) => {
    if (!query) { setMatches([]); setMatchIdx(-1); return; }
    const content = text();
    let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (wholeWord()) {
      escaped = `\\b${escaped}\\b`;
    }
    const flags = matchCase() ? 'g' : 'gi';
    
    try {
      const regex = new RegExp(escaped, flags);
      const newMatches: number[] = [];
      let match;
      while ((match = regex.exec(content)) !== null) newMatches.push(match.index);
      setMatches(newMatches);
      if (newMatches.length > 0) { setMatchIdx(0); highlightMatch(0); } else { setMatchIdx(-1); }
    } catch (e) {
      console.error("Invalid search regex", e);
      setMatches([]); setMatchIdx(-1);
    }
  };

  const highlightMatch = (idx: number) => {
    const list = matches();
    if (idx < 0 || idx >= list.length || !textareaRef) return;
    const start = list[idx];
    const end = start + findQuery().length;
    textareaRef.focus();
    textareaRef.setSelectionRange(start, end);
    const lineNum = text().substring(0, start).split("\n").length;
    textareaRef.scrollTop = (lineNum - 5) * 20;
  };

  const nextMatch = () => {
    if (matches().length === 0) return;
    const next = (matchIdx() + 1) % matches().length;
    setMatchIdx(next); highlightMatch(next);
  };

  const prevMatch = () => {
    if (matches().length === 0) return;
    const next = (matchIdx() - 1 + matches().length) % matches().length;
    setMatchIdx(next); highlightMatch(next);
  };

  const handleReplace = () => {
    const list = matches(); const idx = matchIdx();
    if (idx < 0 || idx >= list.length || !textareaRef) return;
    const start = list[idx]; const end = start + findQuery().length;
    const nt = text().substring(0, start) + replaceQuery() + text().substring(end);
    setText(nt); findMatches(findQuery());
  };

  const handleReplaceAll = () => {
    const q = findQuery(); if (!q) return;
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    setText(text().replace(regex, replaceQuery()));
    findMatches(""); showToast(t("search_replace_all"));
  };

  const handleLabelKeyDown = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); categoryRef?.focus(); } };
  const handleCategoryKeyDown = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); textareaRef?.focus(); } };

  const highlightedHTML = createMemo(() => parseMarkdownHtml(text()));

  const updateVisualLines = () => {
    if (contentRef) {
      const lineHeight = 13 * 1.6;
      const count = Math.max(1, Math.round(contentRef.offsetHeight / lineHeight));
      setVisualLinesCount(count);
    }
  };

  createEffect(() => { text(); requestAnimationFrame(updateVisualLines); });

  const handleScroll = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    if (displayRef && target !== displayRef) displayRef.scrollTop = target.scrollTop;
    if (textareaRef && target !== textareaRef) textareaRef.scrollTop = target.scrollTop;
    if (gutterRef && target !== gutterRef) gutterRef.scrollTop = target.scrollTop;
  };

  return (
    <div class={`view editor-view ${isFocused() ? 'focused' : ''} ${editingTemplateId() ? 'editing-template' : ''} ${showPreview() ? 'preview-mode' : ''}`}>
      <Show when={editingTemplateId()}>
        <div class="template-edit-header">
          <div class="template-edit-title">{t("editing_template")}</div>
          <div class="template-meta-fields">
            <div class="meta-field">
              <label>{t("template_name")}</label>
              <input ref={labelRef} type="text" placeholder={t("name_placeholder")} class="meta-input" value={editingTemplateMeta().label} onInput={(e) => setEditingTemplateMeta({ ...editingTemplateMeta(), label: e.currentTarget.value })} onKeyDown={handleLabelKeyDown} />
            </div>
            <div class="meta-field">
              <label>{t("template_category")}</label>
              <input ref={categoryRef} type="text" placeholder={t("category_placeholder")} class="meta-input" value={editingTemplateMeta().category} onInput={(e) => setEditingTemplateMeta({ ...editingTemplateMeta(), category: e.currentTarget.value })} onKeyDown={handleCategoryKeyDown} />
            </div>
          </div>
        </div>
      </Show>

      <Show when={showSearch()}>
        <div class="search-replace-bar show">
          <div class="sr-row">
            <button class={`sr-toggle-btn ${showReplace() ? 'active' : ''}`} onClick={() => setShowReplace(!showReplace())} title={t("search_replace")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style={{ transform: showReplace() ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="sr-input-container">
              <input 
                ref={findInputRef} 
                class="sr-input" 
                placeholder={t("search_placeholder")} 
                value={findQuery()} 
                onInput={(e) => { setFindQuery(e.currentTarget.value); findMatches(e.currentTarget.value); }} 
                onKeyDown={(e) => { 
                  if (e.key === "Enter") nextMatch(); 
                  if (e.key === "Escape") { setShowSearch(false); focusEditor(); } 
                  if (e.ctrlKey && e.key.toLowerCase() === "f") { e.preventDefault(); setShowSearch(false); focusEditor(); } 
                }} 
              />
              <div class="sr-options-inline">
                <button 
                  class={`sr-option-btn ${matchCase() ? 'active' : ''}`} 
                  onClick={() => { setMatchCase(!matchCase()); findMatches(findQuery()); }} 
                  title={t("sc_match_case")}
                >Aa</button>
                <button 
                  class={`sr-option-btn ${wholeWord() ? 'active' : ''}`} 
                  onClick={() => { setWholeWord(!wholeWord()); findMatches(findQuery()); }} 
                  title={t("sc_whole_word")}
                >ab</button>
              </div>
            </div>
            <div class="sr-nav">
              <button class="sr-nav-btn" onClick={prevMatch} disabled={matches().length === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
              <button class="sr-nav-btn" onClick={nextMatch} disabled={matches().length === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            </div>
            <div class="sr-counts">
              {matches().length > 0 ? `${matchIdx() + 1}/${matches().length}` : '0/0'}
            </div>
            <button class="sr-close-btn" onClick={() => setShowSearch(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <Show when={showReplace()}>
            <div class="sr-row animate-in">
              <input class="sr-input" placeholder={t("replace_placeholder")} value={replaceQuery()} onInput={(e) => setReplaceQuery(e.currentTarget.value)} />
              <div class="sr-actions">
                <button class="sr-btn" onClick={handleReplace} disabled={matches().length === 0}>{t("search_replace")}</button>
                <button class="sr-btn accent" onClick={handleReplaceAll} disabled={!findQuery()}>{t("search_replace_all")}</button>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      <div class="editor-container-outer">
        <Show when={showPreview()} fallback={
          <>
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
                onInput={handleInput}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </div>
          </>
        }>
          <MarkdownPreview />
        </Show>
      </div>
    </div>
  );
};

export default Editor;
