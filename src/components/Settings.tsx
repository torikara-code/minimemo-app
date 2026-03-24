import { Component, createSignal, For, Show, onCleanup, createMemo } from "solid-js";
import BackButton from "./BackButton";
import { 
  theme, setTheme, showToast, setShowSettings, opacity, setOpacity, language, setLanguage, t,
  showNewMemoBtn, setShowNewMemoBtn, showClipboardBtn, setShowClipboardBtn,
  showHistoryBtn, setShowHistoryBtn, showTodoBtn, setShowTodoBtn, showPreviewBtn, setShowPreviewBtn, showGrid, setShowGrid,
  isAutostart, setIsAutostart, shortcuts, updateShortcut, resetShortcuts, eventToShortcutString,
  recordingKey, setRecordingKey
} from "../store/appStore";

const ShortcutItem: Component<{ label: string, shortcutKey: keyof typeof shortcuts }> = (props) => {
  const isRecording = createMemo(() => recordingKey() === props.shortcutKey);
  const [recordedValue, setRecordedValue] = createSignal("");

  const startRecording = (e: MouseEvent) => {
    e.stopPropagation();
    setRecordingKey(props.shortcutKey);
    setRecordedValue(shortcuts[props.shortcutKey]);
    window.addEventListener("keydown", handleKeyDown);
  };

  const stopRecording = (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    const current = recordedValue();
    setRecordingKey(null);
    window.removeEventListener("keydown", handleKeyDown);
    if (current && current !== shortcuts[props.shortcutKey]) {
      updateShortcut(props.shortcutKey, current);
    }
  };

  const cancelRecording = (e: MouseEvent) => {
    e.stopPropagation();
    setRecordingKey(null);
    window.removeEventListener("keydown", handleKeyDown);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ignore pure modifier keys
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

    const newValue = eventToShortcutString(e);
    setRecordedValue(newValue);
  };

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div class="setting-item shortcut-setting">
      <div class="setting-label">{props.label}</div>
      <div class="setting-control">
        <Show 
          when={isRecording()} 
          fallback={
            <button class="shortcut-assign-btn" onClick={startRecording}>
              {shortcuts[props.shortcutKey] || t("sc_record_start")}
            </button>
          }
        >
          <div class="shortcut-recording-area">
            {/* Click-outside cancel overlay */}
            <div 
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                "z-index": 9998,
                background: "transparent"
              }}
              onClick={cancelRecording}
            />
            <div class="recording-value" style={{ "position": "relative", "z-index": 9999 }}>
              {recordedValue() || t("sc_recording")}
            </div>
            <button class="shortcut-save-btn" onClick={stopRecording} style={{ "position": "relative", "z-index": 9999 }}>
              {t("sc_record_stop")}
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};

