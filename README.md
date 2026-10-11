# StructMark VS Code

![Version](https://img.shields.io/badge/version-1.6.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tech](https://img.shields.io/badge/stack-TypeScript-lightgrey)

[中文](#中文) | [English](#english)

---

## 中文

### 目錄

- [關於](#關於)
- [功能](#功能)
- [安裝](#安裝)
- [使用方式](#使用方式)
- [授權](#授權)

### 關於

StructMark VS Code 是 StructMark `.sm` 語言的獨立 VS Code 開發專案.

它把編輯器支援與語言核心分開, 讓 `.sm` 文件可以在 VS Code 中獲得語法著色、程式碼片段與 Language Server 功能. Language Server 目前提供診斷、補全、Hover、文件符號、Definition 與 References 等能力.

這個倉庫包含 Language Server 建置所需的 StructMark core source, 但不取代核心倉庫. 語言核心的主要來源與完整文件請見 [StructMark](https://github.com/oMiki0826o/StructMark).

目前版本是 `1.6.0` development source. 這不是已發布的 VSIX 套件.

### 功能

- `.sm` 語法著色
- StructMark 語言設定與括號匹配
- 常用 StructMark 語法 snippets
- Language Server 診斷
- Language Server 補全與 Hover
- 文件符號、Definition 與 References
- 可獨立建置與測試的 TypeScript source

### 安裝

需要 Node.js 22 或更新版本.

```bash
git clone https://github.com/oMiki0826o/StructMark-VSCode.git
cd StructMark-VSCode
npm ci
cd packages/language-server
npm ci
cd ../vscode
npm ci
```

目前倉庫提供開發原始碼. 正式 VSIX 打包與發布流程尚未完成, 因此不能直接把本倉庫視為已發布的 VS Code extension.

### 使用方式

執行核心測試與兩個套件的 TypeScript build:

```bash
cd StructMark-VSCode
npm test

cd packages/language-server
npm run build

cd ../vscode
npm run build
```

專案結構:

```text
packages/language-server/   Language Server
packages/vscode/             VS Code extension client and manifest
src/                         StructMark core source
tests/                       core and integration tests
.governance/                 AI Development Governance snapshot
```

推送前應完成上述測試與建置. 真實 VS Code 啟動、LSP JSON-RPC、VSIX 打包與跨平台驗證完成前, 不宣稱正式發布.

本專案依照 [AI Development Governance](https://github.com/oMiki0826o/AI-Development-Governance) 建立雙語治理文件. 治理規範快照位於 `.governance/`.

### 授權

本專案採用 MIT License 授權, 詳見 [LICENSE](./LICENSE).

---

## English

### Table of Contents

- [About](#about)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

### About

StructMark VS Code is an independent development repository for StructMark `.sm` language support in VS Code.

It keeps editor support separate from the language core and provides syntax highlighting, language configuration, snippets, and Language Server features. The Language Server currently includes diagnostics, completion, hover, document symbols, definition, and references.

This repository includes the StructMark core source required to build the Language Server. It does not replace the canonical core repository. See [StructMark](https://github.com/oMiki0826o/StructMark) for the language core and full documentation.

Version `1.6.0` is development source only. This repository is not a published VSIX.

### Features

- `.sm` syntax highlighting
- StructMark language configuration and bracket matching
- StructMark snippets
- Language Server diagnostics
- Language Server completion and hover
- Document symbols, definition, and references
- Independently buildable and testable TypeScript source

### Installation

Node.js 22 or newer is required.

```bash
git clone https://github.com/oMiki0826o/StructMark-VSCode.git
cd StructMark-VSCode
npm ci
cd packages/language-server
npm ci
cd ../vscode
npm ci
```

The repository currently provides development source. The production VSIX packaging and release workflow are not complete yet.

### Usage

Run the core tests and build both TypeScript packages:

```bash
cd StructMark-VSCode
npm test

cd packages/language-server
npm run build

cd ../vscode
npm run build
```

Do not describe the project as a released extension until real VS Code startup, LSP JSON-RPC, VSIX packaging, and cross-platform validation are complete.

The project follows the bilingual [AI Development Governance](https://github.com/oMiki0826o/AI-Development-Governance) snapshot stored under `.governance/`.

### License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
