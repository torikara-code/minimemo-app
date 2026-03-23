import { createSignal, createEffect, on, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import { Memo, MemoTemplate, Todo, saveData, loadData } from "../api/storage";
import { Locale, translations } from "../i18n/locales";

// Global Signals
const [text, setText] = createSignal("");
const [theme, setTheme] = createSignal<"light" | "dark" | "system">("light");
const [opacity, setOpacity] = createSignal(100); // 初期値：完全に不透明 (100)
const [isHistoryOpen, setHistoryOpen] = createSignal(false);
const [isClipboardOpen, setClipboardOpen] = createSignal(false);
const [isTodoOpen, setTodoOpen] = createSignal(false);
const [isShortcutsOpen, setShortcutsOpen] = createSignal(false);
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
const [editingTemplateId, setEditingTemplateId] = createSignal<string | null>(null);
const [editingTemplateMeta, setEditingTemplateMeta] = createSignal<{ label: string, category: string }>({ label: "", category: "General" });
const [showNewMemoBtn, setShowNewMemoBtn] = createSignal(true);
const [showClipboardBtn, setShowClipboardBtn] = createSignal(true);
const [showHistoryBtn, setShowHistoryBtn] = createSignal(true);
const [showTodoBtn, setShowTodoBtn] = createSignal(true);
const [isAutostart, setIsAutostart] = createSignal(false);

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
      autostart: isAutostart()
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
    if (savedData.settings?.autostart !== undefined) setIsAutostart(savedData.settings.autostart);
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

  const now = Date.now();
  const memoId = activeMemoId();
  
  let nextMemos;
  if (memoId) {
    const otherMemos = memos.filter(m => m.id !== memoId);
    nextMemos = [{ id: memoId, content: currentText, updated_at: now }, ...otherMemos].slice(0, 200);
  } else {
    const newId = now.toString();
    nextMemos = [{ id: newId, content: currentText, updated_at: now }, ...memos].slice(0, 200);
    setActiveMemoId(newId);
  }

  setMemos(nextMemos);
  await persistCurrentState();
};

const createNewMemo = async () => {
  if (text().trim() !== "") {
    await saveToHistory();
    showToast("現在の内容を履歴に保存しました");
  }
  setText("");
  setActiveMemoId(null);
  setFocusTrigger(t => t + 1);
};

const deleteMemo = async (id: string) => {
  const nextMemos = memos.filter(m => m.id !== id);
  setMemos(nextMemos);
  if (activeMemoId() === id) setActiveMemoId(null);
  await persistCurrentState();
  showToast("メモを削除しました");
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

const hideAndResetApp = async () => {
  const currentText = text().trim();
  if (currentText !== "") {
    await saveToHistory();
  }
  // Reset for next time
  setText("");
  setActiveMemoId(null);
  
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
    let nextMemos = [...memos];
    const memoId = activeMemoId();
    const now = Date.now();

    if (trimmed !== "") {
      if (memoId) {
        const otherMemos = nextMemos.filter(m => m.id !== memoId);
        nextMemos = [{ id: memoId, content: trimmed, updated_at: now }, ...otherMemos].slice(0, 100);
      } else {
        const newId = now.toString();
        nextMemos = [{ id: newId, content: trimmed, updated_at: now }, ...nextMemos].slice(0, 100);
        setActiveMemoId(newId);
      }
      setMemos(nextMemos);
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
  editingTemplateId, setEditingTemplateId,
  editingTemplateMeta, setEditingTemplateMeta,
  stats,
  initializeStore, saveToHistory, createNewMemo, deleteMemo,
  startTemplateEdit, cancelTemplateEdit, saveTemplate, deleteTemplate, selectMemo,
  addTodo, toggleTodo, deleteTodo, clearCompletedTodos, isTodoOpen, setTodoOpen, closeTodo,
  showNewMemoBtn, setShowNewMemoBtn, showClipboardBtn, setShowClipboardBtn,
  showHistoryBtn, setShowHistoryBtn, showTodoBtn, setShowTodoBtn,
  isAutostart, setIsAutostart,
  hideAndResetApp
};
