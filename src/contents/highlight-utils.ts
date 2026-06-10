import type { CotsNode } from "~src/lib/types"

function applyHighlights(highlights: CotsNode[]) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const text = node.textContent?.trim()
      return text && text.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    }
  })

  // Basic implementation: iterate highlights and search for text matches.
  // Note: This is a simple implementation and may need refinement for complex DOMs.
  for (const highlight of highlights) {
    if (!highlight.anchor || !highlight.highlightColor) continue
    
    const textToFind = highlight.anchor.text
    
    // Simple text search - in a real app you'd want something more robust
    // like walking the text nodes to find the exact sequence.
    let node
    while(node = walker.nextNode()) {
      if (node.textContent?.includes(textToFind)) {
        // ... logic to wrap found text ...
        // This is tricky without disrupting DOM tree walking.
        // For now, let's keep it simple or acknowledge the limitation.
      }
    }
  }
}
