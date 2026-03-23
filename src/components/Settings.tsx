import { Component, createSignal, For, Show } from "solid-js";
import BackButton from "./BackButton";
import { 
  theme, setTheme, showToast, setShowSettings, opacity, setOpacity, language, setLanguage, t,
  showNewMemoBtn, setShowNewMemoBtn, showClipboardBtn, setShowClipboardBtn,
  showHistoryBtn, setShowHistoryBtn, showTodoBtn, setShowTodoBtn,
  isAutostart, setIsAutostart
} from "../store/appStore";

const Settings: Component = () => {
  const [isThemeOpen, setIsThemeOpen] = createSignal(false);
  const [isPosOpen, setIsPosOpen] = createSignal(false);
  const [isLangOpen, setIsLangOpen] = createSignal(false);
  const [pos, setPos] = createSignal('center');

  const themeOptions = [
    { value: 'light', label: t('theme_light'), icon: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42' },
    { value: 'dark', label: t('theme_dark'), icon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' },
    { value: 'system', label: t('theme_system'), icon: 'M2 20h20 M5 14V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9 M12 14v4' }
  ];

  const langOptions = [
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '简体中文' }
  ];

  const handleApplied = (msg: string) => {
    showToast(msg);
  };

  const currentThemeLabel = () => themeOptions.find(o => o.value === theme())?.label || t('theme');
  const posLabel = () => pos() === 'center' ? t('pos_center') : t('pos_cursor');
  const currentLangLabel = () => langOptions.find(o => o.value === language())?.label || 'Language';

  return (
    <div class="view settings-view">
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
                  <div class="dropdown-menu">
                    <For each={themeOptions}>
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
          <div class="setting-item">
            <div class="setting-label">{t("default_pos")}</div>
            <div class="setting-control">
              <div class="custom-dropdown">
                <div class="dropdown-trigger" onClick={() => setIsPosOpen(!isPosOpen())}>
                  {posLabel()}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style={{ transform: isPosOpen() ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <Show when={isPosOpen()}>
                  <div class="dropdown-menu">
                    <div class="dropdown-item" onClick={() => { setPos('center'); setIsPosOpen(false); handleApplied(t('pos_updated')); }}>{t('pos_center')}</div>
                    <div class="dropdown-item" onClick={() => { setPos('cursor'); setIsPosOpen(false); handleApplied(t('pos_updated')); }}>{t('pos_cursor')}</div>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="group-title">{t("language")}</div>
          <div class="setting-item">
            <div class="setting-label">{t("display_language")}</div>
            <div class="setting-control">
              <div class="custom-dropdown">
                <div class="dropdown-trigger" onClick={() => { setIsThemeOpen(false); setIsPosOpen(false); setIsLangOpen(!isLangOpen()); }}>
                  {currentLangLabel()}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style={{ transform: isLangOpen() ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <Show when={isLangOpen()}>
                  <div class="dropdown-menu">
                    <For each={langOptions}>
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
