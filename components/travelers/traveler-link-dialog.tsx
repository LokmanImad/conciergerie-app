"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, CopyIcon, LinkIcon, MessageCircleIcon, RefreshCwIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { RegistrationStatus } from "@/features/travelers/types"

export function TravelerLinkDialog({
  reservationId,
  reservationReference,
  principalGuest,
  registrationStatus,
  className,
}: {
  reservationId: string
  reservationReference: string
  principalGuest: string
  registrationStatus?: RegistrationStatus
  className?: string
}) {
  const router = useRouter()
  const [link, setLink] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const isClosed = registrationStatus === "submitted" || registrationStatus === "verified"

  const generate = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/traveler-link`, { method: "POST" })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || "Impossible de créer le lien.")
      setLink(body.url)
      setExpiresAt(body.expires_at)
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Une erreur est survenue.")
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const whatsappText = `Bonjour ${principalGuest}, merci de compléter les informations des voyageurs pour la réservation ${reservationReference} : ${link}`

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <LinkIcon className="mr-1 size-4" />
          {registrationStatus ? "Lien voyageurs" : "Créer le lien voyageurs"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lien d'enregistrement des voyageurs</DialogTitle>
          <DialogDescription>
            Réservation {reservationReference}. Le voyageur principal remplira les informations de tous les adultes.
          </DialogDescription>
        </DialogHeader>

        {isClosed ? (
          <Alert>
            <AlertDescription>
              Le formulaire a déjà été envoyé. Consultez-le depuis le module Voyageurs.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            {!link ? (
              <div className="rounded-md border border-dashed p-5 text-center">
                <p className="mb-4 text-sm text-muted-foreground">
                  {registrationStatus
                    ? "Créer un nouveau lien désactivera immédiatement le lien précédent."
                    : "Le lien sera privé, aléatoire et limité dans le temps."}
                </p>
                <Button type="button" onClick={generate} disabled={loading}>
                  <RefreshCwIcon className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Création…" : registrationStatus ? "Remplacer le lien" : "Générer le lien"}
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Input value={link} readOnly />
                  <p className="text-xs text-muted-foreground">
                    Expire le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(expiresAt))}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline" onClick={copy}>
                    {copied ? <CheckIcon className="mr-2 size-4" /> : <CopyIcon className="mr-2 size-4" />}
                    {copied ? "Copié" : "Copier le lien"}
                  </Button>
                  <Button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, "_blank", "noopener,noreferrer")}>
                    <MessageCircleIcon className="mr-2 size-4" />
                    Envoyer par WhatsApp
                  </Button>
                </div>
                <Alert>
                  <AlertDescription>Copiez ou envoyez ce lien avant de fermer cette fenêtre. Pour des raisons de sécurité, il ne sera pas affiché de nouveau.</AlertDescription>
                </Alert>
              </>
            )}
          </div>
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}
