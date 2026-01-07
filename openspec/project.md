# Project Context

## Purpose
A Chrome extension designed to enhance the ChatGPT experience by automatically identifying and rendering Mermaid diagrams within chat conversations. It provides an interactive "#Diagram" button for code blocks with the `language-mermaid` class, allowing users to visualize diagrams directly in the browser.

## Tech Stack
- **Languages**: TypeScript, JavaScript (ES modules)
- **Frontend Framework**: React 18
- **Build Tool**: Vite with `@crxjs/vite-plugin` for Chrome Extension development
- **Diagramming Library**: Mermaid.js (v11+)
- **Styling**: Vanilla CSS, including support for ChatGPT's dark mode
- **Project Structure**: Based on `create-chrome-ext` template

## Project Conventions

### Code Style
- **Formatting**: Prettier is used for consistent formatting across `.tsx`, `.ts`, `.json`, `.css`, and `.md` files (`npm run fmt`).
- **Naming**: camelCase for variables and functions; PascalCase for React components.
- **Strictness**: TypeScript is used for type safety; `tsconfig.json` defines the compilation rules.

### Architecture Patterns
- **Manifest V3**: Compliant with the latest Chrome Extension standards.
- **Content Scripts**: `src/contentScript/index.ts` handles DOM observation (via `MutationObserver`) and injection of render buttons/containers into the ChatGPT UI.
- **Background Service Worker**: Facilitates background tasks (though currently lightweight).
- **Communication**: Uses standard Chrome Extension messaging/storage APIs where necessary.

### Testing Strategy
- **Manual Verification**: The project includes `dark-mode-test.html` and `intermediate-test.html` for local rendering and style validation.
- **No Automated Tests**: Currently, there are no unit or integration tests (e.g., Vitest/Jest) implemented.

### Git Workflow
- **Branching**: standard feature branching (implied).
- **Commits**: No strict commit message convention is currently enforced, but clear, descriptive messages are preferred.

## Domain Context
- **ChatGPT UI**: The extension relies on specific CSS selectors (e.g., `code.language-mermaid`) and DOM structures within the ChatGPT interface.
- **Mermaid Syntax**: Understanding Mermaid's varied diagram types (flowcharts, sequence diagrams, gantt, etc.) is essential for debugging rendering issues.

## Important Constraints
- **Manifest V3 Restrictions**: Must adhere to V3 security and architecture constraints (e.g., no remote code execution, service worker lifecycle).
- **DOM Dependencies**: Changes to ChatGPT's frontend layout may require updates to the content script's selectors.

## External Dependencies
- **Mermaid.js**: The core rendering engine.
- **ChatGPT**: The host platform for the extension.
- **Chrome APIs**: Utilizes `chrome.storage` and `chrome.sidePanel`.
