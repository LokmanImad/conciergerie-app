import { notFound } from "next/navigation"

import { PrintPoliceFormButton } from "@/components/travelers/print-police-form-button"
import { DOCUMENT_TYPE_LABELS, GENDER_LABELS, type DocumentType, type Gender } from "@/features/travelers/types"
import { getSupabaseServerClient } from "@/lib/supabase/server"

type PrintableTraveler = {
  id: string
  position: number
  is_primary: boolean
  first_name: string
  last_name: string
  gender: Gender
  birth_date: string
  birth_place: string
  nationality: string
  country_of_residence: string
  address: string
  profession: string
  document_type: DocumentType
  document_number: string
  document_expiry_date: string | null
  document_front_path: string
  document_back_path: string | null
  arrival_from: string
  next_destination: string
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function PoliceFormPage({
  params,
}: {
  params: Promise<{ registrationId: string }>
}) {
  const { registrationId } = await params
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase
    .from("traveler_registrations")
    .select(`
      id, status, signed_by, signed_at, signature_data_url,
      reservation:reservations(reference, client_name, check_in, check_out, apartment:apartments(name)),
      travelers(*)
    `)
    .eq("id", registrationId)
    .single()

  if (!data || data.status !== "verified") notFound()

  const reservation = firstRelation(data.reservation) as {
    reference: string
    client_name: string
    check_in: string
    check_out: string
    apartment: { name: string } | { name: string }[] | null
  } | null
  if (!reservation) notFound()
  const apartment = firstRelation(reservation.apartment)
  const travelers = ((data.travelers ?? []) as unknown as PrintableTraveler[]).sort((a, b) => a.position - b.position)

  const documentUrls = new Map<string, string>()
  await Promise.all(travelers.flatMap((traveler) =>
    [traveler.document_front_path, traveler.document_back_path]
      .filter((path): path is string => Boolean(path))
      .map(async (path) => {
        const { data: signedData } = await supabase.storage.from("identity-documents").createSignedUrl(path, 600)
        if (signedData?.signedUrl) documentUrls.set(path, signedData.signedUrl)
      }),
  ))

  return (
    <div data-police-form className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="police-print-toolbar mx-auto mb-4 flex max-w-[210mm] items-center justify-between rounded-lg bg-white p-4 shadow-sm">
        <div>
          <h1 className="font-semibold">Fiches de police</h1>
          <p className="text-sm text-muted-foreground">{reservation.reference} · {travelers.length} fiche{travelers.length > 1 ? "s" : ""}</p>
        </div>
        <PrintPoliceFormButton />
      </div>

      {travelers.map((traveler) => (
        <article key={traveler.id} className="police-form-page mx-auto mb-5 min-h-[297mm] max-w-[210mm] bg-white p-[15mm] shadow-sm print:mb-0 print:shadow-none">
          <header className="mb-7 border-b-2 border-slate-900 pb-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Fiche individuelle de police</p>
            <h2 className="mt-2 text-2xl font-bold">Enregistrement du voyageur</h2>
            <p className="mt-1 text-sm">Réservation {reservation.reference}</p>
          </header>

          <section className="mb-6 grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm">
            <PrintField label="Hébergement" value={apartment?.name ?? "—"} />
            <PrintField label="Voyageur principal de la réservation" value={reservation.client_name} />
            <PrintField label="Arrivée" value={reservation.check_in} />
            <PrintField label="Départ" value={reservation.check_out} />
          </section>

          <section className="mb-6">
            <h3 className="mb-3 border-b pb-2 text-lg font-semibold">Identité</h3>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <PrintField label="Nom" value={traveler.last_name} />
              <PrintField label="Prénom" value={traveler.first_name} />
              <PrintField label="Sexe" value={GENDER_LABELS[traveler.gender]} />
              <PrintField label="Date de naissance" value={traveler.birth_date} />
              <PrintField label="Lieu de naissance" value={traveler.birth_place} />
              <PrintField label="Nationalité" value={traveler.nationality} />
              <PrintField label="Pays de résidence" value={traveler.country_of_residence} />
              <PrintField label="Profession" value={traveler.profession || "—"} />
              <div className="col-span-2"><PrintField label="Adresse" value={traveler.address} /></div>
            </dl>
          </section>

          <section className="mb-6">
            <h3 className="mb-3 border-b pb-2 text-lg font-semibold">Document et itinéraire</h3>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <PrintField label="Type de document" value={DOCUMENT_TYPE_LABELS[traveler.document_type]} />
              <PrintField label="Numéro" value={traveler.document_number} />
              <PrintField label="Date d'expiration" value={traveler.document_expiry_date || "—"} />
              <PrintField label="Provenance" value={traveler.arrival_from} />
              <PrintField label="Prochaine destination" value={traveler.next_destination} />
            </dl>
          </section>

          <section className="mb-6">
            <h3 className="mb-3 border-b pb-2 text-lg font-semibold">Pièce d'identité jointe</h3>
            <div className="grid grid-cols-2 gap-4">
              {traveler.document_front_path && documentUrls.get(traveler.document_front_path) && (
                <DocumentImage url={documentUrls.get(traveler.document_front_path)!} label={traveler.document_type === "cin" ? "Recto" : "Page d'identité"} />
              )}
              {traveler.document_back_path && documentUrls.get(traveler.document_back_path) && (
                <DocumentImage url={documentUrls.get(traveler.document_back_path)!} label="Verso" />
              )}
            </div>
          </section>

          <section className="mt-auto border-t pt-4">
            <p className="text-xs leading-relaxed text-slate-600">
              Le voyageur principal certifie l'exactitude des informations fournies et accepte l'utilisation de sa signature pour la préparation des fiches liées à ce séjour.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-8">
              <PrintField label="Signataire principal" value={data.signed_by ?? "—"} />
              <PrintField label="Date de signature" value={data.signed_at ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(data.signed_at)) : "—"} />
            </div>
            {data.signature_data_url && <img src={data.signature_data_url} alt="Signature du voyageur principal" className="mt-3 h-24 w-72 object-contain object-left" />}
          </section>
        </article>
      ))}
    </div>
  )
}

function PrintField({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-950">{value}</dd></div>
}

function DocumentImage({ url, label }: { url: string; label: string }) {
  return <figure><figcaption className="mb-1 text-xs font-medium">{label}</figcaption><img src={url} alt={label} className="h-36 w-full rounded border object-contain" /></figure>
}
