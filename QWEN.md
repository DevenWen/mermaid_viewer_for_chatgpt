# Project Context for Qwen Code

## Project Overview

This is a Chrome Extension project named `mermaid_viewer_for_chatgpt`. It is built using Vite, React, and adheres to Manifest V3 standards. The extension's core functionality is likely related to viewing Mermaid diagrams, potentially within the context of ChatGPT, as suggested by its name. The project was initially generated using `create-chrome-ext`.

Key technologies:
- **Framework:** React (for UI components)
- **Build Tool:** Vite
- **Language:** TypeScript
- **Extension Standard:** Chrome Manifest V3
- **Package Manager:** npm

## Project Structure

The project follows a standard structure for a Vite/React Chrome extension:
- `src/`: Contains the main source code.
  - `background/`: Background script (`index.ts`).
  - `contentScript/`: Content script (`index.ts`).
  - `popup/`: Code for the extension's popup UI (`Popup.tsx`, `Popup.css`).
  - `options/`: Code for the extension's options page (`Options.tsx`, `Options.css`).
  - `newtab/`: Code for overriding the new tab page (`NewTab.tsx`, `NewTab.css`).
  - `devtools/`: Code for the extension's DevTools page (`DevTools.tsx`, `DevTools.css`).
  - `sidepanel/`: Code for the extension's side panel (`SidePanel.tsx`, `SidePanel.css`).
  - `manifest.ts`: Defines the Chrome extension manifest using `@crxjs/vite-plugin`.
- `public/`: Contains static assets like images (`logo-*.png`) and HTML entry points (`popup.html`, `options.html`, etc.).
- `build/`: Output directory for the built extension.
- Configuration files: `vite.config.ts`, `tsconfig.json`, `package.json`, etc.

## Building and Running

- **Install Dependencies:** `npm install`
- **Development Mode:**
  1. Run `npm run dev`.
  2. Load the unpacked extension from the `build` directory in Chrome's Developer Mode.
  3. Alternatively, access individual pages via the local development server (e.g., `http://0.0.0.0:3000/popup.html`).
- **Build for Production:** `npm run build`. The built extension will be in the `build` folder, ready for packaging or submission to the Chrome Web Store.
- **Packaging:** `npm run zip` (builds the extension and creates a zip archive).
- **Formatting:** `npm run fmt` (uses Prettier).

## Development Conventions

- **Manifest Definition:** The Chrome extension manifest is defined programmatically in `src/manifest.ts` using TypeScript. This allows for dynamic configuration based on the environment (development/production).
- **UI Development:** UI components are built with React and TypeScript (`.tsx` files). Styling is done with separate CSS files.
- **Messaging:** The extension uses `chrome.runtime.sendMessage` and `chrome.runtime.onMessage` for communication between different parts (e.g., popup to background).
- **Storage:** `chrome.storage.sync` is used to persist data like the counter value.
- **Entry Points:** HTML files in the `public` directory serve as entry points for different extension pages (popup, options, new tab, etc.).