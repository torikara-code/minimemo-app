# Minimemo

> **「思考の外部バッファ」 — 0秒で書き出し、即座に本来の作業へ戻るための超軽量テキストツール**

Minimemo（ミニメモ）は、作業中に浮かんだアイデアや断片的な情報を、思考のノイズを最小限に抑えて記録するためのデスクトップ常駐型メモアプリです。

![Minimemo Hero](https://via.placeholder.com/800x400?text=Minimemo+LiquidGlass+UI) *(ここにスクリーンショットやロゴが入ります)*

---

## ✨ 主な特徴

- 🚀 **圧倒的な起動速度**: グローバルホットキー（`Ctrl + M`）から 0.2 秒以内で入力開始。
- 🧊 **LiquidGlass UI**: 透明感のあるフロストガラス（`backdrop-filter`）デザイン。作業の邪魔をしないクリーンな外観。
- ⌨️ **キーボード完結**: 履歴の閲覧、コピー、削除まですべての操作をキーボードだけで完結。
- 💾 **安心の自動保存**: ウィンドウを閉じる瞬間に内容を JSON ファイルへ自動保存。
- 📝 **Markdown サポート**: 見出し、太字、リストなどの簡易ハイライトに対応。
- 📋 **クリップボード連携 & テンプレート**: よく使う定型文を保存・引用可能。

---

## 🛠 技術スタック

- **Backend**: [Tauri v2.2](https://tauri.app/) + [Rust](https://www.rust-lang.org/)
- **Frontend**: [SolidJS](https://www.solidjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS (LiquidGlass Design System)
- **State/Storage**: `tauri-plugin-store` (JSON-based KV Store)

---

## 📂 ディレクトリ構成

ドキュメント類は `docs/` 配下を用途別に整理しています。

```
minimemo-app/
├── src/                # Frontend (SolidJS, TypeScript)
│   ├── components/     # UIコンポーネント
│   ├── store/          # アプリケーション状態管理
│   └── i18n/           # 多言語対応 (日・英・中)
├── src-tauri/          # Backend (Rust, Tauri configuration)
├── docs/               # プロジェクトドキュメント
│   ├── 01_requirements/ # 要件定義・基本仕様
│   ├── 02_design/       # 設計書・UIデザイン
│   ├── 03_technical/    # 技術選定・共通基盤
│   └── 04_development/  # 開発手順・リファレンス
└── package.json        # 依存関係とビルドスクリプト
```

---

## 🚀 クイックスタート

### 開発環境の準備

事前に [Rust](https://www.rust-lang.org/tools/install) と [Node.js](https://nodejs.org/) がインストールされていることを確認してください。

### 実行手順

1. **パッケージのインストール**
   ```bash
   pnpm install
   ```

2. **開発モードで起動**
   ```bash
   pnpm tauri dev
   ```

3. **ビルド**
   ```bash
   pnpm tauri build
   ```

---

## ⌨️ キーボードショートカット

| キー | アクション |
| :--- | :--- |
| **`Ctrl + M`** | アプリの呼び出し / 保存してリセットして閉じる |
| **`Ctrl + Enter`** | 内容をコピーして閉じる |
| **`Ctrl + K`** | 履歴画面の表示 / 非表示 |
| **`Ctrl + L`** | クリップボード（定型文）表示 / 非表示 |
| **`Ctrl + N`** | 新規メモ作成 / 定型文作成 |
| **`Esc`** | 各種ビューを閉じる / アプリを閉じる |

---

## ⚙️ 設定とデータ

データは以下のパスに保存されます（OSにより異なります）。

- **Windows**: `%APPDATA%\Minimemo\data.json`
- **macOS**: `~/Library/Application Support/Minimemo/data.json`


