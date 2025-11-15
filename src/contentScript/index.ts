console.info('ContentScript is running')

// Import Mermaid directly
import mermaid from 'mermaid'

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

// Function to render Mermaid chart
function renderMermaidChart(codeContent: string, container: HTMLElement, darkMode: boolean, renderButton: HTMLElement) {
  // Show container and display loading message
  container.style.display = 'block'
  container.innerHTML = '<div class="mermaid-loading">Rendering chart...</div>'
  
  try {
    console.log('Rendering Mermaid chart with content:', codeContent.substring(0, 100) + '...')
    
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
      // Create a wrapper div for the SVG
      const svgWrapper = document.createElement('div')
      svgWrapper.className = 'mermaid-svg-wrapper'
      
      // Add the SVG
      svgWrapper.innerHTML = renderResult.svg
      
      // Apply responsive styling to the SVG
      const svgElement = svgWrapper.querySelector('svg')
      if (svgElement) {
        svgElement.style.maxWidth = '100%'
        svgElement.style.height = 'auto'
      }
      
      // Create close button
      const closeButton = document.createElement('button')
      closeButton.textContent = '#close'
      closeButton.className = 'mermaid-close-button'
      if (darkMode) {
        closeButton.classList.add('dark-mode')
      }
      
      // Add event listener to close button
      closeButton.addEventListener('click', () => {
        container.style.display = 'none'
        // Reset the container content for next render
        container.innerHTML = '<div class="mermaid-loading">Click "Render" to generate diagram</div>'
      })
      
      // Clear container and add elements
      container.innerHTML = ''
      container.appendChild(closeButton)
      container.appendChild(svgWrapper)
      
      // Revert to original theme
      mermaid.mermaidAPI.updateSiteConfig({
        theme: originalTheme
      })
      
      console.log('Chart rendered successfully')
    }).catch((error: unknown) => {
      console.error('Error rendering Mermaid chart:', error)
      container.innerHTML = `<div class="mermaid-error${darkMode ? ' dark-mode' : ''}">Error rendering chart: ${(error as Error).message}</div>`
      
      // Revert to original theme
      mermaid.mermaidAPI.updateSiteConfig({
        theme: originalTheme
      })
    })
  } catch (error: unknown) {
    console.error('Error rendering Mermaid chart:', error)
    container.innerHTML = `<div class="mermaid-error${darkMode ? ' dark-mode' : ''}">Error rendering chart: ${(error as Error).message}</div>`
  }
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
