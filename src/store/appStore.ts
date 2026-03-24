import { createSignal, createEffect, on, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import { Memo, MemoTemplate, Todo, saveData, loadData } from "../api/storage";
import { Locale, translations } from "../i18n/locales";

// Global Signals
const [text, setText] = createSignal("");
const [theme, setTheme] = createSignal<"light" | "dark" | "system" | "architect" | "architect_dark" | "botanist" | "coast" | "forest" | "ocean">("light");
const [opacity, setOpacity] = createSignal(100); // 初期値：完全に不透明 (100)
const [isHistoryOpen, setHistoryOpen] = createSignal(false);
const [isClipboardOpen, setClipboardOpen] = createSignal(false);
const [isTodoOpen, setTodoOpen] = createSignal(false);
const [isShortcutsOpen, setShortcutsOpen] = createSignal(false);
const [showPreview, setShowPreview] = createSignal(false);
const [isPinned, setPinned] = createSignal(false);
const [focusTrigger, setFocusTrigger] = createSignal(0);
const [visualLinesCount, setVisualLinesCount] = createSignal(1);
const [memos, setMemos] = createStore<Memo[]>([]);
const [templates, setTemplates] = createStore<MemoTemplate[]>([]);
const [todos, setTodos] = createStore<Todo[]>([]);
const [toastMessage, setToastMessage] = createSignal("");
const [activeMemoId, setActiveMemoId] = createSignal<string | null>(null);
const [isMaximized, setIsMaximized] = createSignal(false);
const [showSettings, setShowSettings] = createSignal(false);
const [language, setLanguage] = createSignal<Locale>("ja");
const [showSearch, setShowSearch] = createSignal(false);
const [focusSearchTrigger, setFocusSearchTrigger] = createSignal(0);
const [editingTemplateId, setEditingTemplateId] = createSignal<string | null>(null);
const [editingTemplateMeta, setEditingTemplateMeta] = createSignal<{ label: string, category: string }>({ label: "", category: "General" });
const [showNewMemoBtn, setShowNewMemoBtn] = createSignal(true);
const [showClipboardBtn, setShowClipboardBtn] = createSignal(false);
const [showHistoryBtn, setShowHistoryBtn] = createSignal(false);
const [showTodoBtn, setShowTodoBtn] = createSignal(false);
const [showPreviewBtn, setShowPreviewBtn] = createSignal(true);
const [isAutostart, setIsAutostart] = createSignal(false);
const [recordingKey, setRecordingKey] = createSignal<string | null>(null);
const [showGrid, setShowGrid] = createSignal(false);
const [isCommandMenuOpen, setIsCommandMenuOpen] = createSignal(false);
const [commandMenuQuery, setCommandMenuQuery] = createSignal("");
const [commandMenuPosition, setCommandMenuPosition] = createSignal({ x: 0, y: 0 });

const defaultShortcuts = {
  show_hide: "Ctrl+M",
  new_memo: "Ctrl+N",
  toggle_history: "Ctrl+K",
  toggle_templates: "Ctrl+L",
  toggle_todo: "Ctrl+J",
  toggle_preview: "Ctrl+P",
  toggle_search: "Ctrl+F",
  save_copy: "Ctrl+Enter"
};

const [shortcuts, setShortcuts] = createStore({ ...defaultShortcuts });

/**
 * i18n トランスレーション関数
 */
const t = (key: keyof typeof translations.ja) => {
  const currentLang = language();
  return translations[currentLang][key] || translations.en[key] || key;
};

const stats = createMemo(() => ({
  chars: text().length,
  linesCount: visualLinesCount()
}));

/**
 * トーストを表示する
 */
function showToast(msg: string) {
  setToastMessage(msg);
  setTimeout(() => setToastMessage(""), 2000);
}

/**
 * ピン留め優先でソートされたメモ一覧
 */
const sortedMemos = createMemo(() => {
  return [...memos].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
});

/**
 * 現在の状態を永続化する
 */
async function persistCurrentState() {
  await saveData({
    draft: text(),
    memos: [...memos],
    templates: [...templates],
    todos: [...todos],
    settings: {
      theme: theme(),
      opacity: opacity(),
      language: language(),
      showNewMemoBtn: showNewMemoBtn(),
      showClipboardBtn: showClipboardBtn(),
      showHistoryBtn: showHistoryBtn(),
      showTodoBtn: showTodoBtn(),
      showPreviewBtn: showPreviewBtn(),
      autostart: isAutostart(),
      showGrid: showGrid(),
      shortcuts: { ...shortcuts }
    }
  });
}

// Internal variable for draft suspension
const [draftSuspension, setDraftSuspension] = createSignal<{ text: string, memoId: string | null } | null>(null);

// -- ACTIONS --

const initializeStore = async () => {
  const savedData = await loadData();
  if (savedData) {
    if (savedData.memos) setMemos(savedData.memos);
    if (savedData.templates) setTemplates(savedData.templates);
    if (savedData.todos) setTodos(savedData.todos);
    if (savedData.draft !== undefined) setText(savedData.draft);
    if (savedData.settings?.theme) setTheme(savedData.settings.theme as any);
    if (savedData.settings?.opacity !== undefined) setOpacity(savedData.settings.opacity);
    if ((savedData.settings as any)?.language) setLanguage((savedData.settings as any).language);
    
    // Visibility Settings
    if (savedData.settings?.showNewMemoBtn !== undefined) setShowNewMemoBtn(savedData.settings.showNewMemoBtn);
    if (savedData.settings?.showClipboardBtn !== undefined) setShowClipboardBtn(savedData.settings.showClipboardBtn);
    if (savedData.settings?.showHistoryBtn !== undefined) setShowHistoryBtn(savedData.settings.showHistoryBtn);
    if (savedData.settings?.showTodoBtn !== undefined) setShowTodoBtn(savedData.settings.showTodoBtn);
    if (savedData.settings?.showPreviewBtn !== undefined) setShowPreviewBtn(savedData.settings.showPreviewBtn);
    if (savedData.settings?.autostart !== undefined) setIsAutostart(savedData.settings.autostart);
    if ((savedData.settings as any)?.showGrid !== undefined) setShowGrid((savedData.settings as any).showGrid);
    if (savedData.settings?.shortcuts) {
      setShortcuts({ ...defaultShortcuts, ...savedData.settings.shortcuts });
    }
    
    // Global shortcut registration
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("register_global_shortcut", { shortcutStr: shortcuts.show_hide.toLowerCase() });
    } catch (e) {
      console.error("Failed to register initial global shortcut:", e);
    }
  } else {
    const initialTemplates: MemoTemplate[] = [
      { id: "1", label: "挨拶", content: "お疲れ様です。よろしくお願いいたします。", category: "メール" },
      { id: "2", label: "TODOコメント", content: "// TODO: あとで実装する", category: "コーディング" },
      { id: "3", label: "デバッグ出力", content: "console.log('DEBUG:', );", category: "コーディング" },
    ];
    setTemplates(initialTemplates);
  }
};

