// Mermaid library types
export interface MermaidAPI {
  initialize: (config: any) => void
  render: (
    id: string,
    text: string,
    callback: (svgCode: string, bindFunctions?: (element: Element) => void) => void
  ) => string
}

export interface Mermaid {
  mermaidAPI: MermaidAPI
  initialize: (config: any) => void
}

// Extend window interface
declare global {
  interface Window {
    mermaid: Mermaid
  }
}

export {}