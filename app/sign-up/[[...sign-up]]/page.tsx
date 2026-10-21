"use client";

import { SignUp } from "@clerk/nextjs";
import { Building2Icon, KeyRoundIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";

export default function SignUpPage() {
  return (
    <div
      data-sign-up-page
      className="fixed inset-0 z-50 grid min-h-screen overflow-y-auto bg-background lg:grid-cols-[1.05fr_0.95fr]"
    >
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 size-96 rounded-full bg-sidebar-primary/10 blur-2xl" />
        <div className="absolute -bottom-40 -left-28 size-[30rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-2xl">
            <SparklesIcon className="size-6" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">Concierge</p>
            <p className="text-xs uppercase tracking-[0.18em] text-sidebar-foreground/50">
              Invitation sécurisée
            </p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sidebar-primary">
            Première connexion
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight text-white xl:text-5xl">
            Créez votre accès personnel.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-sidebar-foreground/65">
            Choisissez votre mot de passe. Votre administrateur validera ensuite votre accès à la société.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <KeyRoundIcon className="mb-3 size-5 text-sidebar-primary" />
              <p className="font-semibold text-white">Mot de passe privé</p>
              <p className="mt-1 text-sm text-sidebar-foreground/55">
                Vous seul choisissez et connaissez votre mot de passe.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <ShieldCheckIcon className="mb-3 size-5 text-sidebar-primary" />
              <p className="font-semibold text-white">Accès contrôlé</p>
              <p className="mt-1 text-sm text-sidebar-foreground/55">
                Les données restent bloquées jusqu’à l’autorisation.
              </p>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-sidebar-foreground/35">Gestion privée de conciergerie</p>
      </section>

      <section className="flex min-h-screen flex-col items-center justify-center gap-7 p-4 sm:p-8 lg:p-12">
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Building2Icon className="size-5" />
          </div>
          <div>
            <p className="font-bold">Concierge</p>
            <p className="text-xs text-muted-foreground">Activation de votre invitation</p>
          </div>
        </div>
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          forceRedirectUrl="/"
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              cardBox: "w-full shadow-none",
              card: "w-full rounded-3xl border border-border bg-card shadow-[0_30px_80px_rgba(15,23,42,0.10)]",
              headerTitle: "text-2xl font-bold",
              headerSubtitle: "text-muted-foreground",
              formButtonPrimary: "bg-primary hover:bg-primary/90",
              footerAction: "hidden",
            },
          }}
        />
      </section>
    </div>
  );
}
