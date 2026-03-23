import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * ウィンドウを非表示にする（バックグラウンド待機）
 */
export async function hideWindow() {
  await invoke("hide_window");
}

/**
 * テキストをクリップボードにコピーする
 */
export async function copyToClipboard(text: string) {
  await writeText(text);
}
