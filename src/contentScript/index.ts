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
  logLevel: 3 // 0:Error, 1:Warn, 2:Info, 3:Debug
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
    return () => {}
  }

  // Reset zoom and pan state
  let zoomLevel = 1
  const minZoom = 0.5
  const maxZoom = 3
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
    ;(chartContainer as HTMLElement).style.cursor = 'grabbing'
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
      ;(chartContainer as HTMLElement).style.cursor = 'grab'
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
        codeContent
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

        resolve(chartContent)
      }).catch((error: unknown) => {
        console.error('Error rendering Mermaid chart:', error)
        reject(error)

        // Revert to original theme
        mermaid.mermaidAPI.updateSiteConfig({
          theme: originalTheme
        })
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
    chartContainer.innerHTML = `<div class="mermaid-error${darkMode ? ' dark-mode' : ''}">Error rendering chart: ${(error as Error).message}</div>`
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
