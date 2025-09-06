import { calculateNodeBounds } from '@/renderer/core/spatial/boundsCalculator'
import { useCanvasStore } from '@/stores/graphStore'
import { useWorkflowStore } from '@/stores/workflowStore'

/**
 * Create a high-quality screenshot of the current canvas's active graph.
 * Uses the actual LGraphCanvas rendering logic for accurate representation.
 */
export function createCanvasScreenshot(padding = 50): string | null {
  const canvasStore = useCanvasStore()
  const workflowStore = useWorkflowStore()

  const graph = workflowStore.activeSubgraph || canvasStore.canvas?.graph
  const originalCanvas = canvasStore.canvas
  if (!graph || !graph._nodes || graph._nodes.length === 0 || !originalCanvas) {
    return null
  }

  const bounds = calculateNodeBounds(graph._nodes)
  if (!bounds) {
    return null
  }

  const width = bounds.width + padding * 2
  const height = bounds.height + padding * 2

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)

  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) {
    return null
  }

  const tempWidth = bounds.width + padding * 2
  const tempHeight = bounds.height + padding * 2
  tempCanvas.width = tempWidth
  tempCanvas.height = tempHeight

  const mockCanvas = {
    ...originalCanvas,
    canvas: tempCanvas,
    ctx: tempCtx,
    ds: {
      scale: 1,
      offset: [0, 0],
      toCanvasContext: (ctx: CanvasRenderingContext2D) => {
        ctx.translate(padding - bounds.minX, padding - bounds.minY)
      }
    },
    visible_nodes: graph._nodes,
    selectedItems: new Set(),
    low_quality: false,
    editor_alpha: 1,
    render_shadows: true,
    render_execution_order: false,
    drawNode: originalCanvas.drawNode.bind(originalCanvas),
    drawConnections: originalCanvas.drawConnections.bind(originalCanvas),
    drawSnapGuide:
      originalCanvas.drawSnapGuide?.bind(originalCanvas) || (() => {}),
    drawExecutionOrder:
      originalCanvas.drawExecutionOrder?.bind(originalCanvas) || (() => {}),
    colourGetter: originalCanvas.colourGetter,
    linkConnector: originalCanvas.linkConnector,
    subgraph: originalCanvas.subgraph,
    skip_border: false,
    render_collapsed_slots: true
  }

  tempCtx.save()
  tempCtx.translate(padding - bounds.minX, padding - bounds.minY + padding / 2)

  mockCanvas.drawConnections(tempCtx)

  for (const node of graph._nodes) {
    tempCtx.save()
    tempCtx.translate(node.pos[0], node.pos[1])
    ;(mockCanvas.drawNode as any)(node, tempCtx)
    tempCtx.restore()
  }

  tempCtx.restore()

  ctx.drawImage(tempCanvas, 0, 0)

  return canvas.toDataURL()
}
