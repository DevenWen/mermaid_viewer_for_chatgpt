console.info('ContentScript is running')

// Import CSS for content script
import './mermaid-viewer.css'

// Import Mermaid directly
import mermaid from 'mermaid'

// Function to inject CSS into the page
function injectStyles() {
  // Check if styles are already injected
  if (document.getElementById('mermaid-viewer-styles')) {
    console.log('Mermaid viewer styles already injected')
    return
  }

  // Read CSS file content
  import('./mermaid-viewer.css?inline').then((cssModule) => {
    const cssContent = (cssModule as any).default || (cssModule as any)
    const style = document.createElement('style')
    style.id = 'mermaid-viewer-styles'
    style.textContent = cssContent
    document.head.appendChild(style)
    console.log('Mermaid viewer styles injected')
  }).catch((error) => {
    console.error('Failed to inject styles:', error)
  })
}

// Initialize Mermaid with proper configuration
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'default',
  logLevel: 3, // 0:Error, 1:Warn, 2:Info, 3:Debug
  suppressErrorRendering: true
})

console.log('Mermaid library loaded and initialized')

// Function to detect if the page is in dark mode
function isDarkMode() {
  // Check for dark mode class on body or html elements
  if (document.body.classList.contains('dark') ||
    document.documentElement.classList.contains('dark')) {
    return true
  }

  // Check for dark mode CSS variables
  const bodyStyles = window.getComputedStyle(document.body)
  const bgColor = bodyStyles.backgroundColor
  if (bgColor) {
    // Simple heuristic: if background is dark, assume dark mode
    const rgb = bgColor.match(/\d+/g)
    if (rgb) {
      const [r, g, b] = rgb.map(Number)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      return brightness < 128
    }
  }

  // Check for prefers-color-scheme media query
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Function to format Mermaid error for user-friendly display
function formatMermaidError(error: unknown): string {
  if (!error) {
    return 'Unknown error occurred'
  }

  // Extract error message
  let errorMessage = 'Rendering failed'

  if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  } else if (typeof error === 'object' && error !== null) {
    // Try to extract message from object
    const errorObj = error as any
    if (errorObj.message) {
      errorMessage = errorObj.message
    } else if (errorObj.str) {
      // Mermaid sometimes uses 'str' property
      errorMessage = errorObj.str
    } else {
      errorMessage = JSON.stringify(error)
    }
  }

  return errorMessage
}

// Function to cleanup Mermaid error divs created by the library
function cleanupMermaidErrorDivs() {
  try {
    // Mermaid creates error divs with specific patterns
    // We need to be careful not to remove our own elements

    // Find all divs in the document
    const allDivs = document.querySelectorAll('div')

    allDivs.forEach((div) => {
      // IMPORTANT: Skip our own elements to avoid removing modal/sidebar
      const classList = Array.from(div.classList)
      const isOurElement = classList.some(className =>
        className.startsWith('mermaid-modal') ||
        className.startsWith('mermaid-chart') ||
        className.startsWith('mermaid-error') ||
        className.startsWith('mermaid-loading') ||
        className.startsWith('mermaid-render') ||
        className.startsWith('mermaid-close') ||
        className.startsWith('mermaid-svg')
      )

      // Skip our own elements
      if (isOurElement) {
        return
      }

      // Also skip if this is a child of our modal
      const isInsideOurElements = div.closest('.mermaid-modal-overlay') !== null
      if (isInsideOurElements) {
        return
      }

      // Check if this is a Mermaid error div
      const id = div.id
      const textContent = div.textContent || ''

      // Pattern 1: ID matches 'd' + numbers and contains 'Syntax error' or 'mermaid version'
      // This is the most reliable pattern for Mermaid error divs
      const isMermaidErrorById = /^d\d+$/.test(id) &&
        (textContent.includes('Syntax error') ||
          textContent.includes('mermaid version'))

      // Pattern 2: Check for specific styling that Mermaid uses for error divs
      // Mermaid error divs are usually fixed position at bottom-left
      const styles = window.getComputedStyle(div)
      const hasFixedPosition = styles.position === 'fixed'
      const hasHighZIndex = parseInt(styles.zIndex) > 1000
      const isBottomLeft = styles.bottom !== 'auto' && styles.left !== 'auto'
      const isTopOrRightAuto = styles.top === 'auto' || styles.right === 'auto'
      const isMermaidErrorByStyle = hasFixedPosition && hasHighZIndex && isBottomLeft && isTopOrRightAuto &&
        (textContent.includes('Syntax error') || textContent.includes('mermaid version'))

      // Remove or hide if it matches patterns AND is not our element
      if (isMermaidErrorById || isMermaidErrorByStyle) {
        console.log('Cleaning up Mermaid error div:', id, textContent.substring(0, 50))
        // Set display to none instead of remove to be less destructive but effective
        div.style.display = 'none'
        div.style.opacity = '0'
        div.style.pointerEvents = 'none'
        div.setAttribute('aria-hidden', 'true')
      }
    })

    console.log('Mermaid error divs cleanup completed')
  } catch (error) {
    console.error('Error during Mermaid error div cleanup:', error)
  }
}

