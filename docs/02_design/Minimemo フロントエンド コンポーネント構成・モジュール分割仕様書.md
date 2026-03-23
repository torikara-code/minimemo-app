# ■ Minimemo フロントエンド コンポーネント構成・仕様書（SolidJS版）

SolidJS を採用し、仮想DOMを使わずにDOMを直接更新することで、超軽量かつ爆速なタイピング体験を実現します。状態管理には SolidJS のリアクティブシステムを活用し、コンポーネント間の疎結合を維持します。

---

## 1. ディレクトリ・ファイル構成

```text
src/
 ├── index.tsx            # マウントポイント
 ├── App.tsx              # ルートコンポーネント（レイアウト・グローバルイベント監視）
 ├── style.css            # LiquidGlass UIスタイル
 │
 ├── components/
 │    ├── Editor.tsx      # 入力エリア・Markdownハイライト
 │    ├── History.tsx     # 履歴リスト（スライドダウン表示）
 │    ├── StatusBar.tsx   # 下部統計情報（文字数・行数）
 │    └── Toast.tsx       # 通知表示
 │
 ├── store/
 │    └── appStore.ts     # グローバル状態（Signal / Store）管理
 │
 └── api/
      ├── tauri.ts        # window制御などの invoke ラップ
      └── storage.ts      # tauri-plugin-store の操作ラップ
```

---

## 2. 状態管理（`store/appStore.ts`）

`createSignal` または `createStore` を使用して、アプリ全体のソース・オブ・トゥルース（信頼できる情報源）を構築します。これにより、以前必要だった「EventBus」は不要になります。

| 状態名 | 型 | 説明 |
| :--- | :--- | :--- |
| `text` | `Accessor<string>` | 現在入力中のテキスト。全ての計算の基点となる。 |
| `isHistoryOpen`| `Accessor<boolean>`| 履歴パネルの開閉状態。 |
| `memos` | `Store<Memo[]>` | 履歴データの配列。 |
| `toast` | `Accessor<string>` | 現在表示中のトーストメッセージ。 |

---

## 3. 各コンポーネントの仕様

### 3.1 Editor (`components/Editor.tsx`)
メインのエディタ。背後に Markdown ハイライト用のレイヤーを持ちます。

* **特徴:**
    * `text()` シグナルを購読し、ハイライトレイヤーをリアクティブに更新。
    * `textarea` の `onInput` で直接 `setText()` を叩く。
    * `onKeyDown` で `Ctrl+K`, `Esc`, `Ctrl+Enter` を検知する。
* **Markdownハイライト:**
    * 文字入力のたびに正規表現で HTML 文字列を生成し、`div` に `innerHTML`（または SolidJS の要素生成）で流し込む。
    * テキストエリアとハイライトレイヤーのフォント・余白を完全に一致させ、透過させることで重ね合わせる。

### 3.2 History (`components/History.tsx`)
履歴リストを表示するコンポーネント。

* **特徴:**
    * `isHistoryOpen()` が true の時に表示。
    * `memos` ストアを `for` ループでレンダリング。
    * キーボードの `ArrowUp/Down` での選択状態（Active Item）も内部シグナルで管理。
    * 選択確定時に `setText(selectedContent)` を行い、履歴を閉じる。

### 3.3 StatusBar (`components/StatusBar.tsx`)
* **特徴:**
    * `text()` の長さを監視し、文字数と行数（`text().split('\n').length`）をリアルタイム表示。

### 3.4 Toast (`components/Toast.tsx`)
* **特徴:**
    * `toast()` シグナルに値が入った時にアニメーション付きで出現。
    * `createEffect` 内で `setTimeout` を管理し、自動でシグナルを空にする。

---

## 4. データフローの原則

1. **一方向データフロー:**
   ユーザー操作 → Signal更新 → DOMへの直接反映（SolidJSの細粒度更新）。
2. **副作用（Effects）の活用:**
   `createEffect` を利用して、`text` が変更された 1 秒後に自動的に `storage.save()` を実行するなどの永続化ロジックを記述する。
3. **Rust連携:**
   ウィンドウの非表示（`hide_window`）などは `onCleanup` や特定のショートカットイベント時に `api/tauri.ts` 経由で実行する。
