"use client"

import { useSignIn } from "@clerk/nextjs"
import type { SignInResource } from "@clerk/types"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  MailIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { type FormEvent, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthStep = "credentials" | "reset-code" | "new-password" | "second-factor"
type SecondFactorStrategy = "email_code" | "totp" | "backup_code"

type ClerkErrorLike = {
  errors?: Array<{
    code?: string
    message?: string
    longMessage?: string
  }>
}

const ERROR_MESSAGES: Record<string, string> = {
  form_identifier_not_found: "Adresse e-mail ou mot de passe incorrect.",
  form_password_incorrect: "Adresse e-mail ou mot de passe incorrect.",
  form_code_incorrect: "Le code saisi est incorrect. Vérifiez-le puis réessayez.",
  verification_expired: "Ce code a expiré. Demandez un nouveau code.",
  form_password_length_too_short: "Le mot de passe doit contenir au moins 8 caractères.",
  form_password_pwned: "Ce mot de passe a été compromis. Choisissez-en un autre.",
  too_many_requests: "Trop de tentatives ont été effectuées. Patientez quelques minutes.",
  session_exists: "Une session est déjà ouverte. Actualisez la page pour continuer.",
}

function getErrorMessage(error: unknown) {
  const clerkError = error as ClerkErrorLike
  const firstError = clerkError?.errors?.[0]

  if (firstError?.code && ERROR_MESSAGES[firstError.code]) {
    return ERROR_MESSAGES[firstError.code]
  }

  return "Une erreur est survenue. Vérifiez vos informations puis réessayez."
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@")
  if (!name || !domain) return value

  const visibleName = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2)
  return `${visibleName}${"•".repeat(Math.max(3, name.length - visibleName.length))}@${domain}`
}

