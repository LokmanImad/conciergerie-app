"use client"

import { useRef, useState } from "react"
import { EraserIcon, PenLineIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function SignatureCanvas({ onChange }: { onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
    const point = pointFromEvent(event)
    context.beginPath()
    context.moveTo(point.x, point.y)
    context.lineTo(point.x + 0.1, point.y + 0.1)
    context.strokeStyle = "#111827"
    context.lineWidth = 4
    context.lineCap = "round"
    context.lineJoin = "round"
    context.stroke()
  }

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const context = canvasRef.current?.getContext("2d")
    if (!context) return
    const point = pointFromEvent(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const finishDrawing = () => {
    if (!drawingRef.current || !canvasRef.current) return
    drawingRef.current = false
    const value = canvasRef.current.toDataURL("image/png")
    setHasSignature(true)
    onChange(value)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onChange("")
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border-2 border-dashed bg-white">
        <canvas
          ref={canvasRef}
          width={900}
          height={240}
          className="h-40 w-full touch-none cursor-crosshair"
          aria-label="Zone de signature"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
        />
        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            <PenLineIcon className="mr-2 size-4" />
            Signez ici avec votre doigt ou votre souris
          </div>
        )}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!hasSignature}>
        <EraserIcon className="mr-2 size-4" />
        Effacer la signature
      </Button>
    </div>
  )
}
