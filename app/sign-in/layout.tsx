import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Connexion - Conciergerie",
  description: "Connectez-vous à votre compte de conciergerie",
}

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