// Function to setup observer for Mermaid error divs
function setupMermaidErrorObserver() {
  // Create observer to watch for new error divs
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement

          // Check if this looks like a Mermaid error div
          if (element.tagName === 'DIV') {
            const id = element.id
            const textContent = element.textContent || ''

            // Pattern 1: ID matches 'd' + numbers (Mermaid standard)
            const isIdPattern = /^d\d+$/.test(id)

            // Pattern 2: Error text
            const hasErrorText = textContent.includes('Syntax error') ||
              textContent.includes('mermaid version')

            if ((isIdPattern && hasErrorText) || hasErrorText) {
              // Check it's not ours
              const classList = Array.from(element.classList)
              const isOurElement = classList.some(className =>
                className.startsWith('mermaid-')
              )

              if (!isOurElement) {
                // Double check style traits if unsure
                const styles = window.getComputedStyle(element)
                if (styles.position === 'fixed' || isIdPattern) {
                  console.log('Observer detected Mermaid error div, hiding:', id)
                  element.style.display = 'none'
                  element.style.opacity = '0'
                  element.style.pointerEvents = 'none'
                  element.setAttribute('aria-hidden', 'true')
                }
              }
            }
          }
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  console.log('Mermaid error observer setup')
}



// Function to detect if code content is Mermaid diagram
function isMermaidCode(codeText: string): boolean {
  // Remove leading/trailing whitespace
  const trimmed = codeText.trim()

  // Check for common Mermaid diagram keywords
  // These are the most common diagram types
  const mermaidKeywords = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
    'stateDiagram', 'erDiagram', 'journey', 'gitgraph',
    'mindmap', 'timeline', 'quadrantChart', 'xychart-beta'
  ]

  // Check if the first word (or first two words for 'flow chart') matches a Mermaid keyword
  const firstWordMatch = trimmed.match(/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gitgraph|mindmap|timeline|quadrantChart|xychart-beta)/)

  return firstWordMatch !== null
}

/**
 * Preprocess Mermaid code to fix common syntax issues
 * especially those common in AI-generated charts
 */
function preprocessMermaidCode(code: string): string {
  let processed = code.trim()

  // Fix for quadrantChart: AI often misses quotes in labels
  // Labels with special characters like / or ( ) need to be quoted
  if (processed.startsWith('quadrantChart')) {
    const lines = processed.split('\n')
    const updatedLines = lines.map(line => {
      const trimmedLine = line.trim()

      // 1. Quote title if missing
      if (trimmedLine.startsWith('title ') && !trimmedLine.startsWith('title "')) {
        const titleContent = trimmedLine.substring(6).trim()
        if (titleContent && !titleContent.startsWith('"')) {
          return `  title "${titleContent}"`
        }
      }

      // 2. Quote x-axis labels if missing
      if (trimmedLine.startsWith('x-axis ') && !trimmedLine.startsWith('x-axis "')) {
        const axisContent = trimmedLine.substring(7).trim()
        if (axisContent && !axisContent.startsWith('"')) {
          // Handle labels separated by -->
          if (axisContent.includes('-->')) {
            const parts = axisContent.split('-->').map(p => p.trim())
            return `  x-axis "${parts[0]}" --> "${parts[1]}"`
          }
          return `  x-axis "${axisContent}"`
        }
      }

      // 3. Quote y-axis labels if missing
      if (trimmedLine.startsWith('y-axis ') && !trimmedLine.startsWith('y-axis "')) {
        const axisContent = trimmedLine.substring(7).trim()
        if (axisContent && !axisContent.startsWith('"')) {
          // Handle labels separated by -->
          if (axisContent.includes('-->')) {
            const parts = axisContent.split('-->').map(p => p.trim())
            return `  y-axis "${parts[0]}" --> "${parts[1]}"`
          }
          // The label might be on the same line without -->
          return `  y-axis "${axisContent}"`
        }
      }

      // 4. Quote quadrant labels if missing
      const quadrantMatch = trimmedLine.match(/^quadrant-([1-4])\s+(.+)$/)
      if (quadrantMatch) {
        const num = quadrantMatch[1]
        const label = quadrantMatch[2].trim()
        if (label && !label.startsWith('"')) {
          return `  quadrant-${num} "${label}"`
        }
      }

      return line
    })
    processed = updatedLines.join('\n')
  }

  // Helper function to avoid repetition in logic
  function axisContent_fixed(line: string) { return line.startsWith('y-axis ') && line.includes('-->'); }

  return processed
}

