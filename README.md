# File Converter

**登録不要、インストール不要。ブラウザだけで完結する、最も安全なファイル変換ツール。**

File Converterは、プライバシーを最優先に設計されたWebベースのファイル変換ユーティリティです。
すべてのファイル処理は、WebAssembly (Wasm) 技術を使用して、ユーザーのブラウザ内（クライアントサイド）で実行されます。
ファイルが外部サーバーにアップロードされることは一切ないため、機密性の高いファイルでも安心して扱うことができます。

## ✨ 主な機能

### 🖼️ 画像変換 (Image Converter)
主要な画像フォーマット間の相互変換が可能です。
- **対応フォーマット**: PNG, JPEG, WEBP, BMP
- **PDF作成**: 画像をPDFに変換する機能も搭載

### 📏 画像リサイズ (Image Resizer)
画質を維持したまま、簡単に画像をリサイズできます。
- **指定方法**: ピクセル指定 (幅/高さ)、パーセンテージ指定 (50%, 200% 等)
- **機能**: アスペクト比の固定、一括処理

### 🎵 音楽変換 (Audio Converter)
音声ファイルのフォーマット変換を行います。FFmpeg.wasmを使用しています。
- **対応フォーマット**: MP3, WAV, OGG, AAC, M4A

### 🎬 動画変換 (Video Converter)
動画ファイルのフォーマット変換を行います。
- **対応フォーマット**: MP4, WEBM, AVI, MOV, MKV, GIF

## 🔒 特徴

-   **完全プライベート**: サーバーサイドでの処理は一切ありません。処理はすべてあなたのデバイス上で行われます。
-   **超高速**: アップロードやダウンロードの待ち時間がありません。
-   **一括変換**: 複数のファイルをドラッグ＆ドロップでまとめて変換し、ZIPファイルとしてダウンロードできます。

## 🛠️ 技術スタック

-   **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
-   **Core Libraries**:
    -   [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm): 動画・音声変換処理
    -   [JSZip](https://stuk.github.io/jszip/): 複数ファイルの圧縮
    -   [jsPDF](https://github.com/parallax/jsPDF): PDF生成

## 🚀 開発・実行方法

このプロジェクトは静的なHTML/JS/CSSで構成されていますが、`FFmpeg.wasm` のセキュリティ要件（`SharedArrayBuffer`）のため、適切に動作させるには特定のHTTPヘッダーが必要です。

1.  リポジトリをクローンします。
    ```bash
    git clone https://github.com/yourusername/Change-File-Format.git
    ```
2.  プロジェクトディレクトリに移動します。
    ```bash
    cd Change-File-Format
    ```
3.  以下のヘッダーを付与できるローカルサーバーで起動します。
    -   `Cross-Origin-Embedder-Policy: require-corp`
    -   `Cross-Origin-Opener-Policy: same-origin`

    例: `http-server` を使用する場合 (npm)
    ```bash
    npx http-server -p 8080 --cors -c-1 --ssl --cert path/to/cert --key path/to/key
    # または、適切なヘッダーを設定できる簡易サーバーを使用してください。
    ```

## 📄 ライセンス

[MIT License](LICENSE)
