---
description: Minimemoプロジェクト（Tauri v2.2 + SolidJS v1.9 + SolidStart）の基本アーキテクチャと設計原則。
globs: ["**/*"]
---

# Minimemo アーキテクチャ原則

Minimemoは「爆速」「超軽量」「思考を邪魔しない」を実現するため、Tauri v2.2 と SolidJS v1.9/SolidStart を核としたアーキテクチャを採用しています。

## 1. 基本理念
1. **0.2秒の応答性**: グローバルショートカットから起動までを極限まで速める。
2. **ランタイムコストの最小化**: 仮想DOMを使用しないSolidJSによる、細粒度（Fine-grained）な更新。
3. **Rustによるネイティブ制御**: OS固有の機能（常に最前面、透過、ショートカット、トレイ等）はRustで完結させる。
4. **JSONベースの軽量永続化**: SQLite等のオーバースペックなDBを避け、`tauri-plugin-store` を利用する。

## 2. 2層レイヤードアーキテクチャ
システムは以下の2つの明確なレイヤーに分離されます。

### フロントエンド・レイヤー (SolidJS / TypeScript)
- **役割**: UI描画、ユーザー入力監視、Markdownハイライト、UXアニメーション。
- **原則**: 
    - 仮想DOMを使わず、Signal (細粒度リアクティビティ) を直接DOMに結びつける。
    - ビジネスロジックの断片は `store` ディレクトリに集約し、コンポーネントは描画に集中させる。

### バックエンド・レイヤー (Tauri Core / Rust)
- **役割**: ウィンドウライフサイクル管理、OSネイティブAPI呼び出し、グローバルショートカット監視、データ永続化。
- **原則**: 
    - フロントエンドに公開する `tauri::command` は例外を許さず、`Result` 型でエラーを返却し、Rust側でパニックさせない。

## 3. 依存関係とデータフロー
- **一方向データフロー**: User Input → Signal更新 → (Effect) → IPC (invoke) → Rust (Store save)
- **依存の方向**: UI (SolidJS) から Rust への明示的な `invoke` のみが許可される。RustからUIへの通知は `Window::emit` やイベントフックを介する。

## 4. ディレクトリ構成規約
`src/` (Frontend) および `src-tauri/` (Backend) は以下の構成に従う。

### src/ 構成
- `components/`: 分割されたUIパーツ。Editor, History, Settings 等。
- `store/`: アプリ状態（Signals/Stores）。UIの状態はここで定義・管理。
- `api/`: Rust (`invoke`) や `tauri-plugin-store` へのラッパー。
- `styles/`: LiquidGlass スタイルを含む CSS ファイル。

### src-tauri/ 構成
- `main.rs`: アプリのエントリポイント、Tauriビルド、ウィンドウ初期化。
- `commands/`: フロントエンドから呼び出されるカスタム Rust コマンド（分割推奨）。
- `setup/`: アプリ起動時の初期設定、ホットキー登録、トレイ設定。

## 5. UI/UX 実装の黄金律 (Minimemo Specific)
- **LiquidGlass**: 背景は `backdrop-filter: blur(24px)` を基本とし、フロストガラス感を維持する。
- **Visual Mirroring**: エディタのハイライト層と入力層の幾何構造を完全に一致させ、1pxのズレも許さない。
- **Immediate Reflection**: 設定変更は「保存ボタン」を待たず、変更の瞬間に即時反映・保存される。

## 6. AI 動作指針
1. コンポーネント作成時は、ReactスタイルではなくSolidJSのリアクティブ・プリミティブ（Signal / CreateEffect）を活用せよ。
2. OSネイティブの機能追加が必要な場合は、まず `src-tauri/main.rs` または関連プラグインの適用を検討せよ。
3. パフォーマンスに直結するため、不要なグローバル状態の作成や、複雑すぎる正規表現パースを避け、シンプルな実装を優先せよ。