// Function to create render button for mermaid code blocks
function createRenderButton(element: HTMLElement) {
  // Check if we've already processed this element
  if (element.hasAttribute('data-mermaid-processed')) {
    return
  }

  // Mark element as processed
  element.setAttribute('data-mermaid-processed', 'true')

  // Determine if we're in dark mode
  const darkMode = isDarkMode()

  // Create render button with link-like styling
  const renderButton = document.createElement('a')
  renderButton.id = 'RenderDigram'
  renderButton.textContent = '#Diagram'
  renderButton.href = 'javascript:void(0)'
  renderButton.className = 'mermaid-render-button'
  if (darkMode) {
    renderButton.classList.add('dark-mode')
  }

  // Create chart container (initially hidden)
  const chartContainer = document.createElement('div')
  chartContainer.className = 'mermaid-chart-container'
  if (darkMode) {
    chartContainer.classList.add('dark-mode')
  }
  chartContainer.innerHTML = '<div class="mermaid-loading">Click "Render" to generate diagram</div>'

  // Add event listener to render button - get fresh content on click
  renderButton.addEventListener('click', () => {
    // Get the current content of the code element
    const codeContent = element.textContent || ''
    renderMermaidChart(codeContent, chartContainer, darkMode, renderButton)
  })

  // Insert button and chart container after the code element
  // If the code element is inside a pre element, insert after the pre element
  // Otherwise insert after the code element directly
  const parentElement = element.parentElement
  if (parentElement && parentElement.tagName === 'PRE') {
    parentElement.parentNode!.insertBefore(renderButton, parentElement.nextSibling)
    parentElement.parentNode!.insertBefore(chartContainer, renderButton.nextSibling)
  } else {
    element.parentNode!.insertBefore(renderButton, element.nextSibling)
    element.parentNode!.insertBefore(chartContainer, renderButton.nextSibling)
  }

  console.log('Created render button for mermaid element')
}

// Global variable to track current modal state and cleanup functions
let currentModal: HTMLElement | null = null
let currentCleanup: (() => void) | null = null

// Function to setup zoom and pan functionality
// Returns a cleanup function to remove event listeners
function setupZoomPan(modal: HTMLElement): () => void {
  const chartContainer = modal.querySelector('.mermaid-modal-chart')
  const chartContent = modal.querySelector('.mermaid-modal-chart-content')

  if (!chartContainer || !chartContent) {
    console.warn('Chart container or content not found for zoom/pan setup')
    return () => { }
  }

  // Reset zoom and pan state
  let zoomLevel = 1
  const minZoom = 0.05
  const maxZoom = 20
  let panX = 0
  let panY = 0
  let isDragging = false
  let dragStartX = 0
  let dragStartY = 0

  // Initial transform reset
  updateTransform(chartContent as HTMLElement)

  // Handle wheel event for zooming
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Calculate zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoomLevel = zoomLevel * zoomFactor

    // Clamp zoom level
    if (newZoomLevel >= minZoom && newZoomLevel <= maxZoom) {
      zoomLevel = newZoomLevel
      updateTransform(chartContent as HTMLElement, zoomLevel, panX, panY)
      console.log('Zoom level:', zoomLevel)
    }
  }

  // Add wheel event listener to both container and content
  chartContainer.addEventListener('wheel', handleWheel, { passive: false })
  chartContent.addEventListener('wheel', handleWheel, { passive: false })

  // Handle mousedown for dragging
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return // Only left click
    e.preventDefault()
    isDragging = true
    dragStartX = e.clientX - panX
    dragStartY = e.clientY - panY
      ; (chartContainer as HTMLElement).style.cursor = 'grabbing'
  }

  chartContainer.addEventListener('mousedown', handleMouseDown)
  chartContent.addEventListener('mousedown', handleMouseDown)

  // Handle mousemove for dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()

    panX = e.clientX - dragStartX
    panY = e.clientY - dragStartY
    updateTransform(chartContent as HTMLElement, zoomLevel, panX, panY)
  }

  // Handle mouseup to stop dragging
  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false
        ; (chartContainer as HTMLElement).style.cursor = 'grab'
    }
  }

  // Add mousemove and mouseup to document
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  console.log('Zoom and pan setup complete')

  // Return cleanup function
  return () => {
    chartContainer.removeEventListener('wheel', handleWheel)
    chartContent.removeEventListener('wheel', handleWheel)
    chartContainer.removeEventListener('mousedown', handleMouseDown)
    chartContent.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    console.log('Zoom and pan event listeners cleaned up')
  }
}

