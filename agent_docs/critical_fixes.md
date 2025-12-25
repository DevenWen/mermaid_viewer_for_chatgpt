# Critical Fixes for PR #3 - Sidebar Feature

This document contains ready-to-apply code fixes for the critical and major issues identified in the code review.

---

## Fix #1: Event Listener Memory Leak (CRITICAL)

### Problem
The ESC key event listener is only removed when ESC is pressed, not when the sidebar closes via other means.

### Solution
Add cleanup in `closeSidebar()` function.

**File**: `src/contentScript/index.ts`
**Line**: ~336

```typescript
// Add this variable at module level
let escKeyHandler: ((e: KeyboardEvent) => void) | null = null

// Modify setupSidebarKeyHandler to store reference
function setupSidebarKeyHandler() {
  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSidebar()
      document.removeEventListener('keydown', handleEscKey)
      escKeyHandler = null
    }
  }
  escKeyHandler = handleEscKey
  document.addEventListener('keydown', handleEscKey)
}

// Modify closeSidebar to cleanup listener
function closeSidebar() {
  if (!currentSidebar) {
    return
  }

  const sidebar = currentSidebar
  sidebar.classList.remove('active')

  // Remove ESC key listener when sidebar closes
  if (escKeyHandler) {
    document.removeEventListener('keydown', escKeyHandler)
    escKeyHandler = null
  }

  // Remove after animation completes
  setTimeout(() => {
    if (sidebar.parentNode) {
      sidebar.parentNode.removeChild(sidebar)
    }
    // Restore chart to original position if still in sidebar
    if (chartOriginalPosition && sidebarActiveChart) {
      restoreChartToOriginal()
    }
    console.log('Sidebar closed and removed from DOM')
  }, 300)
}
```

---

## Fix #2: Replace javascript:void(0) (CRITICAL)

### Problem
Using `javascript:void(0)` violates Content Security Policy on many sites.

### Solution 1: Use Button Elements (Recommended)

**File**: `src/contentScript/index.ts`
**Lines**: ~107-115

```typescript
// Replace this:
const sidebarButton = document.createElement('a')
sidebarButton.id = 'MoveToSidebar'
sidebarButton.textContent = '#Sidebar'
sidebarButton.href = 'javascript:void(0)'
sidebarButton.className = 'mermaid-render-button-sidebar'

// With this:
const sidebarButton = document.createElement('button')
sidebarButton.type = 'button'
sidebarButton.textContent = '#Sidebar'
sidebarButton.className = 'mermaid-render-button-sidebar'
```

Also update the renderButton:

**File**: `src/contentScript/index.ts`
**Lines**: ~98-102

```typescript
// Replace this:
const renderButton = document.createElement('a')
renderButton.id = 'RenderDigram'
renderButton.textContent = '#Diagram'
renderButton.href = 'javascript:void(0)'

// With this:
const renderButton = document.createElement('button')
renderButton.type = 'button'
renderButton.id = 'RenderDigram'
renderButton.textContent = '#Diagram'
```

### Solution 2: Prevent Default on Click (Alternative)

If you prefer to keep anchor tags:

```typescript
const sidebarButton = document.createElement('a')
sidebarButton.href = '#'
sidebarButton.textContent = '#Sidebar'
sidebarButton.className = 'mermaid-render-button-sidebar'
sidebarButton.addEventListener('click', (e) => {
  e.preventDefault()
  // ... existing handler code
})
```

---

## Fix #3: Input Validation (MAJOR)

### Problem
No validation of Mermaid code before rendering, risking DoS attacks.

### Solution
Add validation functions.

**File**: `src/contentScript/index.ts`
**Line**: ~65 (after isMermaidCode function)

