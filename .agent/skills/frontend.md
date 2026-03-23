---
description: Minimemoプロジェクトのフロントエンド（SolidJS v1.9 / SolidStart SPA / TypeScript 5.6）における開発標準とUI実装ルール。
globs: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.css"]
---

# フロントエンド開発標準（SolidJS v1.9 + SolidStart）

Minimemoのフロントエンドは、仮想DOMを使わない極限のレスポンスと、洗練された LiquidGlass UI を実現します。

## 1. 役割の定義
- **UIレンダリング**: SolidJS による細粒度な DOM 更新。
- **入力監視**: Markdown 簡易ハイライトとオーバーレイ同期。
- **状態管理**: `src/store/` における Signal と Store の集約管理。
- **IPC連携**: `src/api/` を介した Rust 側の `invoke` 呼び出し。

## 2. SolidJS の活用原則
- **仮想DOMの排除**: `createSignal`, `createMemo`, `createEffect` を活用し、必要な箇所の DOM のみを更新する。
- **一方向データフロー**: Signal の更新を起点とし、副作用は `createEffect` 内で完結させる。
- **リアクティブ・ロギング**: コンポーネントの再レンダリングではなく、Signal の変化を監視してデバッグせよ。

## 3. LiquidGlass UI 設計
- **デザイン仕様**: `backdrop-filter: blur(24px)`, 半透明背景, 1pxのハイライトボーダー。
- **アニメーション**: 「Expo-Out」イージング (`cubic-bezier(0.16, 1, 0.3, 1)`) を多用し、0.25秒以内に完了させる。
- **ノイズレス**: 常に最小限の要素のみを表示し、余白を活かす。

## 4. エディタ実装の「3箇条」 (最重要)
エディタの入力層 (`textarea`) とハイライト層 (`div`) のズレを 0.1px 単位で排除せよ。
1. **Visual Mirroring**: フォント、余白、ボックスモデル、折り返しルールを完全に同一化。
2. **Scroll Locking**: `onScroll` イベントから `ref` を介してスクロール位置を直接同期。
3. **Trailing Newline Hack**: 改行で終わる場合に `&nbsp;` を挿入し、行数計算の不一致を回避。

## 5. 状態管理 (`store/appState.ts`)
- **集中管理**: アプリ全体のソース・オブ・トゥルース（text, memos, isHistoryOpen 等）は `store` に配置。
- **疎結合**: コンポーネントはストアの Signal を購読し、独自の副作用を持ちすぎない。
- **自動保存**: `text()` の変化をトリガーに、非同期で `storage.save()` を呼び出す。

## 6. エラーハンドリング
- **ユーザー優先**: 作業を妨げるダイアログは禁止。トースト通知またはステータスバーでの警告のみ。
- **非同期保護**: API呼び出しは `try...catch` で囲み、エラー時はサイレントにログを出しつつ、必要最小限のUIフィードバックを行う。

## 7. AI 動作指針
1. コンポーネントは ~200行以内の小さな単位に分割せよ（Editor, History, StatusBar, Toast）。
2. SolidStart (SPAモード) では `src/routes/` ではなく `src/App.tsx` を起点とするシンプルな SPA 構成を維持せよ。
3. `innerHTML` を使用してハイライトを更新する場合は、サニタイズを徹底し XSS を防げ。