// Function to update transform on chart content
function updateTransform(element: HTMLElement, zoom = 1, panX = 0, panY = 0) {
  element.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
}

// Function to create Mermaid modal
function createMermaidModal() {
  // Check if modal already exists
  if (currentModal) {
    return currentModal
  }

  // Create overlay
  const overlay = document.createElement('div')
  overlay.className = 'mermaid-modal-overlay'
  overlay.id = 'mermaid-modal-overlay'

  // Create container
  const container = document.createElement('div')
  container.className = 'mermaid-modal-container'

  // Create close button
  const closeButton = document.createElement('button')
  closeButton.className = 'mermaid-modal-close'
  closeButton.textContent = '#close'
  closeButton.setAttribute('aria-label', 'Close modal')

  // Create chart container
  const chartContainer = document.createElement('div')
  chartContainer.className = 'mermaid-modal-chart'

  // Assemble modal
  container.appendChild(closeButton)
  container.appendChild(chartContainer)
  overlay.appendChild(container)

  // Store reference
  currentModal = overlay

  console.log('Created mermaid modal')
  return overlay
}

// Function to render Mermaid chart in modal
function renderMermaidChartInModal(codeContent: string, darkMode: boolean): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    try {
      console.log('Rendering Mermaid chart in modal with content:', codeContent.substring(0, 100) + '...')

      // Temporarily set Mermaid theme based on dark mode
      const originalTheme = mermaid.mermaidAPI.getConfig().theme
      mermaid.mermaidAPI.updateSiteConfig({
        theme: darkMode ? 'dark' : 'default'
      })

      // Use Mermaid to render the chart
      mermaid.render(
        'mermaid-chart-' + Date.now(),
        preprocessMermaidCode(codeContent)
      ).then((renderResult: { svg: string }) => {
        // Create chart content wrapper
        const chartContent = document.createElement('div')
        chartContent.className = 'mermaid-modal-chart-content'

        // Add the SVG directly without wrapper box
        chartContent.innerHTML = renderResult.svg

        // Revert to original theme
        mermaid.mermaidAPI.updateSiteConfig({
          theme: originalTheme
        })

        // Clean up any Mermaid error divs after successful render
        setTimeout(() => cleanupMermaidErrorDivs(), 100)

        resolve(chartContent)
      }).catch((error: unknown) => {
        console.error('Error rendering Mermaid chart:', error)

        // Revert to original theme
        mermaid.mermaidAPI.updateSiteConfig({
          theme: originalTheme
        })

        // Clean up Mermaid error divs after error
        setTimeout(() => cleanupMermaidErrorDivs(), 100)

        reject(error)
      })
    } catch (error: unknown) {
      console.error('Error rendering Mermaid chart:', error)
      reject(error)
    }
  })
}