```typescript
// Add validation constants
const MAX_MERMAID_CODE_SIZE = 50000 // 50KB limit

// Add validation function
function validateMermaidCode(codeContent: string): { valid: boolean; error?: string } {
  // Check if empty
  if (!codeContent || typeof codeContent !== 'string') {
    return { valid: false, error: 'Code content is empty or invalid' }
  }

  // Check size
  if (codeContent.length > MAX_MERMAID_CODE_SIZE) {
    return { valid: false, error: `Code is too large (${codeContent.length} bytes). Maximum allowed is ${MAX_MERMAID_CODE_SIZE} bytes.` }
  }

  // Check for suspicious patterns (basic DoS protection)
  const suspiciousPatterns = [
    /\(\s*\)\s*=>/, // Arrow functions
    /while\s*\(/,   // While loops
    /for\s*\(/,     // For loops
    /setTimeout/,   // Timers
    /setInterval/,  // Intervals
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(codeContent)) {
      return { valid: false, error: 'Code contains potentially unsafe patterns' }
    }
  }

  return { valid: true }
}

// Modify moveChartToSidebar to use validation
function moveChartToSidebar(codeContent: string, sourceElement: HTMLElement, sourceButton: HTMLElement, sourceContainer: HTMLElement) {
  const darkMode = isDarkMode()

  // Validate input
  const validation = validateMermaidCode(codeContent)
  if (!validation.valid) {
    console.error('Mermaid code validation failed:', validation.error)
    const contentArea = document.getElementById('mermaid-sidebar-content')
    if (contentArea) {
      contentArea.innerHTML = `<div class="mermaid-error${darkMode ? ' dark-mode' : ''}">Error: ${validation.error}</div>`
    }
    return
  }

  // Open sidebar if not already open
  if (!currentSidebar) {
    openSidebar()
  }

  // Get sidebar content area
  const contentArea = document.getElementById('mermaid-sidebar-content')
  if (!contentArea) {
    console.error('Sidebar content area not found')
    return
  }

  // Show loading
  contentArea.innerHTML = '<div class="mermaid-loading">Rendering chart...</div>'

  // Render the chart
  renderMermaidChartInModal(codeContent, darkMode)
    .then((chartContent) => {
      // Clear content area
      contentArea.innerHTML = ''

      // Create chart wrapper with return button
      const chartWrapper = document.createElement('div')
      chartWrapper.className = 'mermaid-sidebar-chart'
      chartWrapper.style.position = 'relative'

      // Create return button
      const returnButton = document.createElement('button')
      returnButton.className = 'mermaid-sidebar-return'
      returnButton.textContent = 'Return to Page'
      returnButton.type = 'button'
      returnButton.addEventListener('click', restoreChartToOriginal)

      // Add chart content and return button
      chartWrapper.appendChild(returnButton)
      chartWrapper.appendChild(chartContent)
      contentArea.appendChild(chartWrapper)

      // Store the active chart and original position
      sidebarActiveChart = chartWrapper
      chartOriginalPosition = {
        element: sourceElement,
        button: sourceButton,
        container: sourceContainer
      }

      // Update source position to show placeholder
      updateSourcePositionPlaceholder(sourceContainer, sourceButton)

      console.log('Chart moved to sidebar successfully')
    })
    .catch((error) => {
      console.error('Error rendering chart in sidebar:', error)
      contentArea.innerHTML = `<div class="mermaid-error${darkMode ? ' dark-mode' : ''}">Error rendering chart: ${(error as Error).message}</div>`
    })
}
```

---

## Fix #4: Proper TypeScript Types (MAJOR)

### Problem
Using `any` type bypasses TypeScript's type checking.

### Solution
Define proper interfaces.

**File**: `src/contentScript/index.ts`
**Line**: ~8 (after imports)

```typescript
// Define interface for extended properties
interface ExtendedHTMLElement extends HTMLElement {
  placeholderElement?: HTMLElement
}

// Modify updateSourcePositionPlaceholder
function updateSourcePositionPlaceholder(container: HTMLElement, button: HTMLElement) {
  // Hide the button
  button.style.display = 'none'

  // Create placeholder
  const placeholder = document.createElement('div')
  placeholder.className = 'mermaid-sidebar-chart-placeholder'
  placeholder.innerHTML = 'Chart moved to sidebar'
  placeholder.style.display = 'block'

  // Insert placeholder
  container.parentNode!.insertBefore(placeholder, container.nextSibling)

  // Store placeholder reference with proper typing
  const extendedContainer = container as ExtendedHTMLElement
  extendedContainer.placeholderElement = placeholder
}

// Modify restoreChartToOriginal
function restoreChartToOriginal() {
  if (!chartOriginalPosition || !sidebarActiveChart) {
    console.warn('No chart to restore or missing original position data')
    return
  }

  const { element, button, container } = chartOriginalPosition

  // Remove placeholder if it exists
  const extendedContainer = container as ExtendedHTMLElement
  if (extendedContainer.placeholderElement) {
    const placeholder = extendedContainer.placeholderElement
    if (placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder)
    }
    extendedContainer.placeholderElement = undefined
  }

  // Show the button again
  button.style.display = 'inline-block'

  // Clear sidebar
  if (currentSidebar) {
    const contentArea = document.getElementById('mermaid-sidebar-content')
    if (contentArea) {
      contentArea.innerHTML = ''
    }
  }

  // Reset state
  sidebarActiveChart = null
  chartOriginalPosition = null

  console.log('Chart restored to original position')
}
```

