# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chrome extension that renders Mermaid diagrams directly within ChatGPT and other web pages. The extension detects `code.language-mermaid` blocks and injects render buttons to generate SVG diagrams.

**Technology Stack:**
- Chrome Extension (Manifest v3)
- Vite + React + TypeScript
- Mermaid.js for diagram rendering
- @crxjs/vite-plugin for building

## Development Commands

### Core Commands

```bash
# Start development server (http://0.0.0.0:3000)
npm run dev

# Build extension for production (outputs to build/)
npm run build

# Format code with Prettier
npm run fmt

# Build and create zip archive for Chrome Web Store
npm run zip
```

### Testing in Chrome

1. **Load unpacked extension:**
   - Open Chrome → More Tools → Extensions
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/` folder

2. **Debug popup:**
   - Navigate to `http://0.0.0.0:3000/popup.html`

3. **Debug options page:**
   - Navigate to `http://0.0.0.0:3000/options.html`

4. **Test on ChatGPT:**
   - Open ChatGPT in Chrome with extension loaded
   - Create a Mermaid code block with `\`\`\`mermaid`
   - Click the "#Diagram" render button to generate the chart

### Development Requirements

- Node.js >= 14.18.0
- Chrome browser with Developer Mode enabled

## Code Architecture

### Core Components

**Content Script (`src/contentScript/index.ts`)**
- Main functionality for detecting and rendering Mermaid diagrams
- Automatically finds `code.language-mermaid` elements on page load
- Injects render buttons (#Diagram) and chart containers
- Handles dark mode detection via CSS and media queries
- Uses MutationObserver to handle dynamically added content
- Integrates Mermaid library with configurable themes (default/dark)

**Content Script Styles (`src/contentScript/mermaid-viewer.css`)**
- Styles for render buttons, chart containers, close buttons
- Dark mode styling support
- SVG wrapper and responsive design

**Background Service Worker (`src/background/index.ts`)**
- Handles messages from popup and other extension components
- Currently manages count state messages

**Extension Manifest (`src/manifest.ts`)**
- Defines extension permissions, scripts, and pages
- Uses @crxjs/vite-plugin for Vite integration
- Configures content scripts to run on all websites
- Includes side panel, options, and new tab overrides

**Build Configuration (`vite.config.ts`)**
- Vite configuration with CRX plugin
- Sets output directory to `build/`
- Includes React plugin support

### Component Pages (React-based)

Located in `src/` subdirectories:
- `popup/`: Extension popup (counter app template)
- `options/`: Extension options page
- `newtab/`: New tab override page
- `devtools/`: DevTools panel page
- `sidepanel/`: Side panel page

Each component follows the pattern:
- `{Component}.tsx`: Main component logic
- `index.tsx`: Component entry point
- `{Component}.css`: Component-specific styles

### Key Files

- `package.json`: Dependencies and build scripts
- `tsconfig.json`: TypeScript configuration
- `.prettierrc`: Code formatting rules
- `dark-mode-test.html`: Test page for dark mode functionality
- `intermediate-test.html`: Test page for diagram rendering

## Extension Features

### Mermaid Rendering Flow

1. Content script initializes Mermaid library on page load
2. Scans for `code.language-mermaid` elements
3. For each element:
   - Creates a "#Diagram" render button
   - Creates a hidden chart container
   - Sets up click handler to render diagram
4. On button click:
   - Extracts Mermaid code from the element
   - Calls `mermaid.render()` with appropriate theme
   - Displays result in SVG format with close button
5. Supports dynamic content via MutationObserver

### Dark Mode Support

- Auto-detects dark mode via:
  - `body.dark` or `html.dark` class presence
  - Background color brightness calculation
  - `prefers-color-scheme: dark` media query
- Switches Mermaid theme between 'default' and 'dark'
- Provides CSS styling for dark mode rendering

### Permissions

- `sidePanel`: Enable side panel functionality
- `storage`: Store user preferences
- Content scripts run on all URLs (`http://*/*`, `https://*/*`)

## Development Notes

### No Test Suite

This project does not include automated tests. All testing is done manually through:
- Extension loading and interaction
- Test HTML files in root directory
- ChatGPT and other web pages

### Build Output

- Production builds output to `build/` directory
- Contains ready-to-install extension files
- `npm run zip` creates distribution archive

### Template Code

Some components (popup, background) contain template code from `create-chrome-ext` generator. The core Mermaid rendering functionality is in the content script and is production-ready.

## Common Development Tasks

### Modifying Diagram Appearance

Edit `src/contentScript/mermaid-viewer.css` to change:
- Button styling (`.mermaid-render-button`)
- Chart container layout (`.mermaid-chart-container`)
- Close button position and design (`.mermaid-close-button`)
- Dark mode colors

### Adjusting Mermaid Configuration

In `src/contentScript/index.ts`, modify the `mermaid.initialize()` call:
- `startOnLoad`: Whether to auto-render on page load
- `securityLevel`: 'loose' allows HTML in diagrams
- `theme`: Default theme ('default', 'dark', etc.)
- `logLevel`: Debug output level (0-3)

### Adding New Mermaid Themes

1. Configure theme in Mermaid initialization
2. Update CSS in `mermaid-viewer.css` for custom styling
3. Test across light and dark modes

### Debugging Content Script

- Check browser console for content script logs
- Look for "Found X mermaid code elements" messages
- Verify Mermaid library initialization
- Check for DOM mutations in dynamic content

## Important Considerations

- The extension works on any website with Mermaid code blocks
- ChatGPT is the primary target but not the only usage context
- Diagrams render as inline SVGs with responsive sizing
- Error handling displays user-friendly messages for invalid Mermaid syntax
- Performance: MutationObserver watches entire body - may need optimization for large pages