// Function to open Mermaid modal
async function openMermaidModal(codeContent: string, darkMode: boolean) {
  // Create modal if it doesn't exist
  const modal = createMermaidModal()

  // Find chart container
  const chartContainer = modal.querySelector('.mermaid-modal-chart')
  if (!chartContainer) {
    console.error('Chart container not found in modal')
    return
  }

  // Show loading message
  chartContainer.innerHTML = '<div class="mermaid-loading">Rendering chart...</div>'

  try {
    // Render the chart
    const chartContent = await renderMermaidChartInModal(codeContent, darkMode)

    // Clear and add the chart
    chartContainer.innerHTML = ''
    chartContainer.appendChild(chartContent)

    // Add modal to document
    document.body.appendChild(modal)

    // Trigger animation
    setTimeout(() => {
      modal.classList.add('active')
    }, 10)

    // Setup zoom and pan functionality
    const cleanup = setupZoomPan(modal)
    currentCleanup = cleanup

    // Setup event listeners
    setupModalEventListeners(modal)

    console.log('Modal opened successfully')
  } catch (error) {
    console.error('Error opening modal:', error)

    // Format the error message
    const errorMessage = formatMermaidError(error)

    // Display error in the container
    chartContainer.innerHTML = `<div class="mermaid-error${darkMode ? ' dark-mode' : ''}">Error rendering chart: ${errorMessage}</div>`

    // Add modal to document even on error so user can see it
    if (!modal.parentNode) {
      document.body.appendChild(modal)
    }

    // Trigger animation
    setTimeout(() => {
      modal.classList.add('active')
    }, 10)

    // Setup event listeners so user can close the modal
    setupModalEventListeners(modal)
  }
}

// Function to close Mermaid modal
function closeMermaidModal() {
  if (!currentModal) {
    return
  }

  const modal = currentModal
  modal.classList.remove('active')

  // Clean up event listeners
  if (currentCleanup) {
    currentCleanup()
    currentCleanup = null
  }

  // Remove after animation completes
  setTimeout(() => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal)
    }
    currentModal = null
    console.log('Modal closed and removed from DOM')
  }, 300)
}

// Function to setup modal event listeners
function setupModalEventListeners(modal: HTMLElement) {
  const closeButton = modal.querySelector('.mermaid-modal-close')
  const overlay = modal.querySelector('.mermaid-modal-overlay')
  const container = modal.querySelector('.mermaid-modal-container')

  // Close button click
  if (closeButton) {
    closeButton.addEventListener('click', closeMermaidModal)
  }

  // Overlay click (but not container click)
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeMermaidModal()
      }
    })
  }

  // ESC key press
  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeMermaidModal()
      document.removeEventListener('keydown', handleEscKey)
    }
  }
  document.addEventListener('keydown', handleEscKey)
}

// Function to render Mermaid chart (legacy function - keeping for compatibility)
function renderMermaidChart(codeContent: string, container: HTMLElement, darkMode: boolean, renderButton: HTMLElement) {
  // This function now opens a modal instead of rendering inline
  openMermaidModal(codeContent, darkMode)
}

// Function to process mermaid code elements
function processMermaidCodeElements() {
  console.log('Processing mermaid code elements...')

  // Get all potential code elements from both ChatGPT and Gemini
  const chatgptElements = document.querySelectorAll('code.language-mermaid')
  const geminiElements = document.querySelectorAll('code[data-test-id="code-content"]')

  // Combine all elements
  const allCodeElements: Element[] = []
  chatgptElements.forEach(el => allCodeElements.push(el))
  geminiElements.forEach(el => allCodeElements.push(el))

  console.log(`Found ${allCodeElements.length} potential mermaid code elements on the page`)

  // Process each potential mermaid code element
  allCodeElements.forEach((element, index) => {
    // Get the text content
    const codeContent = element.textContent || ''

    // Check if this is actually Mermaid code using content detection
    if (!isMermaidCode(codeContent)) {
      console.log(`Element ${index + 1} is not Mermaid code, skipping`)
      return
    }

    console.log(`Mermaid code element ${index + 1}: Setting up render button`)

    // Create render button for this element
    createRenderButton(element as HTMLElement)
  })
}

// Function to initialize the extension
function init() {
  console.log('Initializing extension...')

  // Inject styles into the page
  injectStyles()

  // Setup error observer
  setupMermaidErrorObserver()

  // Process elements when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM fully loaded')
      processMermaidCodeElements()
    })
  } else {
    console.log('DOM already ready')
    processMermaidCodeElements()
  }

  // Set up observer for dynamically added content
  const observer = new MutationObserver(() => {
    console.log('DOM changed, processing mermaid elements again')
    processMermaidCodeElements()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// Start the extension
init()
