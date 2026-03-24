import { Component, For, createSignal, onMount, onCleanup, createMemo, createEffect } from "solid-js";
import BackButton from "./BackButton";
import { isHistoryOpen, memos, selectMemo, deleteMemo, closeHistory, t, clearAllMemos, sortedMemos } from "../store/appStore";

const History: Component = () => {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [memoToDelete, setMemoToDelete] = createSignal<string | null>(null);
  const [modalSelectedIndex, setModalSelectedIndex] = createSignal(1); // 0 = Cancel, 1 = Delete
  const [showClearAllModal, setShowClearAllModal] = createSignal(false);
  let searchInputRef: HTMLInputElement | undefined;

  const filteredMemos = createMemo(() => {
    const query = searchQuery().toLowerCase();
    const list = sortedMemos();
    if (!query) return list;
    return list.filter(m => m.content.toLowerCase().includes(query));
  });

  // Auto-focus search input when history opens
  createEffect(() => {
    if (isHistoryOpen()) {
      setTimeout(() => searchInputRef?.focus(), 10);
      setSelectedIndex(0);
      setSearchQuery("");
      setMemoToDelete(null);
      setModalSelectedIndex(1);
    }
  });

  createEffect(() => {
    // Scroll active item into view when index changes
    selectedIndex(); 
    const activeItem = document.querySelector(`.history-item-row.active`);
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isHistoryOpen()) return;

    // If modal is open, handle modal keys
    // If modal is open, handle modal keys exclusively
    if (memoToDelete()) {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (modalSelectedIndex() === 1) {
          confirmDelete();
        } else {
          setMemoToDelete(null);
        }
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setMemoToDelete(null);
        return;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setModalSelectedIndex(0);
        return;
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
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

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredMemos().length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const list = filteredMemos();
      if (list.length > 0 && selectedIndex() < list.length) {
        selectMemo(list[selectedIndex()]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeHistory();
    } else if (e.key === "Delete") {
      e.preventDefault();
      const list = filteredMemos();
      if (list.length > 0 && selectedIndex() < list.length) {
        setMemoToDelete(list[selectedIndex()].id);
      }
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  const confirmDelete = () => {
    const id = memoToDelete();
    if (id) {
      deleteMemo(id);
      setMemoToDelete(null);
      // Adjust selected index if it's now out of bounds
      if (selectedIndex() >= memos.length) {
        setSelectedIndex(Math.max(0, memos.length - 1));
      }
    }
  };

  const handleDeleteClick = (id: string) => {
    setMemoToDelete(id);
  };

  return (
    <div class="view history-view">
      <div class="settings-header">
        <BackButton onClick={closeHistory} />
        <div class="history-search-container">
          <input 
            ref={searchInputRef}
            type="text" 
            class="history-search-input" 
            placeholder={t("search_memo_placeholder")}
            value={searchQuery()}
            onInput={(e) => {
              setSearchQuery(e.currentTarget.value);
              setSelectedIndex(0);
            }}
          />
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button class="icon-btn" onClick={() => setShowClearAllModal(true)} title={t("clear_all")} style="color: var(--text-muted); opacity: 0.6;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="settings-content history-list-content">
        <div class="history-list">
          <For each={filteredMemos()}>
            {(memo, index) => (
              <div 
                class={`history-item-row ${index() === selectedIndex() ? 'active' : ''}`}
                onClick={() => selectMemo(memo)}
                onMouseEnter={() => setSelectedIndex(index())}
              >
                <div class="item-info">
                  <div class="item-preview-text">{memo.content.replace(/\n/g, ' ')}</div>
                  <div class="item-meta">
                    {new Date(memo.updated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div class="item-actions">
                  <button 
                    class="item-action-btn delete" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(memo.id);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </For>
          
          {filteredMemos().length === 0 && (
            <div class="history-empty-state">
              {searchQuery() ? t("no_matches") : t("no_history")}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div class={`confirm-modal-overlay ${memoToDelete() ? 'show' : ''}`} onClick={() => setMemoToDelete(null)}>
        <div class="confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div class="confirm-modal-title">{t("delete_confirm_title")}</div>
          <div class="confirm-modal-text">
            {t("delete_confirm_text")}
          </div>
          <div class="confirm-modal-actions">
            <button class={`confirm-modal-btn cancel ${modalSelectedIndex() === 0 ? 'active' : ''}`} onClick={() => setMemoToDelete(null)}>{t("cancel")}</button>
            <button class={`confirm-modal-btn danger ${modalSelectedIndex() === 1 ? 'active' : ''}`} onClick={confirmDelete}>{t("delete")}</button>
          </div>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      <div class={`confirm-modal-overlay ${showClearAllModal() ? 'show' : ''}`} onClick={() => setShowClearAllModal(false)}>
        <div class="confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div class="confirm-modal-title">{t("clear_all")}</div>
          <div class="confirm-modal-text">
            {t("confirm_clear_all")}
          </div>
          <div class="confirm-modal-actions">
            <button class="confirm-modal-btn cancel" onClick={() => setShowClearAllModal(false)}>{t("cancel")}</button>
            <button class="confirm-modal-btn danger" onClick={() => { clearAllMemos(); setShowClearAllModal(false); }}>{t("delete")}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
