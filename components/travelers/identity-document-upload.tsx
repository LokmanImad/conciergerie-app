"use client"

import { useEffect, useState } from "react"
import { CameraIcon, CheckCircle2Icon, Loader2Icon, ScanTextIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import type { TravelerFormValue } from "@/features/travelers/types"
import { extractTravelerFields } from "@/features/travelers/ocr"

async function compressImage(file: File) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error("Image illisible"))
      element.src = objectUrl
    })
    const maximum = 1800
    const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Compression indisponible")
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84))
    if (!blob) throw new Error("Compression impossible")
    return new File([blob], "document.jpg", { type: "image/jpeg" })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function IdentityDocumentUpload({
  token,
  position,
  side,
  label,
  existingPath,
  onUploaded,
  onOcrResult,
}: {
  token: string
  position: number
  side: "front" | "back"
  label: string
  existingPath: string
  onUploaded: (path: string) => void
  onOcrResult?: (fields: Partial<TravelerFormValue>) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [uploading, setUploading] = useState(false)
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const inputId = `identity-document-${position}-${side}`

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const selectFile = async (selected: File | undefined) => {
    if (!selected) return
    setError("")
    setMessage("")
    if (!selected.type.startsWith("image/") || selected.size > 12 * 1024 * 1024) {
      setError("Choisissez une photo de moins de 12 Mo.")
      return
    }

    setUploading(true)
    try {
      const compressed = await compressImage(selected)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(compressed))
      setFile(compressed)
      const formData = new FormData()
      formData.set("file", compressed)
      formData.set("side", side)
      formData.set("position", String(position))
      const response = await fetch(`/api/check-in/${token}/documents`, { method: "POST", body: formData })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || "Échec de l'envoi de la photo.")
      onUploaded(body.path)
      setMessage("Photo enregistrée de manière privée.")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Échec de l'envoi de la photo.")
      setFile(null)
    } finally {
      setUploading(false)
    }
  }

  const runOcr = async () => {
    if (!file || !onOcrResult) return
    setOcrRunning(true)
    setOcrProgress(0)
    setError("")
    try {
      const { createWorker } = await import("tesseract.js")
      const worker = await createWorker(["fra", "eng"], undefined, {
        logger: (event) => {
          if (event.status === "recognizing text") setOcrProgress(Math.round((event.progress ?? 0) * 100))
        },
      })
      try {
        const { data } = await worker.recognize(file)
        const fields = extractTravelerFields(data.text)
        onOcrResult(fields)
        const detected = Object.values(fields).filter(Boolean).length
        setMessage(
          detected > 0
            ? `${detected} information${detected > 1 ? "s" : ""} détectée${detected > 1 ? "s" : ""}. Vérifiez les champs.`
            : "Le texte a été lu, mais aucun champ fiable n'a été détecté. Remplissez manuellement.",
        )
      } finally {
        await worker.terminate()
      }
    } catch {
      setError("La lecture automatique a échoué. Vous pouvez continuer manuellement.")
    } finally {
      setOcrRunning(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <Label>{label} *</Label>
      {preview && <img src={preview} alt={label} className="h-40 w-full rounded-md bg-slate-100 object-contain" />}
      {!preview && existingPath && (
        <div className="flex h-24 items-center justify-center rounded-md bg-emerald-50 text-sm text-emerald-700">
          <CheckCircle2Icon className="mr-2 size-4" /> Document déjà enregistré
        </div>
      )}
      <Input
        id={inputId}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        disabled={uploading || ocrRunning}
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Label
          htmlFor={inputId}
          aria-disabled={uploading || ocrRunning}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          {uploading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <CameraIcon className="mr-2 size-4" />}
          {uploading ? "Envoi…" : existingPath || preview ? "Remplacer la photo" : "Prendre ou choisir une photo"}
        </Label>
        {side === "front" && onOcrResult && (
          <Button type="button" size="sm" variant="secondary" disabled={!file || uploading || ocrRunning} onClick={runOcr}>
            {ocrRunning ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <ScanTextIcon className="mr-2 size-4" />}
            {ocrRunning ? "Lecture…" : "Lire automatiquement"}
          </Button>
        )}
      </div>
      {ocrRunning && <Progress value={ocrProgress} />}
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    </div>
  )
}
