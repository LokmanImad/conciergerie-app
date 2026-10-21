"use client";

import {
  Building2Icon,
  ChartNoAxesCombinedIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { CustomSignInForm } from "@/components/auth/custom-sign-in-form";

export default function SignInPage() {
  return (
    <div
      data-sign-in-page
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
            <p className="text-xs uppercase tracking-[0.18em] text-sidebar-foreground/50">Espace de gestion</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sidebar-primary">Une gestion plus sereine</p>
          <h1 className="text-balance text-4xl font-bold leading-tight text-white xl:text-5xl">
            Pilotez chaque séjour avec précision.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-sidebar-foreground/65">
            Réservations, voyageurs, documents et finances réunis dans une interface claire pour votre équipe.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <ShieldCheckIcon className="mb-3 size-5 text-sidebar-primary" />
              <p className="font-semibold text-white">Accès sécurisé</p>
              <p className="mt-1 text-sm text-sidebar-foreground/55">Code e-mail, MFA et appareils approuvés.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <ChartNoAxesCombinedIcon className="mb-3 size-5 text-sidebar-primary" />
              <p className="font-semibold text-white">Vue centralisée</p>
              <p className="mt-1 text-sm text-sidebar-foreground/55">Votre activité au même endroit.</p>
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
            <p className="text-xs text-muted-foreground">Espace de gestion</p>
          </div>
        </div>
        <CustomSignInForm />
      </section>
    </div>
  );
}
