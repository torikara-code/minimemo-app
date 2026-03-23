import { Component, onMount, createSignal, onCleanup, createEffect, Show } from "solid-js";
import Editor from "./components/Editor";
import History from "./components/History";
import Settings from "./components/Settings";
import Clipboard from "./components/Clipboard";
import Todo from "./components/Todo";
import {
  isHistoryOpen, setHistoryOpen, isClipboardOpen, setClipboardOpen,
  isTodoOpen, setTodoOpen, 
  isMaximized, setIsMaximized,
  isPinned, setPinned, setFocusTrigger, toastMessage, showToast,
  showSettings, setShowSettings,
  isShortcutsOpen, setShortcutsOpen,
  initializeStore, createNewMemo,
  startTemplateEdit, cancelTemplateEdit, saveTemplate, hideAndResetApp,
  theme, opacity, stats, editingTemplateId, t,
  showNewMemoBtn, showClipboardBtn, showHistoryBtn, showTodoBtn
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

  const handleGlobalKey = async (e: KeyboardEvent) => {
    resetActivity();

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
        e.preventDefault();
        e.stopImmediatePropagation();
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
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
    }

    // Ctrl+N to create new memo or new template
    if (e.ctrlKey && e.code === "KeyN") {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (isClipboardOpen()) {
        startTemplateEdit();
      } else {
        createNewMemo();
      }
    }

    // Ctrl+K to toggle History
    if (e.ctrlKey && e.code === "KeyK") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const nextState = !isHistoryOpen();
      setHistoryOpen(nextState);
      if (nextState) {
        setClipboardOpen(false);
        setTodoOpen(false);
        setShowSettings(false);
      } else {
        setFocusTrigger(t => t + 1);
      }
    }

    // Ctrl+L to toggle Clipboard
    if (e.ctrlKey && e.code === "KeyL") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const nextState = !isClipboardOpen();
      setClipboardOpen(nextState);
      if (nextState) {
        setHistoryOpen(false);
        setTodoOpen(false);
        setShowSettings(false);
      } else {
        setFocusTrigger(t => t + 1);
      }
    }

    // Ctrl+J to toggle Todo
    if (e.ctrlKey && e.code === "KeyJ") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const nextState = !isTodoOpen();
      setTodoOpen(nextState);
      if (nextState) {
        setHistoryOpen(false);
        setClipboardOpen(false);
        setShowSettings(false);
      } else {
        setFocusTrigger(t => t + 1);
      }
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
      hideAndResetApp();
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
    document.body.classList.remove("light-theme", "dark-theme", "system-theme", "liquid-glass-theme");
    document.body.classList.add(`${t}-theme`);
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
    showToast(t(next ? "t_pinned" : "t_unpinned"));
  };

  return (
    <div 
      class={`app-wrapper ${theme()}-theme ${showSettings() ? 'show-settings' : ''} ${isHistoryOpen() ? 'show-history' : ''} ${isClipboardOpen() ? 'show-clipboard' : ''} ${isTodoOpen() ? 'show-todo' : ''} ${isShortcutsOpen() ? 'show-shortcuts-guide' : ''} ${!isUserActive() ? 'ui-faded' : ''}`}
      style={{ 
        "--glass-bg-dynamic": `rgba(var(--bg-rgb), ${opacity() / 100})`
      }}
    >
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
                if (next) { setHistoryOpen(false); setTodoOpen(false); setShowSettings(false); }
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
                if (next) { setClipboardOpen(false); setTodoOpen(false); setShowSettings(false); }
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
                if (next) { setHistoryOpen(false); setClipboardOpen(false); setShowSettings(false); }
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
          <button
            class={`titlebar-btn control-btn ${isPinned() ? 'active' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={togglePin}
            title={isPinned() ? t("unpin") : t("pin")}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v2a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 10z"></path>
              <path d="M12 22V15.5"></path>
            </svg>
          </button>

          <button 
            class={`titlebar-btn control-btn ${showSettings() ? 'active' : ''}`} 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={() => {
              const next = !showSettings();
              setShowSettings(next);
              if (next) { setHistoryOpen(false); setClipboardOpen(false); setTodoOpen(false); setShortcutsOpen(false); }
            }} 
            title={t("settings")}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          <button class="titlebar-btn control-btn" onMouseDown={(e) => e.stopPropagation()} onClick={minimizeApp} title={t("minimize")}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <button class="titlebar-btn control-btn" onMouseDown={(e) => e.stopPropagation()} onClick={toggleMaximize} title={isMaximized() ? t("restore") : t("maximize")}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="5" width="14" height="14" rx="1"></rect>
            </svg>
          </button>

          <button class="titlebar-btn control-btn close" onMouseDown={(e) => e.stopPropagation()} onClick={closeApp} title={t("close")}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class={`toast-notification ${toastMessage() !== "" ? 'show' : ''}`} style={{ "pointer-events": "none", "top": "38px" }}>
        {toastMessage()}
      </div>

      <div class="glass-panel main-window">
        <div class="view-wrapper">
          <Editor />
          <Settings />
          <History />
          <Clipboard />
          <Todo />
          
          <div class="view shortcuts-guide-view">
            <div class="settings-header">
              <button class="back-btn" onClick={() => setShortcutsOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                {t("back")}
              </button>
              <div class="view-title">{t("shortcuts_title")}</div>
              <div style="width: 60px"></div>
            </div>
            <div class="shortcuts-content">
              <div class="shortcut-list">
                <div class="shortcut-row">
                  <span class="shortcut-key">Ctrl + N</span>
                  <span class="shortcut-desc">{t("sc_new")}</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-key">Ctrl + K</span>
                  <span class="shortcut-desc">{t("sc_history")}</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-key">Ctrl + L</span>
                  <span class="shortcut-desc">{t("sc_clipboard")}</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-key">Ctrl + J</span>
                  <span class="shortcut-desc">{t("sc_todo")}</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-key">Ctrl + Enter</span>
                  <span class="shortcut-desc">{t("sc_save_hide")}</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-key">Ctrl + M</span>
                  <span class="shortcut-desc">{t("sc_save_reset")}</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-key">Esc</span>
                  <span class="shortcut-desc">{t("sc_close_cancel")}</span>
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
    </div>
  );
};

export default App;
