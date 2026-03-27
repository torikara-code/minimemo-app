import { Component, onMount, createSignal, onCleanup, createEffect, Show } from "solid-js";
import Editor from "./components/Editor";
import History from "./components/History";
import Settings from "./components/Settings";
import Clipboard from "./components/Clipboard";
import Todo from "./components/Todo";
import BackButton from "./components/BackButton";
import CommandMenu from "./components/CommandMenu";
import { 
  theme, toggleTheme, showToast, showSettings, setShowSettings, opacity, t,
  showNewMemoBtn, showClipboardBtn, showHistoryBtn, showTodoBtn, showPreviewBtn,
  isHistoryOpen, setHistoryOpen, isClipboardOpen, setClipboardOpen,
  isTodoOpen, setTodoOpen, showPreview, setShowPreview,
  isPinned, setPinned, isMaximized, setIsMaximized,
  setFocusTrigger, toastMessage,
  shortcuts, isShortcutPressed, recordingKey,
  initializeStore, createNewMemo, startTemplateEdit, cancelTemplateEdit, saveTemplate, hideAndResetApp,
  isShortcutsOpen, setShortcutsOpen, showGrid, stats, editingTemplateId,
  toggleSearch
} from "./store/appStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

const App: Component = () => {
  const [isUserActive, setIsUserActive] = createSignal(true);
  let activityTimer: any;

  const resetActivity = () => {
    setIsUserActive(true);
    if (activityTimer) clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
      if (!showSettings() && !isHistoryOpen()) {
        setIsUserActive(false);
      }
    }, 4500);
  };

  const handleGlobalKey = (e: KeyboardEvent) => {
    if (recordingKey() !== null) return;
    resetActivity();

    // Toggle Preview should be fast and always work
    if (isShortcutPressed(shortcuts.toggle_preview, e)) {
      e.preventDefault();
      setShowPreview(!showPreview());
      if (!showPreview()) setFocusTrigger(t => t + 1);
      return;
    }

    // Escape to close views
    if (e.key === "Escape") {
      // Prioritize canceling template edit
      if (editingTemplateId()) {
        cancelTemplateEdit();
        e.preventDefault(); 
        e.stopImmediatePropagation();
        return;
      }
      
      if (isShortcutsOpen()) {
        setShortcutsOpen(false);
        setFocusTrigger(t => t + 1);
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      if (showSettings()) {
        setShowSettings(false);
        setFocusTrigger(t => t + 1);
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      if (isHistoryOpen()) {
        setHistoryOpen(false);
        setFocusTrigger(t => t + 1);
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (isTodoOpen()) {
        setTodoOpen(false);
        setFocusTrigger(t => t + 1);
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      if (isClipboardOpen()) {
        setClipboardOpen(false);
        setFocusTrigger(t => t + 1);
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      if (showPreview()) {
        setShowPreview(false);
        setFocusTrigger(t => t + 1);
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
    }

    // Shortcuts from store
    if (isShortcutPressed(shortcuts.new_memo, e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (isClipboardOpen()) {
        startTemplateEdit();
      } else {
        createNewMemo();
      }
      return;
    }

    if (isShortcutPressed(shortcuts.toggle_history, e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const nextState = !isHistoryOpen();
      setHistoryOpen(nextState);
      if (nextState) {
        setClipboardOpen(false);
        setTodoOpen(false);
        setShowSettings(false);
        setShowPreview(false);
      } else {
        setFocusTrigger(t => t + 1);
      }
      return;
    }

    if (isShortcutPressed(shortcuts.toggle_templates, e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const nextState = !isClipboardOpen();
      setClipboardOpen(nextState);
      if (nextState) {
        setHistoryOpen(false);
        setTodoOpen(false);
        setShowSettings(false);
        setShowPreview(false);
      } else {
        setFocusTrigger(t => t + 1);
      }
      return;
    }

    if (isShortcutPressed(shortcuts.toggle_todo, e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const nextState = !isTodoOpen();
      setTodoOpen(nextState);
      if (nextState) {
        setHistoryOpen(false);
        setClipboardOpen(false);
        setShowSettings(false);
        setShowPreview(false);
      } else {
        setFocusTrigger(t => t + 1);
      }
      return;
    }

    if (isShortcutPressed(shortcuts.toggle_preview, e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const next = !showPreview();
      setShowPreview(next);
      if (next) {
        setHistoryOpen(false);
        setClipboardOpen(false);
        setTodoOpen(false);
        setShowSettings(false);
      } else {
        setFocusTrigger(t => t + 1);
      }
      return;
    }

    if (isShortcutPressed(shortcuts.toggle_search, e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      toggleSearch();
      return;
    }

    if (isShortcutPressed(shortcuts.toggle_theme, e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      toggleTheme();
      return;
    }
  };

  onMount(async () => {
    const appWindow = getCurrentWindow();
    
    // Initial sync
    const maximized = await appWindow.isMaximized();
    setIsMaximized(maximized);

    // Sync window state on resize/maximize
    const unlistenResize = await appWindow.listen('tauri://resize', async () => {
      const isMax = await appWindow.isMaximized();
      setIsMaximized(isMax);
    });

    // Handle close-and-reset from Rust backend (Ctrl+M)
    const unlistenReset = await listen("request-hide-reset", () => {
      if (recordingKey() === null) {
        hideAndResetApp();
      }
    });

    // Initialize from store
    await initializeStore();

    window.addEventListener("keydown", handleGlobalKey, false);
    window.addEventListener('mousemove', resetActivity);
    resetActivity();

    // 初期描画（Acrylic）が完了してからウィンドウを表示（白フラッシュ防止）
    // requestAnimationFrame を二重にすることで、CSS と WebView2 の描画を待機する
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        await invoke("show_ready_window");
      });
    });

    onCleanup(() => {
      unlistenResize();
      unlistenReset();
      window.removeEventListener("keydown", handleGlobalKey, false);
      window.removeEventListener("mousemove", resetActivity);
    });
  });

  createEffect(() => {
    const t = theme();
    document.body.classList.remove("light-theme", "dark-theme", "system-theme", "liquid-glass-theme", "architect-theme", "architect_dark-theme", "botanist-theme", "coast-theme", "forest-theme", "ocean-theme");
    document.body.classList.add(`${t}-theme`);
  });

  createEffect(() => {
    if (showGrid()) {
      document.body.classList.add("show-grid");
    } else {
      document.body.classList.remove("show-grid");
    }
  });

  const minimizeApp = async () => {
    await getCurrentWindow().minimize();
  };

  const toggleMaximize = async () => {
    const window = getCurrentWindow();
    if (await window.isMaximized()) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
  };

  const closeApp = async () => {
    await getCurrentWindow().close();
  };

  const handleDrag = async (e: MouseEvent) => {
    if (e.button === 0) {
      try {
        await getCurrentWindow().startDragging();
      } catch (err) {
        console.error("Failed to start dragging:", err);
      }
    }
  };

  const togglePin = async () => {
    const next = !isPinned();
    await getCurrentWindow().setAlwaysOnTop(next);
    setPinned(next);
    showToast(t(next ? "t_window_pinned" : "t_window_unpinned"));
  };

  return (
    <div 
      class={`app-wrapper ${theme()}-theme ${showSettings() ? 'show-settings' : ''} ${isHistoryOpen() ? 'show-history' : ''} ${isClipboardOpen() ? 'show-clipboard' : ''} ${isTodoOpen() ? 'show-todo' : ''} ${isShortcutsOpen() ? 'show-shortcuts-guide' : ''} ${showPreview() ? 'show-preview' : ''} ${!isUserActive() ? 'ui-faded' : ''}`}
      style={{ 
        "--glass-bg-dynamic": `rgba(var(--bg-rgb), ${opacity() / 100})`
      }}
    >
      <CommandMenu />
      <div
        class="app-titlebar"
        onMouseDown={handleDrag}
        style={{ "-webkit-app-region": "drag", "cursor": "default" }}
      >
        <div class="app-actions" style={{ "-webkit-app-region": "no-drag", "display": "flex", "align-items": "center" }}>
          <Show when={showNewMemoBtn()}>
            <button
              class="titlebar-btn"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={createNewMemo}
              title={t("new_memo")}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </Show>

          <Show when={showClipboardBtn()}>
            <button
              class={`titlebar-btn ${isClipboardOpen() ? 'active' : ''}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                const next = !isClipboardOpen();
                setClipboardOpen(next);
                if (next) { setHistoryOpen(false); setTodoOpen(false); setShowSettings(false); setShowPreview(false); }
              }}
              title={t("clipboard")}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </button>
          </Show>
          
          <Show when={showHistoryBtn()}>
            <button
              class={`titlebar-btn ${isHistoryOpen() ? 'active' : ''}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                const next = !isHistoryOpen();
                setHistoryOpen(next);
                if (next) { setClipboardOpen(false); setTodoOpen(false); setShowSettings(false); setShowPreview(false); }
              }}
              title={t("history")}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 8v4l3 3"></path>
                <circle cx="12" cy="12" r="9"></circle>
              </svg>
            </button>
          </Show>

          <Show when={showTodoBtn()}>
            <button
              class={`titlebar-btn ${isTodoOpen() ? 'active' : ''}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                const next = !isTodoOpen();
                setTodoOpen(next);
                if (next) { setHistoryOpen(false); setClipboardOpen(false); setShowSettings(false); setShowPreview(false); }
              }}
              title={t("todo_title")}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </button>
          </Show>

        </div>

        <div style="flex: 1"></div>

        <div class="window-controls" style={{ "-webkit-app-region": "no-drag", "display": "flex" }}>
          <Show when={showPreviewBtn()}>
            <button 
              class={`titlebar-btn control-btn titlebar-btn-narrow ${showPreview() ? 'active' : ''}`} 
              onMouseDown={(e) => e.stopPropagation()} 
              onClick={() => { 
                const next = !showPreview();
                setShowPreview(next); 
                if (next) { setHistoryOpen(false); setClipboardOpen(false); setTodoOpen(false); setShowSettings(false); }
                else { setFocusTrigger(t => t + 1); }
              }} 
              title={t("sc_preview")}
            >
              <span style={{ "font-family": "var(--font-sans)", "font-weight": "800", "font-size": "10.5px", "line-height": "1" }}>MD</span>
            </button>
          </Show>
          <button
            class={`titlebar-btn control-btn titlebar-btn-narrow ${isPinned() ? 'active' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={togglePin}
            title={isPinned() ? t("window_unpin") : t("window_pin")}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v2a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 10z"></path>
              <path d="M12 22V15.5"></path>
            </svg>
          </button>

          <button 
            class={`titlebar-btn control-btn titlebar-btn-narrow ${showSettings() ? 'active' : ''}`} 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={() => {
              const next = !showSettings();
              setShowSettings(next);
              if (next) { setHistoryOpen(false); setClipboardOpen(false); setTodoOpen(false); setShortcutsOpen(false); setShowPreview(false); }
            }} 
            title={t("settings")}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          <button class="titlebar-btn control-btn titlebar-btn-narrow" onMouseDown={(e) => e.stopPropagation()} onClick={minimizeApp} title={t("minimize")}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <button class="titlebar-btn control-btn titlebar-btn-narrow" onMouseDown={(e) => e.stopPropagation()} onClick={toggleMaximize} title={isMaximized() ? t("restore") : t("maximize")}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="5" width="14" height="14" rx="1"></rect>
            </svg>
          </button>

          <button class="titlebar-btn control-btn titlebar-btn-narrow close" onMouseDown={(e) => e.stopPropagation()} onClick={closeApp} title={t("close")}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class={`toast-notification ${toastMessage() !== "" ? 'show' : ''}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        {toastMessage()}
      </div>

      <div class="glass-panel main-window">
        <div class="view-wrapper">
          <Editor />
          <Settings />
          <History />
          <Clipboard />
          <Todo />
          
        {/* Shortcuts Guide Panel */}
        <div class="view shortcuts-guide-view">
          <div class="view-header">
            <BackButton onClick={() => setShortcutsOpen(false)} />
            <div class="view-title">{t("shortcuts_title")}</div>
            <div style="width: 46px"></div>
          </div>
          <div class="shortcuts-content">
            <div class="shortcut-list">
              {/* High Priority & Custom Shortcuts */}
              <div class="shortcut-row">
                <span class="shortcut-key">{shortcuts.new_memo}</span>
                <span class="shortcut-desc">{t("sc_new")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">{shortcuts.save_copy}</span>
                <span class="shortcut-desc">{t("sc_save_hide")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">{shortcuts.show_hide}</span>
                <span class="shortcut-desc">{t("sc_save_reset")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">{shortcuts.toggle_history}</span>
                <span class="shortcut-desc">{t("sc_history")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">{shortcuts.toggle_templates}</span>
                <span class="shortcut-desc">{t("sc_clipboard")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">{shortcuts.toggle_todo}</span>
                <span class="shortcut-desc">{t("sc_todo")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">Esc</span>
                <span class="shortcut-desc">{t("sc_close_cancel")}</span>
              </div>

              <div class="shortcut-divider"></div>

              {/* Ctrl F / P */}
              <div class="shortcut-row">
                <span class="shortcut-key">Ctrl + F</span>
                <span class="shortcut-desc">{t("sc_search")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">Ctrl + P</span>
                <span class="shortcut-desc">{t("sc_preview")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">{shortcuts.toggle_theme}</span>
                <span class="shortcut-desc">{t("sc_toggle_theme")}</span>
              </div>

              <div class="shortcut-divider"></div>

              {/* Operations */}
              <div class="shortcut-row">
                <span class="shortcut-key">Enter</span>
                <span class="shortcut-desc">{t("sc_enter")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">Del</span>
                <span class="shortcut-desc">{t("sc_del")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">↑ ↓</span>
                <span class="shortcut-desc">{t("sc_arrows")}</span>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-key">Tab</span>
                <span class="shortcut-desc">{t("sc_tab")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
        
    <footer class="window-footer">
      <Show when={editingTemplateId()} fallback={
        <>
          <div class="status-bar-text">
            {stats().chars} {t("chars")} • {stats().linesCount} {t("lines")}
          </div>
          <div class="footer-actions">
            <button 
              class={`icon-btn help-trigger ${isShortcutsOpen() ? 'active' : ''}`}
              onClick={() => setShortcutsOpen(!isShortcutsOpen())}
              title={t("sc_help")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </button>
          </div>
        </>
      }>
        <div class="template-actions">
          <button class="template-btn cancel" onClick={cancelTemplateEdit}>{t("cancel")}</button>
          <button class="template-btn save" onClick={saveTemplate}>{t("save")}</button>
        </div>
        <div class="footer-actions">
          <button 
            class={`icon-btn help-trigger ${isShortcutsOpen() ? 'active' : ''}`}
            onClick={() => setShortcutsOpen(!isShortcutsOpen())}
            title="Keyboard Shortcuts"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </button>
        </div>
      </Show>
    </footer>
  </div>
  );
};

export default App;