---

## Fix #5: Debounced Click Handlers (MAJOR)

### Problem
Rapid clicks on buttons can cause multiple renders.

### Solution
Add debouncing.

**File**: `src/contentScript/index.ts`
**Line**: ~160 (after state variables)

```typescript
// Add debounce helpers
let clickTimeout: NodeJS.Timeout | null = null
const CLICK_DEBOUNCE_DELAY = 300

function debounceClick(handler: () => void) {
  if (clickTimeout) {
    clearTimeout(clickTimeout)
  }
  clickTimeout = setTimeout(() => {
    handler()
    clickTimeout = null
  }, CLICK_DEBOUNCE_DELAY)
}

// Modify sidebar button click handler (line ~133)
sidebarButton.addEventListener('click', () => {
  debounceClick(() => {
    const codeContent = element.textContent || ''
    moveChartToSidebar(codeContent, element, renderButton, chartContainer)
  })
})

// Modify render button click handler (line ~126)
renderButton.addEventListener('click', () => {
  debounceClick(() => {
    const codeContent = element.textContent || ''
    renderMermaidChart(codeContent, chartContainer, darkMode, renderButton)
  })
})
```

---

## Fix #6: Reduce CSS !important Usage (MAJOR)

### Problem
Heavy use of `!important` causes styling conflicts.

### Solution
Use more specific selectors instead of `!important`.

**File**: `src/contentScript/mermaid-viewer.css`
**Lines**: Replace these patterns:

```css
/* Before (everywhere): */
.some-class {
  property: value !important;
}

/* After: */
.mermaid-sidebar .some-class {
  property: value;
}
```

Example fixes:

**Line 185-201**:
```css
/* Replace this: */
.mermaid-sidebar {
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  width: 400px !important;
  height: 100vh !important;
  /* ... */
}

/* With this: */
.mermaid-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background-color: #f8f9fa;
  border-left: 1px solid #ddd;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}
```

Continue this pattern throughout the CSS file, removing `!important` where possible.

---

## Testing the Fixes

After applying these fixes:

1. **Build the project**:
```bash
npm run build
```

2. **Check TypeScript**:
```bash
npx tsc --noEmit
```

3. **Test manually**:
   - Open `sidebar-test.html` in Chrome with extension loaded
   - Test all critical paths:
     - Open/close sidebar with close button
     - Open/close sidebar with ESC key
     - Click #Sidebar button rapidly
     - Try with very large Mermaid diagram
     - Check for console errors

---

## Quick Apply Script

If you want to apply all fixes at once, here's the order:

1. Fix #1: Event listener leak
2. Fix #2: Replace javascript:void(0)
3. Fix #3: Input validation
4. Fix #4: TypeScript types
5. Fix #5: Debouncing
6. Fix #6: CSS !important (partial, can be done incrementally)

**Estimated time**: 2-3 hours for all critical and major fixes.

---

## Post-Fix Verification Checklist

- [ ] No console errors in browser
- [ ] Sidebar opens/closes smoothly
- [ ] ESC key always removes event listener
- [ ] Rapid clicks don't cause multiple renders
- [ ] Large diagrams show error message
- [ ] TypeScript compilation clean
- [ ] Build completes successfully
- [ ] No CSP violations in console
- [ ] Memory usage stable (check with DevTools)

---

**Document Version**: 1.0
**Last Updated**: 2025-12-04
**Status**: Ready for Implementation
