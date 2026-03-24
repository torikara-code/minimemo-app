import { Component, createSignal, For, createMemo, onMount, onCleanup, createEffect } from "solid-js";
import BackButton from "./BackButton";
import { templates, showToast, isClipboardOpen, startTemplateEdit, deleteTemplate, closeClipboard, t } from "../store/appStore";
import { copyToClipboard } from "../api/tauri";

const Clipboard: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedCategory, setSelectedCategory] = createSignal(t("all_categories"));
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [templateToDelete, setTemplateToDelete] = createSignal<string | null>(null);
  const [modalSelectedIndex, setModalSelectedIndex] = createSignal(1); // 0 = Cancel, 1 = Delete
  const [navTarget, setNavTarget] = createSignal<'list' | 'categories'>('list');
  let searchInputRef: HTMLInputElement | undefined;

  const categories = createMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return [t("all_categories"), ...Array.from(cats)];
  });

  const filteredTemplates = createMemo(() => {
    const query = searchQuery().toLowerCase();
    const cat = selectedCategory();
    return templates.filter(item => {
      const matchSearch = item.label.toLowerCase().includes(query) || 
                          item.content.toLowerCase().includes(query);
      const matchCat = cat === t("all_categories") || item.category === cat;
      return matchSearch && matchCat;
    });
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isClipboardOpen()) return;
    
    // If modal is open, handle modal keys exclusively
    if (templateToDelete()) {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (modalSelectedIndex() === 1) {
          confirmDelete();
        } else {
          setTemplateToDelete(null);
        }
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setTemplateToDelete(null);
        return;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setModalSelectedIndex(0);
        return;
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setModalSelectedIndex(1);
        return;
      }
      // Block other keys only if no modifiers are pressed (allow global shortcuts)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    const list = filteredTemplates();
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (navTarget() === 'categories') {
        setNavTarget('list');
        setSelectedIndex(0);
      } else {
        setSelectedIndex((prev) => Math.min(prev + 1, list.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (navTarget() === 'list' && selectedIndex() === 0) {
        setNavTarget('categories');
      } else if (navTarget() === 'list') {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === "ArrowLeft") {
      if (navTarget() === 'categories') {
        e.preventDefault();
        const cats = categories();
        const currentIndex = cats.indexOf(selectedCategory());
        const nextIndex = (currentIndex - 1 + cats.length) % cats.length;
        setSelectedCategory(cats[nextIndex]);
      }
    } else if (e.key === "ArrowRight") {
      if (navTarget() === 'categories') {
        e.preventDefault();
        const cats = categories();
        const currentIndex = cats.indexOf(selectedCategory());
        const nextIndex = (currentIndex + 1) % cats.length;
        setSelectedCategory(cats[nextIndex]);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (navTarget() === 'categories') {
        setNavTarget('list');
        setSelectedIndex(0);
      } else if (list.length > 0 && selectedIndex() < list.length) {
        handleCopy(list[selectedIndex()].content);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeClipboard();
    } else if (e.key === "Delete") {
      e.preventDefault();
      if (list.length > 0 && selectedIndex() < list.length) {
        setTemplateToDelete(list[selectedIndex()].id);
        setModalSelectedIndex(1);
      }
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    searchInputRef?.focus();
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  createEffect(() => {
    // Scroll active item into view
    selectedIndex(); 
    const activeItem = document.querySelector(`.template-card.active`);
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  createEffect(() => {
    // Scroll active category tab into view
    selectedCategory();
    navTarget(); // Trigger when focus moves to categories too
    const activeTab = document.querySelector(`.tab-btn.active`);
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });

  // Auto-focus and reset search when clipboard opens
  createEffect(() => {
    if (isClipboardOpen()) {
      setTimeout(() => searchInputRef?.focus(), 10);
      setSelectedIndex(0);
      setSearchQuery("");
    }
  });

  const handleCopy = async (content: string) => {
    await copyToClipboard(content);
    showToast(t("t_copied"));
    closeClipboard();
  };

  const confirmDelete = () => {
    const id = templateToDelete();
    if (id) {
      deleteTemplate(id);
      setTemplateToDelete(null);
      // Adjust selected index if it's now out of bounds
      const nextLen = filteredTemplates().length;
      if (selectedIndex() >= nextLen) {
        setSelectedIndex(Math.max(0, nextLen - 1));
      }
    }
  };

  return (
    <div class="view clipboard-view">
      <div class="settings-header">
        <BackButton onClick={closeClipboard} />
        <div class="history-search-container">
          <input 
            ref={searchInputRef}
            type="text" 
            class="history-search-input" 
            placeholder={t("search_templates")} 
            value={searchQuery()}
            onInput={(e) => {
              setSearchQuery(e.currentTarget.value);
              setSelectedIndex(0);
            }}
          />
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button class="icon-btn" onClick={() => startTemplateEdit()} title={t("add_template")} style="color: var(--accent);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="settings-content">

        <div class={`category-tabs ${navTarget() === 'categories' ? 'focused' : ''}`} style={{ "margin-bottom": "4px" }}>
          <For each={categories()}>
            {(cat) => (
              <button 
                class={`tab-btn ${selectedCategory() === cat ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(cat);
                  setNavTarget('categories');
                  setSelectedIndex(0);
                }}
              >
                {cat}
              </button>
            )}
          </For>
        </div>

        <div class="template-list">
          <For each={filteredTemplates()} fallback={<div class="empty-state" style={{ "padding": "20px" }}>{t("no_templates")}</div>}>
            {(template, index) => (
              <div 
                class={`history-item-row ${index() === selectedIndex() && navTarget() === 'list' ? 'active' : ''}`}
                onClick={() => handleCopy(template.content)}
                onMouseEnter={() => {
                  setSelectedIndex(index());
                  setNavTarget('list');
                }}
              >
                <div class="item-info">
                  <div class="item-preview-text">
                    <span class="template-category" style="margin-right: 8px; font-size: 10px;">[{template.category}]</span>
                    {template.label}
                  </div>
                  <div class="item-meta">{template.content}</div>
                </div>
                <div class="item-actions">
                  <button class="item-action-btn edit" onClick={(e) => { e.stopPropagation(); startTemplateEdit(template); }} title={t("edit")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button class="item-action-btn delete" onClick={(e) => { e.stopPropagation(); setTemplateToDelete(template.id); setModalSelectedIndex(1); }} title={`${t("delete")} (Del)`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div class={`confirm-modal-overlay ${templateToDelete() ? 'show' : ''}`} onClick={() => setTemplateToDelete(null)}>
        <div class="confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div class="confirm-modal-title">{t("delete_template_title")}</div>
          <div class="confirm-modal-text">
            {t("delete_template_text")}
          </div>
          <div class="confirm-modal-actions">
            <button class={`confirm-modal-btn cancel ${modalSelectedIndex() === 0 ? 'active' : ''}`} onClick={() => setTemplateToDelete(null)}>{t("cancel")}</button>
            <button class={`confirm-modal-btn danger ${modalSelectedIndex() === 1 ? 'active' : ''}`} onClick={confirmDelete}>{t("delete")}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clipboard;

