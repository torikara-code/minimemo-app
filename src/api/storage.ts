import { LazyStore } from "@tauri-apps/plugin-store";

const store = new LazyStore("data.json");

export interface Memo {
  id: string;
  content: string;
  updated_at: number;
}

export interface MemoTemplate {
  id: string;
  label: string;
  content: string;
  category: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  created_at: number;
}

export interface AppData {
  draft: string;
  memos: Memo[];
  templates: MemoTemplate[];
  todos?: Todo[];
  settings: {
    theme: string;
    opacity: number;
    language: string;
    showNewMemoBtn?: boolean;
    showClipboardBtn?: boolean;
    showHistoryBtn?: boolean;
    showTodoBtn?: boolean;
    autostart?: boolean;
  };
}

/**
 * データを保存する
 */
export async function saveData(data: AppData) {
  await store.set("data", data);
  await store.save();
}

/**
 * データを読み込む
 */
export async function loadData(): Promise<AppData | null> {
  const data = await store.get<AppData>("data");
  return data ?? null;
}