const saveToHistory = async () => {
  const currentText = text().trim();
  if (currentText === "") return;

  const now = new Date().toISOString();
  if (activeMemoId()) {
    setMemos(
      m => m.id === activeMemoId(), 
      { 
        content: currentText, 
        updated_at: now
      }
    );
  } else {
    const newId = Date.now().toString();
    const newMemo: Memo = {
      id: newId, 
      content: currentText, 
      updated_at: now
    };
    setMemos([newMemo, ...memos].slice(0, 200));
    setActiveMemoId(newId);
  }

  await persistCurrentState();
};

const createNewMemo = async () => {
  if (text().trim() === "") {
    showToast(t("t_no_content"));
    return;
  }
  await saveToHistory();
  showToast(t("t_saved_history"));
  setText("");
  setActiveMemoId(null);
  setFocusTrigger(t => t + 1);
};

const deleteMemo = async (id: string) => {
  setMemos(memos.filter(m => m.id !== id));
  if (activeMemoId() === id) setActiveMemoId(null);
  await persistCurrentState();
  showToast(t("t_deleted") || "メモを削除しました");
};

const clearAllMemos = async () => {
  setMemos([]);
  setActiveMemoId(null);
  setText("");
  await persistCurrentState();
  showToast(t("t_all_deleted") || "すべてのメモを削除しました");
};

const startTemplateEdit = (template?: any) => {
  setDraftSuspension({ text: text(), memoId: activeMemoId() });
  if (template) {
    setEditingTemplateId(template.id);
    setEditingTemplateMeta({ label: template.label, category: template.category });
    setText(template.content);
  } else {
    setEditingTemplateId("new");
    setEditingTemplateMeta({ label: "", category: "" });
    setText("");
  }
  setClipboardOpen(false);
  setFocusTrigger(t => t + 1);
};

const cancelTemplateEdit = () => {
  setEditingTemplateId(null);
  const suspended = draftSuspension();
  if (suspended) {
    setText(suspended.text);
    setActiveMemoId(suspended.memoId);
    setDraftSuspension(null);
  } else {
    setText("");
  }
};

