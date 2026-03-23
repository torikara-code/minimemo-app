// リリースビルド時にWindowsで余分なコンソールウィンドウが開くのを防ぐ（消さないでください）
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{GlobalShortcutManager, Manager};

// フロントエンド（JS）から Esc キーなどで呼び出される非表示コマンド
#[tauri::command]
fn hide_window(window: tauri::Window) {
    if window.is_visible().unwrap_or(false) {
        window.hide().unwrap();
    }
}

fn main() {
    tauri::Builder::default()
        // フロントエンドから呼び出せるコマンドを登録
        .invoke_handler(tauri::generate_handler![hide_window])
        .setup(|app| {
            // tauri.conf.json で定義した "main" ウィンドウのインスタンスを取得
            let window = app.get_window("main").unwrap();
            let mut shortcut_manager = app.global_shortcut_manager();

            // グローバルショートカットの登録
            // ※ macOSでは Cmd+M、Windowsでは Ctrl+M として機能するように "CommandOrControl+M" を使用します
            shortcut_manager
                .register("CommandOrControl+M", move || {
                    if window.is_visible().unwrap() {
                        // 表示されていれば隠す
                        window.hide().unwrap();
                    } else {
                        // 隠れていれば表示して、キーボードフォーカスを当てる
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                })
                .unwrap_or_else(|err| eprintln!("ショートカットの登録に失敗しました: {}", err));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Tauriアプリケーションの実行中にエラーが発生しました");
}
