[English](README.md) / [日本語](README.ja.md)

---

# DotViewer

DotViewer is a Vite and TypeScript web application for browsing and displaying Live2D Cubism models in the browser.

The viewer can switch between models, play scripted motions and voice audio, drag the model around the canvas, and enter fullscreen mode. It uses the Live2D Cubism Web Framework and Cubism Core for rendering.

Model files are loaded from `Dot/public/data`. Add a model directory containing a `model3.json` file there, then restart the development server so the model index can be regenerated.


## License

Please check the [license](LICENSE.md) before using this SDK.


## Notices

Please check the [notices](NOTICE.md) before using this SDK.


## Cubism compatibility

This project uses the Cubism Web Framework and is compatible with Cubism 5.3.
For details about Cubism 5.3 features, see the [Cubism SDK Manual](https://docs.live2d.com/en/cubism-sdk-manual/cubism-5-3-new-functions/).

## Project structure

```
.
├─ Core             # Live2D Cubism Core runtime
├─ Framework        # Cubism Web Framework source code
└─ Dot
    ├─ public         # Cubism Core, shaders, and model assets
    ├─ scripts        # Model index generation scripts
    └─ src            # Viewer, model, audio, and script logic
```


## Live2D Cubism Core for Web

A library for loading the model.

This repository does not manage Cubism Core.
Download the Cubism SDK for Web from [here](https://www.live2d.com/download/cubism-sdk/download-web/) and copy the files in the Core directory.


## Development setup

1. Install [Node.js](https://nodejs.org/).
1. Open a terminal in the `Dot` directory and install dependencies:

    ```sh
    npm install
    ```

1. Start the development server:

    ```sh
    npm run start
    ```

1. Open the URL printed by Vite, usually `http://localhost:5173`.

To create a production build, run `npm run build` from the `Dot` directory.

### Project debugging

Open the project in Visual Studio Code and use the browser developer tools to debug the running viewer.



## SDK manual

[Cubism SDK Manual](https://docs.live2d.com/cubism-sdk-manual/top/)


## Changelog

DotViewer : [CHANGELOG.md](CHANGELOG.md)

Framework : [CHANGELOG.md](Framework/CHANGELOG.md)

Core : [CHANGELOG.md](Core/CHANGELOG.md)


## Development environment

### Node.js

* 25.8.2
* 24.14.1


## Operation environment

| Platform | Browser | Version |
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

Note: You can start the server for operation check by running the `serve` script of `./Samples/TypeScript/Demo/package.json`.


## Contributing

There are many ways to contribute to the project: logging bugs, submitting pull requests on this GitHub, and reporting issues and making suggestions in Live2D Community.

### Forking And Pull Requests

We very much appreciate your pull requests, whether they bring fixes, improvements, or even new features. Note, however, that the wrapper is designed to be as lightweight and shallow as possible and should therefore only be subject to bug fixes and memory/performance improvements. To keep the main repository as clean as possible, create a personal fork and feature branches there as needed.

### Bugs

We are regularly checking issue-reports and feature requests at Live2D Community. Before filing a bug report, please do a search in Live2D Community to see if the issue-report or feature request has already been posted. If you find your issue already exists, make relevant comments and add your reaction.

### Suggestions

We're also interested in your feedback for the future of the SDK. You can submit a suggestion or feature request at Live2D Community. To make this process more effective, we're asking that you include more information to help define them more clearly.


## Forum

If you want to suggest or ask questions about how to use the Cubism SDK between users, please use the forum.

- [Live2D Creator's Forum](https://community.live2d.com/)
- [Live2D 公式クリエイターズフォーラム (Japanese)](https://creatorsforum.live2d.com/)