export function CustomSignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const [step, setStep] = useState<AuthStep>("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<SecondFactorStrategy | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const isDevelopment = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")
  const normalizedEmail = email.trim().toLowerCase()

  function resetFeedback() {
    setError(null)
    setNotice(null)
  }

  async function completeSignIn(attempt: SignInResource) {
    if (attempt.status === "complete" && attempt.createdSessionId) {
      if (!setActive) {
        throw new Error("clerk_not_loaded")
      }
      await setActive({ session: attempt.createdSessionId, redirectUrl: "/" })
      return true
    }

    if (attempt.status === "needs_new_password") {
      setStep("new-password")
      setCode("")
      setNotice("Votre identité est confirmée. Choisissez maintenant un nouveau mot de passe.")
      return false
    }

    if (attempt.status === "needs_second_factor") {
      const factors = attempt.supportedSecondFactors ?? []
      const emailFactor = factors.find((factor) => factor.strategy === "email_code")

      if (emailFactor?.strategy === "email_code") {
        await attempt.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        })
        setSecondFactorStrategy("email_code")
        setNotice(`Un code de sécurité a été envoyé à ${emailFactor.safeIdentifier}.`)
      } else if (factors.some((factor) => factor.strategy === "totp")) {
        setSecondFactorStrategy("totp")
        setNotice("Saisissez le code affiché dans votre application d’authentification.")
      } else if (factors.some((factor) => factor.strategy === "backup_code")) {
        setSecondFactorStrategy("backup_code")
        setNotice("Saisissez l’un de vos codes de secours.")
      } else {
        throw new Error("unsupported_second_factor")
      }

      setStep("second-factor")
      setCode("")
      return false
    }

    throw new Error(`unsupported_sign_in_status:${attempt.status ?? "unknown"}`)
  }

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetFeedback()

    if (!normalizedEmail || !password) {
      setError("Saisissez votre adresse e-mail et votre mot de passe.")
      return
    }

    if (!isLoaded) return

    setIsSubmitting(true)
    try {
      const attempt = await signIn.create({
        strategy: "password",
        identifier: normalizedEmail,
        password,
      })
      await completeSignIn(attempt)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    resetFeedback()

    if (!normalizedEmail) {
      setError("Saisissez d’abord l’adresse e-mail de votre compte.")
      return
    }

    if (!isLoaded) return

    setIsSubmitting(true)
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: normalizedEmail,
      })
      setStep("reset-code")
      setCode("")
      setNotice(`Un code de réinitialisation a été envoyé à ${maskEmail(normalizedEmail)}.`)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetFeedback()

    if (!code.trim()) {
      setError("Saisissez le code reçu par e-mail.")
      return
    }

    if (!isLoaded) return

    setIsSubmitting(true)
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
      })
      await completeSignIn(attempt)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetFeedback()

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }

    if (!isLoaded) return

    setIsSubmitting(true)
    try {
      const attempt = await signIn.resetPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      })
      await completeSignIn(attempt)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSecondFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetFeedback()

    if (!code.trim() || !secondFactorStrategy) {
      setError("Saisissez votre code de sécurité.")
      return
    }

    if (!isLoaded) return

    setIsSubmitting(true)
    try {
      const attempt = await signIn.attemptSecondFactor({
        strategy: secondFactorStrategy,
        code: code.trim(),
      })
      await completeSignIn(attempt)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function resendCode() {
    resetFeedback()
    if (!isLoaded) return

    setIsSubmitting(true)
    try {
      if (step === "reset-code") {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier: normalizedEmail,
        })
        setNotice(`Un nouveau code a été envoyé à ${maskEmail(normalizedEmail)}.`)
      } else if (step === "second-factor" && secondFactorStrategy === "email_code") {
        const emailFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        )
        if (!emailFactor || emailFactor.strategy !== "email_code") {
          throw new Error("email_factor_unavailable")
        }
        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        })
        setNotice(`Un nouveau code a été envoyé à ${emailFactor.safeIdentifier}.`)
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  function returnToCredentials() {
    resetFeedback()
    setStep("credentials")
    setPassword("")
    setCode("")
    setNewPassword("")
    setConfirmPassword("")
    setSecondFactorStrategy(null)
  }

  const busy = isSubmitting || !isLoaded

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)] sm:p-8">
      <div className="mb-7">
        <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {step === "credentials" ? <LockKeyholeIcon className="size-6" /> : <KeyRoundIcon className="size-6" />}
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          {step === "credentials" ? "Espace sécurisé" : "Vérification sécurisée"}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {step === "credentials" && "Bienvenue"}
          {step === "reset-code" && "Vérifiez votre e-mail"}
          {step === "new-password" && "Nouveau mot de passe"}
          {step === "second-factor" && "Confirmez votre identité"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {step === "credentials" && "Connectez-vous pour accéder à votre espace de gestion."}
          {step === "reset-code" && "Saisissez le code reçu pour continuer la réinitialisation."}
          {step === "new-password" && "Choisissez un mot de passe unique et difficile à deviner."}
          {step === "second-factor" && "Une vérification supplémentaire protège votre compte."}
        </p>
      </div>

      {notice && (
        <Alert className="mb-5 border-primary/20 bg-primary/5 text-primary">
          <CheckCircle2Icon />
          <AlertDescription className="text-primary/90">{notice}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-5" aria-live="polite">
          <ShieldCheckIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === "credentials" && (
        <form onSubmit={handleCredentials} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@entreprise.com"
                className="h-12 pl-10"
                disabled={busy}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="password">Mot de passe</Label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-primary transition-colors hover:text-primary/75 hover:underline"
                disabled={busy}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <LockKeyholeIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
                className="h-12 px-10"
                disabled={busy}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                disabled={busy}
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>
            {busy ? <LoaderCircleIcon className="size-4 animate-spin" /> : <ArrowRightIcon className="size-4" />}
            Se connecter
          </Button>
        </form>
      )}

      {(step === "reset-code" || step === "second-factor") && (
        <form onSubmit={step === "reset-code" ? handleResetCode : handleSecondFactor} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="security-code">Code de sécurité</Label>
            <Input
              id="security-code"
              type="text"
              inputMode={secondFactorStrategy === "backup_code" ? "text" : "numeric"}
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={secondFactorStrategy === "backup_code" ? "Code de secours" : "000000"}
              className="h-12 text-center text-lg font-semibold tracking-[0.35em]"
              disabled={busy}
              autoFocus
              required
            />
          </div>

          <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>
            {busy ? <LoaderCircleIcon className="size-4 animate-spin" /> : <ShieldCheckIcon className="size-4" />}
            Vérifier le code
          </Button>

          {(step === "reset-code" || secondFactorStrategy === "email_code") && (
            <button
              type="button"
              onClick={resendCode}
              className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline"
              disabled={busy}
            >
              <RefreshCwIcon className="size-4" />
              Renvoyer un code
            </button>
          )}
        </form>
      )}

      {step === "new-password" && (
        <form onSubmit={handleNewPassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <div className="relative">
              <LockKeyholeIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="8 caractères minimum"
                className="h-12 px-10"
                disabled={busy}
                minLength={8}
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                disabled={busy}
              >
                {showNewPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <Input
              id="confirm-password"
              type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Saisissez-le une seconde fois"
              className="h-12"
              disabled={busy}
              minLength={8}
              required
            />
          </div>

          <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>
            {busy ? <LoaderCircleIcon className="size-4 animate-spin" /> : <CheckCircle2Icon className="size-4" />}
            Enregistrer et continuer
          </Button>
        </form>
      )}

      {step !== "credentials" && (
        <button
          type="button"
          onClick={returnToCredentials}
          className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          disabled={busy}
        >
          <ArrowLeftIcon className="size-4" />
          Retour à la connexion
        </button>
      )}

      <div className="mt-7 border-t border-border pt-5 text-center">
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-3.5 text-primary" />
          Accès réservé aux utilisateurs autorisés
        </p>
        {isDevelopment && (
          <p className="mt-2 text-[11px] font-medium text-amber-700">Environnement de développement</p>
        )}
      </div>
    </div>
  )
}
