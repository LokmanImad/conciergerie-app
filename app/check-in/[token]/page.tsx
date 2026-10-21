import type { Metadata } from "next"

import { PublicTravelerForm } from "@/components/travelers/public-traveler-form"

export const metadata: Metadata = {
  title: "Enregistrement des voyageurs",
  description: "Formulaire sécurisé de pré-enregistrement des voyageurs",
  robots: { index: false, follow: false },
}

export default function PublicCheckInPage() {
  return (
    <div data-public-check-in className="min-h-screen w-full bg-background">
      <PublicTravelerForm />
    </div>
  )
}
