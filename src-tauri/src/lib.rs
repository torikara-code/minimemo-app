use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

/// フロントエンドの初期描画完了後にウィンドウを表示するコマンド。
/// 白フラッシュ（Ghost flash）を防ぐために visible: false で起動し、
/// SolidJS 側の onMount 末尾から invoke して初めて表示する。
#[tauri::command]
fn show_ready_window(window: tauri::WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        if let Ok(hwnd) = window.hwnd() {
            apply_windows_glass(hwnd.0 as isize);
        }
    }
    window.show().unwrap();
    window.set_focus().unwrap();
}

#[tauri::command]
fn hide_window(window: tauri::WebviewWindow) {
    window.hide().unwrap();
}

#[tauri::command]
fn register_global_shortcut(app: tauri::AppHandle, shortcut_str: String) -> Result<(), String> {
    use std::str::FromStr;
    let shortcut = Shortcut::from_str(&shortcut_str).map_err(|e| e.to_string())?;
    
    app.global_shortcut().register(shortcut).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn unregister_global_shortcut(app: tauri::AppHandle, shortcut_str: String) -> Result<(), String> {
    use std::str::FromStr;
    let shortcut = Shortcut::from_str(&shortcut_str).map_err(|e| e.to_string())?;
    
    app.global_shortcut().unregister(shortcut).map_err(|e| e.to_string())?;
    Ok(())
}

/// Windows 固有: DWM 角丸 + Layered ウィンドウ透過設定を適用。
/// apply_acrylic の後ではなく「前」に呼ぶことで、DWM のボカシ領域と
/// CSS border-radius の境界を一致させる（Ghost corners の解消）。
#[cfg(target_os = "windows")]
fn apply_windows_glass(hwnd_raw: isize) {
    use windows::{
        Win32::Foundation::{COLORREF, HWND},
        Win32::Graphics::Dwm::{
            DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE,
        },
        Win32::UI::WindowsAndMessaging::{
            GetWindowLongPtrW, SetLayeredWindowAttributes, SetWindowLongPtrW, GWL_EXSTYLE,
            LWA_ALPHA, WS_EX_LAYERED,
        },
    };

    let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
    use windows::Win32::Graphics::Dwm::DWMWA_USE_IMMERSIVE_DARK_MODE;

    unsafe {
        // ① DWM 暗黒モードを強制有効（アクリルの白浮き防止に非常に有効）
        let is_dark: i32 = 1;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &is_dark as *const i32 as *const std::ffi::c_void,
            std::mem::size_of::<i32>() as u32,
        );

        // ② WS_EX_LAYERED を付与: WebView2 のデフォルト白背景を透過させる
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_LAYERED.0 as isize);
        // alpha=255 で完全不透明のまま Layered を有効化（CSS 側の透過を活かす）
        let _ = SetLayeredWindowAttributes(hwnd, COLORREF(0), 255, LWA_ALPHA);

        // ③ DWMWCP_DONOTROUND (=1): 独自角丸(CSS)を活かすためOS側の角丸を無効化
        let preference: u32 = 1; // DWMWCP_DONOTROUND
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &preference as *const u32 as *const std::ffi::c_void,
            std::mem::size_of::<u32>() as u32,
        );


    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let is_minimized = window.is_minimized().unwrap_or(false);
                            let is_visible = window.is_visible().unwrap_or(false);

                            if is_minimized {
                                // 最小化されている場合は復元してフォーカス
                                window.unminimize().unwrap();
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            } else if is_visible {
                                // 表示されている場合はフロントエンドにリセット終了を依頼
                                window.emit("request-hide-reset", ()).unwrap();
                            } else {
                                // 非表示の場合は再表示 + ガラス処理を再適用
                                #[cfg(target_os = "windows")]
                                if let Ok(hwnd) = window.hwnd() {
                                    apply_windows_glass(hwnd.0 as isize);
                                }
                                window.show().unwrap();
                                window.unminimize().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(move |app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                {
                    if let Ok(hwnd) = window.hwnd() {
                        // DWM 角丸 + Layered を適用（透過ウィンドウの基本）
                        apply_windows_glass(hwnd.0 as isize);
                    }
                }
            }

            // グローバルショートカットの初期登録はフロントエンド（Store）側で
            // 保存された設定に基づいて行う。

            // トレイアイコン設定
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).unwrap();
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&show_i, &quit_i]).unwrap();

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            #[cfg(target_os = "windows")]
                            if let Ok(hwnd) = window.hwnd() {
                                apply_windows_glass(hwnd.0 as isize);
                            }
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            #[cfg(target_os = "windows")]
                            if let Ok(hwnd) = window.hwnd() {
                                apply_windows_glass(hwnd.0 as isize);
                            }
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_window, 
            show_ready_window,
            register_global_shortcut,
            unregister_global_shortcut
        ])
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