const Settings: Component = () => {
  const [isThemeOpen, setIsThemeOpen] = createSignal(false);
  const [isLangOpen, setIsLangOpen] = createSignal(false);

  const themeOptions = createMemo(() => [
    { value: 'system', label: t('theme_system'), icon: "M20 16V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12m16 0a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2m16 0H4" },
    { value: 'light', label: t('theme_light'), icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" },
    { value: 'architect', label: t('theme_architect'), icon: "M3 3h18v18H3z M9 3v18 M15 3v18 M3 9h18 M3 15h18" },
    { value: 'dark', label: t('theme_dark'), icon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" },
    { value: 'architect_dark', label: t('theme_architect_dark'), icon: "M3 3h18v18H3z M9 3v18 M15 3v18 M3 9h18 M3 15h18", isDark: true },
    { value: 'botanist', label: t('theme_botanist'), icon: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z", isDark: true },
    { value: 'coast', label: t('theme_coast'), icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" },
    { value: 'forest', label: t('theme_forest'), icon: "M12 22v-5 M9 18l3-3 3 3 M8 15l4-4 4 4 M7 12l5-5 5 5" },
    { value: 'ocean', label: t('theme_ocean'), icon: "M2 12s3-1 7-1 7 2 13 2 M2 18s3-1 7-1 7 2 13 2", isDark: true }
  ]);

  const langOptions = createMemo(() => [
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '简体中文' }
  ]);

  const handleApplied = (msg: string) => {
    showToast(msg);
  };

  const currentThemeLabel = () => themeOptions().find(o => o.value === theme())?.label || t('theme');
  const isAnyDropdownOpen = () => isThemeOpen() || isLangOpen();
  const closeAllDropdowns = () => {
    setIsThemeOpen(false);
    setIsLangOpen(false);
  };
  
  const currentLangLabel = () => langOptions().find(o => o.value === language())?.label || 'Language';

  return (
    <div class="view settings-view">
      <Show when={isAnyDropdownOpen()}>
        <div 
          onClick={closeAllDropdowns}
          style={{
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            "z-index": 100,
            background: "transparent"
          }}
        />
      </Show>
      <div class="settings-header">
        <BackButton onClick={() => setShowSettings(false)} />
        <div class="settings-title">{t("settings")}</div>
        <div></div>
      </div>

      <div class="settings-content">
        <div class="setting-group">
          <div class="group-title">{t("appearance")}</div>
          <div class="setting-item">
            <div class="setting-label">{t("theme")}</div>
            <div class="setting-control">
              <div class="custom-dropdown">
                <div class="dropdown-trigger" onClick={() => setIsThemeOpen(!isThemeOpen())}>
                  {currentThemeLabel()}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style={{ transform: isThemeOpen() ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <Show when={isThemeOpen()}>
                  <div class="dropdown-menu" style={{ "z-index": 101 }}>
                    <For each={themeOptions()}>
                      {(opt) => (
                        <div 
                          class={`dropdown-item ${theme() === opt.value ? 'active' : ''}`}
                          onClick={() => {
                            setTheme(opt.value as any);
                            setIsThemeOpen(false);
                            handleApplied(t('theme_applied'));
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d={opt.icon} />
                          </svg>
                          {opt.label}
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">{t("setting_grid")}</div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" checked={showGrid()} onChange={(e) => setShowGrid(e.currentTarget.checked)} />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">{t("opacity")}</div>
            <div class="setting-control">
              <input 
                type="range" 
                class="custom-range" 
                min="0" max="100" step="1" 
                value={opacity()} 
                onInput={(e) => setOpacity(parseInt(e.currentTarget.value))}
                onChange={() => handleApplied(t("opacity_updated"))}
              />
              <span style={{ width: "28px", "text-align": "right", "font-size": "12px", color: "var(--accent)" }}>
                {opacity()}%
              </span>
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="group-title">{t("language")}</div>
          <div class="setting-item">
            <div class="setting-label">{t("display_language")}</div>
            <div class="setting-control">
              <div class="custom-dropdown">
                <div class="dropdown-trigger" onClick={() => { setIsThemeOpen(false); setIsLangOpen(!isLangOpen()); }}>
                  {currentLangLabel()}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style={{ transform: isLangOpen() ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <Show when={isLangOpen()}>
                  <div class="dropdown-menu" style={{ "z-index": 101 }}>
                    <For each={langOptions()}>
                      {(opt) => (
                        <div class={`dropdown-item ${language() === opt.value ? 'active' : ''}`} onClick={() => { setLanguage(opt.value as any); setIsLangOpen(false); handleApplied(t('lang_updated')); }}>{opt.label}</div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="group-title">{t("shortcut_settings")}</div>
          <ShortcutItem label={t("sc_save_reset")} shortcutKey="show_hide" />
          <ShortcutItem label={t("sc_new")} shortcutKey="new_memo" />
          <ShortcutItem label={t("sc_history")} shortcutKey="toggle_history" />
          <ShortcutItem label={t("sc_clipboard")} shortcutKey="toggle_templates" />
          <ShortcutItem label={t("sc_todo")} shortcutKey="toggle_todo" />
          <ShortcutItem label={t("sc_save_hide")} shortcutKey="save_copy" />
          <ShortcutItem label={t("sc_preview")} shortcutKey="toggle_preview" />
          
          <div class="setting-item" style={{ "margin-top": "8px", "justify-content": "center" }}>
            <button 
              class="shortcut-assign-btn" 
              style={{ "width": "100%", "color": "var(--text-secondary)", "border-style": "dashed" }}
              onClick={resetShortcuts}
            >
              {t("sc_reset")}
            </button>
          </div>
        </div>

        <div class="setting-group">
          <div class="group-title">{t("group_titlebar")}</div>
          <div class="setting-item">
            <div class="setting-label">{t("setting_show_new")}</div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" checked={showNewMemoBtn()} onChange={(e) => setShowNewMemoBtn(e.currentTarget.checked)} />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">{t("setting_show_clipboard")}</div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" checked={showClipboardBtn()} onChange={(e) => setShowClipboardBtn(e.currentTarget.checked)} />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">{t("setting_show_history")}</div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" checked={showHistoryBtn()} onChange={(e) => setShowHistoryBtn(e.currentTarget.checked)} />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">{t("setting_show_todo")}</div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" checked={showTodoBtn()} onChange={(e) => setShowTodoBtn(e.currentTarget.checked)} />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">{t("setting_show_preview")}</div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" checked={showPreviewBtn()} onChange={(e) => setShowPreviewBtn(e.currentTarget.checked)} />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="group-title">{t("system")}</div>
          <div class="setting-item">
            <div class="setting-label">{t("launch_at_login")}</div>
            <div class="setting-control">
              <label class="switch">
                <input 
                  type="checkbox" 
                  checked={isAutostart()} 
                  onChange={(e) => {
                    setIsAutostart(e.currentTarget.checked);
                    handleApplied(t("autolaunch_updated"));
                  }} 
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