const saveTemplate = async () => {
  const meta = editingTemplateMeta();
  const content = text();
  const id = editingTemplateId();

  if (!meta.label.trim() || !content.trim()) {
    showToast("名前と内容は必須です");
    return;
  }

  let nextTemplates = [...templates];
  if (id === "new") {
    nextTemplates.push({ id: Date.now().toString(), label: meta.label, category: meta.category, content });
  } else {
    nextTemplates = nextTemplates.map(t => t.id === id ? { ...t, label: meta.label, category: meta.category, content } : t);
  }

  setTemplates(nextTemplates);
  setEditingTemplateId(null);
  
  const suspended = draftSuspension();
  if (suspended) {
    setText(suspended.text);
    setActiveMemoId(suspended.memoId);
    setDraftSuspension(null);
  } else {
    setText("");
  }
  
  await persistCurrentState();
  showToast("テンプレートを保存しました");
};

const deleteTemplate = async (id: string) => {
  const nextTemplates = templates.filter(t => t.id !== id);
  setTemplates(nextTemplates);
  await persistCurrentState();
  showToast("テンプレートを削除しました");
};

const updateShortcut = async (key: keyof typeof shortcuts, newValue: string) => {
  if (key === "show_hide") {
    const { invoke } = await import("@tauri-apps/api/core");
    try {
      await invoke("unregister_global_shortcut", { shortcutStr: shortcuts.show_hide.toLowerCase() });
    } catch (e) {
      console.warn("Could not unregister old shortcut:", e);
    }
    try {
      await invoke("register_global_shortcut", { shortcutStr: newValue.toLowerCase() });
    } catch (e) {
      showToast("そのキーは使用できません");
      return;
    }
  }
  
  setShortcuts(key, newValue);
  await persistCurrentState();
  showToast("ショートカットを更新しました");
};

const resetShortcuts = async () => {
  const { invoke } = await import("@tauri-apps/api/core");
  // Unregister current global
  try {
    await invoke("unregister_global_shortcut", { shortcutStr: shortcuts.show_hide.toLowerCase() });
  } catch (e) { console.warn(e); }

  setShortcuts(defaultShortcuts);

  // Register default global
  try {
    await invoke("register_global_shortcut", { shortcutStr: defaultShortcuts.show_hide.toLowerCase() });
  } catch (e) { console.error(e); }

  await persistCurrentState();
  showToast(t("sc_reset"));
};

// -- TODO ACTIONS --

const addTodo = async (text: string) => {
  if (!text.trim()) return;
  const newTodo: Todo = {
    id: Date.now().toString(),
    text: text.trim(),
    completed: false,
    created_at: Date.now()
  };
  setTodos([...todos, newTodo]);
  await persistCurrentState();
  showToast(t("t_todo_added"));
};

const toggleTodo = async (id: string) => {
  setTodos(t => t.id === id, "completed", c => !c);
  await persistCurrentState();
};

const isShortcutPressed = (shortcutStr: string, e: KeyboardEvent) => {
  const parts = shortcutStr.split("+").map(p => p.toLowerCase());
  const hasCtrl = parts.includes("ctrl");
  const hasShift = parts.includes("shift");
  const hasAlt = parts.includes("alt");
  const hasMeta = parts.includes("meta") || parts.includes("command");
  const mainKey = parts[parts.length - 1];

  const eCtrl = e.ctrlKey;
  const eShift = e.shiftKey;
  const eAlt = e.altKey;
  const eMeta = e.metaKey;
  const eKey = e.key.toLowerCase();
  const eCode = e.code.toLowerCase().replace("key", "");

  return (
    hasCtrl === eCtrl &&
    hasShift === eShift &&
    hasAlt === eAlt &&
    hasMeta === eMeta &&
    (eKey === mainKey || eCode === mainKey)
  );
};

const eventToShortcutString = (e: KeyboardEvent) => {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Meta");
  
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (!["Control", "Shift", "Alt", "Meta", "CapsLock"].includes(key)) {
    parts.push(key);
  }
  return parts.join("+");
};

const deleteTodo = async (id: string) => {
  setTodos(todos.filter(t => t.id !== id));
  await persistCurrentState();
  showToast(t("t_todo_deleted"));
};

const clearCompletedTodos = async () => {
  setTodos(todos.filter(t => !t.completed));
  await persistCurrentState();
  showToast(t("t_todo_cleared"));
};

/**
 * テンプレート内の変数を展開する
 */
