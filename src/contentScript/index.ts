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

// Function to create tabbed interface
function createTabbedInterface(element: HTMLElement, codeContent: string) {
  // Check if we've already processed this element
  if (element.hasAttribute('data-mermaid-processed')) {
    return
  }
  
  // Mark element as processed
  element.setAttribute('data-mermaid-processed', 'true')

  // Create container for tabs
  const container = document.createElement('div')
  container.style.cssText = `
    border: 1px solid #ddd;
    border-radius: 4px;
    margin: 10px 0;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  `

  // Create tab headers
  const tabHeader = document.createElement('div')
  tabHeader.style.cssText = `
    display: flex;
    background-color: #f5f5f5;
    border-bottom: 1px solid #ddd;
  `

  // Create code tab
  const codeTab = document.createElement('button')
  codeTab.textContent = 'Code'
  codeTab.style.cssText = `
    flex: 1;
    padding: 8px 16px;
    border: none;
    background: none;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  `

  // Create chart tab
  const chartTab = document.createElement('button')
  chartTab.textContent = 'Chart'
  chartTab.style.cssText = `
    flex: 1;
    padding: 8px 16px;
    border: none;
    background: none;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  `

  // Create tab content containers
  const codeContentDiv = document.createElement('div')
  codeContentDiv.style.cssText = `
    padding: 16px;
    display: block;
    overflow-x: auto;
  `

  const chartContentDiv = document.createElement('div')
  chartContentDiv.style.cssText = `
    padding: 16px;
    display: none;
    min-height: 200px;
    text-align: center;
  `
  chartContentDiv.innerHTML = '<div>Click "Chart" tab to render diagram</div>'

  // Set up initial content
  codeContentDiv.textContent = codeContent
  codeContentDiv.style.whiteSpace = 'pre'

  // Add event listeners for tab switching
  codeTab.addEventListener('click', () => {
    codeTab.style.backgroundColor = '#fff'
    chartTab.style.backgroundColor = 'transparent'
    codeContentDiv.style.display = 'block'
    chartContentDiv.style.display = 'none'
  })

  chartTab.addEventListener('click', () => {
    codeTab.style.backgroundColor = 'transparent'
    chartTab.style.backgroundColor = '#fff'
    codeContentDiv.style.display = 'none'
    chartContentDiv.style.display = 'block'
    
    // Render chart when switching to chart tab
    renderMermaidChart(codeContent, chartContentDiv)
  })

  // Set initial active tab
  codeTab.style.backgroundColor = '#fff'

  // Assemble the UI
  tabHeader.appendChild(codeTab)
  tabHeader.appendChild(chartTab)
  container.appendChild(tabHeader)
  container.appendChild(codeContentDiv)
  container.appendChild(chartContentDiv)

  // Find the parent element to replace
  // If the code element is inside a pre element, replace the pre element
  // Otherwise replace the code element directly
  const parentElement = element.parentElement
  if (parentElement && parentElement.tagName === 'PRE') {
    parentElement.parentNode!.replaceChild(container, parentElement)
  } else {
    element.parentNode!.replaceChild(container, element)
  }
  
  console.log('Created tabbed interface for mermaid element')
}

// Function to render Mermaid chart
function renderMermaidChart(codeContent: string, container: HTMLElement) {
  // Clear previous content
  container.innerHTML = '<div>Rendering chart...</div>'
  
  try {
    console.log('Rendering Mermaid chart with content:', codeContent.substring(0, 100) + '...')
    
    // Use Mermaid to render the chart
    mermaid.render(
      'mermaid-chart-' + Date.now(),
      codeContent
    ).then((renderResult: { svg: string }) => {
      container.innerHTML = renderResult.svg
      console.log('Chart rendered successfully')
    }).catch((error: unknown) => {
      console.error('Error rendering Mermaid chart:', error)
      container.innerHTML = `<div style="color: red;">Error rendering chart: ${(error as Error).message}</div>`
    })
  } catch (error: unknown) {
    console.error('Error rendering Mermaid chart:', error)
    container.innerHTML = `<div style="color: red;">Error rendering chart: ${(error as Error).message}</div>`
  }
}

// Function to process mermaid code elements
function processMermaidCodeElements() {
  console.log('Processing mermaid code elements...')
  
  // Get all code elements with the mermaid language class
  const mermaidCodeElements = document.querySelectorAll('code.language-mermaid')
  
  // Log the number of mermaid code elements found
  console.log(`Found ${mermaidCodeElements.length} mermaid code elements on the page`)
  
  // Process each mermaid code element
  mermaidCodeElements.forEach((element, index) => {
    const codeContent = element.textContent || ''
    console.log(`Mermaid code element ${index + 1}:`, codeContent.substring(0, 50) + '...')
    
    // Create tabbed interface for this element
    createTabbedInterface(element as HTMLElement, codeContent)
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
