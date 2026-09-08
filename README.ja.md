[English](README.md) / [日本語](README.ja.md)

---

# DotViewer

DotViewer は、ブラウザ上で Live2D Cubism モデルを表示・再生する Vite / TypeScript アプリケーションです。

モデルの切り替え、スクリプトによるモーションと音声の再生、キャンバス上でのモデル操作、全画面表示に対応しています。描画には Cubism Web Framework と Cubism Core を使用します。

モデルは `Dot/public/data` から読み込まれます。`model3.json` を含むモデルのディレクトリを追加した後、モデル一覧を再生成するため開発サーバーを再起動してください。

### スクリプト再生

スクリプトは `Dot/public/data/<group>/script` から読み込まれます。シーン切り替え、モーション、メッセージ、音声、背景動画、待機時間をスクリプトで制御できます。

* `l2dmotion` は通常のモーションレイヤーでモーションを直ちに再生します。
* `asyncl2dmotion,...,STOP,<秒数>` は独立したレイヤーでモーションを再生し、指定時間後に更新を停止します。停止時のパラメータ値は保持され、Reset モーションまで他のモーションに重なって適用されます。
* `message` は表示される文章の長さに応じて待機します。`l2dmessage` は音声を再生でき、既存の音声・読了タイミングを使用します。
* `（...）` または `(...)` で囲まれた文章は思考として扱われるため、リップシンクには使用しません。
* Reset モーションは一時的なモーションレイヤーを消去し、現在のシーンモーションに戻します。

ブラウザの開発者コンソールには、実行番号、コマンド名、アニメーション名、タイミング情報を含むスクリプト実行ログが出力されます。


## ライセンス

本 SDK を使用する前に、[ライセンス](LICENSE.md)をご確認ください。


## お知らせ

本 SDK を使用する前に、[お知らせ](NOTICE.ja.md)をご確認ください。


## Cubism 5.3新機能や過去バージョンとの互換性について

本 SDK はCubism 5.3に対応した製品です。  
Cubism 5.3 Editorに搭載された新機能のSDK対応については [こちら](https://docs.live2d.com/cubism-sdk-manual/cubism-5-3-new-functions/)をご確認ください。  
過去バージョンのCubism SDKとの互換性については [こちら](https://docs.live2d.com/cubism-sdk-manual/compatibility-with-cubism-5-3/)をご確認ください。

## ディレクトリ構成

```
.
├─ Core             # Live2D Cubism Core が含まれるディレクトリ
├─ Framework        # レンダリングやアニメーション機能などのソースコードが含まれるディレクトリ
└─ Dot
    ├─ public         # Core、シェーダー、モデルなどの公開リソース
    ├─ scripts        # モデル一覧生成スクリプト
    └─ src            # ビューアー、モデル、音声、スクリプトの処理
```


## Live2D Cubism Core for Web

モデルをロードするためのライブラリです。

当リポジトリではCubism Coreを管理していません。
[こちら](https://www.live2d.com/download/cubism-sdk/download-web/)からCubism SDK for Webをダウンロードして、
Coreディレクトリのファイルをコピーしてください。


## 開発環境構築

1. [Node.js](https://nodejs.org/) をインストールします。
1. ターミナルで `Dot` ディレクトリに移動し、依存関係をインストールします。

    ```sh
    npm install
    ```

1. 開発サーバーを起動します。

    ```sh
    npm run start
    ```

1. Vite が表示する URL（通常は `http://localhost:5173`）をブラウザで開きます。

本番ビルドは `Dot` ディレクトリで `npm run build` を実行します。

### プロジェクトのデバッグ

Visual Studio Code でプロジェクトを開き、実行中のビューアーをブラウザの開発者ツールでデバッグしてください。スクリプトの各コマンドはブラウザのコンソールに記録されます。


## SDKマニュアル

[Cubism SDK Manual](https://docs.live2d.com/cubism-sdk-manual/top/)


## 変更履歴

DotViewer : [CHANGELOG.md](CHANGELOG.md)

Framework : [CHANGELOG.md](Framework/CHANGELOG.md)

Core : [CHANGELOG.md](Core/CHANGELOG.md)


## 開発環境

### Node.js

* 25.8.2
* 24.14.1


## 動作確認環境

| プラットフォーム | ブラウザ | バージョン |
| --- | --- | --- |
| Android | Google Chrome | 145.0.7680.164 |
| Android | Microsoft Edge | 146.0.3856.71 |
| Android | Mozilla Firefox | 148.0.2 |
| iOS / iPadOS | Google Chrome | 147.0.7727.22 |
| iOS / iPadOS | Microsoft Edge | 146.0.3856.77 |
| iOS / iPadOS | Mozilla Firefox | 149.0 |
| iOS / iPadOS | Safari | 26.4 |
| macOS | Google Chrome | 146.0.7680.165 |
| macOS | Microsoft Edge | 146.0.3856.72 |
| macOS | Mozilla Firefox | 149.0 |
| macOS | Safari | 26.4 |
| Windows | Google Chrome | 146.0.7680.165 |
| Windows | Microsoft Edge | 146.0.3856.78 |
| Windows | Mozilla Firefox | 149.0 |

Note: 動作確認時は `Dot` ディレクトリで `npm run start` を実行してサーバーを起動します。


## プロジェクトへの貢献

プロジェクトに貢献する方法はたくさんあります。バグのログの記録、このGitHubでのプルリクエストの送信、Live2Dコミュニティでの問題の報告と提案の作成です。

### フォークとプルリクエスト

修正、改善、さらには新機能をもたらすかどうかにかかわらず、プルリクエストに感謝します。ただし、ラッパーは可能な限り軽量で浅くなるように設計されているため、バグ修正とメモリ/パフォーマンスの改善のみを行う必要があることに注意してください。メインリポジトリを可能な限りクリーンに保つために、必要に応じて個人用フォークと機能ブランチを作成してください。

### バグ

Live2Dコミュニティでは、問題のレポートと機能リクエストを定期的にチェックしています。バグレポートを提出する前に、Live2Dコミュニティで検索して、問題のレポートまたは機能リクエストがすでに投稿されているかどうかを確認してください。問題がすでに存在する場合は、関連するコメントを追記してください。

### 提案

SDKの将来についてのフィードバックにも関心があります。Live2Dコミュニティで提案や機能のリクエストを送信できます。このプロセスをより効果的にするために、それらをより明確に定義するのに役立つより多くの情報を含めるようお願いしています。


## フォーラム

ユーザー同士でCubism SDKの活用方法の提案や質問をしたい場合は、是非フォーラムをご活用ください。

- [Live2D 公式クリエイターズフォーラム](https://creatorsforum.live2d.com/)
- [Live2D Creator's Forum(English)](https://community.live2d.com/)