const processTemplate = (content: string): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  
  return content
    .replace(/\[\[DATE\]\]/g, `${yyyy}/${mm}/${dd}`)
    .replace(/\[\[TIME\]\]/g, `${hh}:${min}`)
    .replace(/\[\[DATETIME\]\]/g, `${yyyy}/${mm}/${dd} ${hh}:${min}`);
};

const selectMemo = async (memo: any) => {
  // テンプレートの場合は変数を展開して適用
  const isTemplate = templates.some(t => t.id === memo.id);
  const finalContent = isTemplate ? processTemplate(memo.content) : memo.content;
  
  setText(finalContent);
  setActiveMemoId(memo.id);
  setHistoryOpen(false);
  setClipboardOpen(false);
  setFocusTrigger(t => t + 1);
};

const closeHistory = () => {
  setHistoryOpen(false);
  setFocusTrigger(t => t + 1);
};

const closeClipboard = () => {
  setClipboardOpen(false);
  setFocusTrigger(t => t + 1);
};

const closeTodo = () => {
  setTodoOpen(false);
  setFocusTrigger(t => t + 1);
};

const closeSettings = () => {
  setShowSettings(false);
};

const toggleSearch = () => {
  const next = !showSearch();
  setShowSearch(next);
  if (next) {
    setFocusSearchTrigger(t => t + 1);
  }
};

const closeSearch = () => {
  setShowSearch(false);
};

const hideAndResetApp = async () => {
  const currentText = text().trim();
  if (currentText !== "") {
    await saveToHistory();
  }
  // Reset for next time
  setText("");
  setActiveMemoId(null);
  setHistoryOpen(false);
  setClipboardOpen(false);
  setTodoOpen(false);
  setShowSettings(false);
  setShowPreview(false);
  
  const { hideWindow } = await import("../api/tauri");
  await hideWindow();
};

// -- AUTO-SAVE LOGIC --
let saveTimeout: any;
createEffect(on(text, (currentText) => {
  if (editingTemplateId()) return;
  const trimmed = currentText.trim();
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
      const now = new Date().toISOString();
      if (activeMemoId()) {
        setMemos(m => m.id === activeMemoId(), { 
          content: trimmed, 
          updated_at: now,
        });
      } else {
        const newId = Date.now().toString();
        const newMemo: Memo = {
          id: newId, 
          content: trimmed, 
          updated_at: now,
        };
        setMemos([newMemo, ...memos].slice(0, 100));
        setActiveMemoId(newId);
      }
    await persistCurrentState();
  }, 500);
}, { defer: true }));

// -- OPACITY AUTO-SAVE --
createEffect(on(opacity, async () => {
  await persistCurrentState();
}, { defer: true }));

// Exporting as a centralized store
export { 
  text, setText, isHistoryOpen, setHistoryOpen, 
  isClipboardOpen, setClipboardOpen,
  showPreview, setShowPreview,
  isPinned, setPinned, 
  focusTrigger, setFocusTrigger, memos, setMemos, 
  templates, setTemplates,
  todos, setTodos,
  toastMessage, showToast,
  theme, setTheme, isMaximized, setIsMaximized,
  showSettings, setShowSettings,
  isShortcutsOpen, setShortcutsOpen,
  opacity, setOpacity,
  visualLinesCount, setVisualLinesCount,
  closeHistory, closeClipboard, closeSettings,
  language, setLanguage, t,
  activeMemoId, setActiveMemoId,
  showGrid, setShowGrid,
  editingTemplateId, setEditingTemplateId,
  editingTemplateMeta, setEditingTemplateMeta,
  stats,
  initializeStore, saveToHistory, createNewMemo, deleteMemo,
  clearAllMemos, sortedMemos,
  startTemplateEdit, cancelTemplateEdit, saveTemplate, deleteTemplate, selectMemo,
  addTodo, toggleTodo, deleteTodo, clearCompletedTodos, isTodoOpen, setTodoOpen, closeTodo,
  isCommandMenuOpen, setIsCommandMenuOpen, commandMenuQuery, setCommandMenuQuery, commandMenuPosition, setCommandMenuPosition,
  showNewMemoBtn, setShowNewMemoBtn, showClipboardBtn, setShowClipboardBtn,
  showHistoryBtn, setShowHistoryBtn, showTodoBtn, setShowTodoBtn,
  showPreviewBtn, setShowPreviewBtn,
  isAutostart, setIsAutostart,
  recordingKey, setRecordingKey,
  shortcuts, setShortcuts, updateShortcut, resetShortcuts, isShortcutPressed, eventToShortcutString,
  hideAndResetApp,
  showSearch, setShowSearch, focusSearchTrigger, setFocusSearchTrigger,
  toggleSearch, closeSearch
};
