import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import {
  documentTypeLabels,
  genderLabels,
  type TravelerRecord,
  type TravelerRegistrationDetail,
} from "@/features/travelers/types";

function escapeHtml(value: string | null | undefined) {
  return (value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function field(label: string, value: string | null | undefined) {
  return `<div class="field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
}

function documentImage(url: string | undefined, label: string) {
  if (!url) return "";
  return `<figure><figcaption>${escapeHtml(label)}</figcaption><img src="${escapeHtml(url)}" /></figure>`;
}

function travelerPage(
  registration: TravelerRegistrationDetail,
  traveler: TravelerRecord,
  documentUrls: Record<string, string>,
) {
  const reservation = registration.reservation;
  const frontLabel = traveler.document_type === "cin" ? "CIN — recto" : "Page d’identité";

  return `
    <article class="page">
      <header>
        <p>FICHE INDIVIDUELLE DE POLICE</p>
        <h1>Enregistrement du voyageur</h1>
        <div>Réservation ${escapeHtml(reservation?.reference)}</div>
      </header>
      <section class="summary grid">
        ${field("Hébergement", reservation?.apartment?.name)}
        ${field("Voyageur principal", reservation?.client_name)}
        ${field("Arrivée", reservation?.check_in)}
        ${field("Départ", reservation?.check_out)}
      </section>
      <section>
        <h2>Identité</h2>
        <div class="grid">
          ${field("Nom", traveler.last_name)}
          ${field("Prénom", traveler.first_name)}
          ${field("Sexe", genderLabels[traveler.gender])}
          ${field("Date de naissance", traveler.birth_date)}
          ${field("Lieu de naissance", traveler.birth_place)}
          ${field("Nationalité", traveler.nationality)}
          ${field("Pays de résidence", traveler.country_of_residence)}
          ${field("Profession", traveler.profession)}
          ${field("Adresse", traveler.address)}
        </div>
      </section>
      <section>
        <h2>Document et itinéraire</h2>
        <div class="grid">
          ${field("Type de document", documentTypeLabels[traveler.document_type])}
          ${field("Numéro", traveler.document_number)}
          ${field("Date d’expiration", traveler.document_expiry_date)}
          ${field("Provenance", traveler.arrival_from)}
          ${field("Destination suivante", traveler.next_destination)}
        </div>
      </section>
      <section>
        <h2>Pièce d’identité jointe</h2>
        <div class="documents">
          ${documentImage(documentUrls[traveler.document_front_path], frontLabel)}
          ${traveler.document_back_path ? documentImage(documentUrls[traveler.document_back_path], "CIN — verso") : ""}
        </div>
      </section>
      <footer>
        <p>Le voyageur principal certifie l’exactitude des informations fournies et accepte l’utilisation de sa signature pour la préparation des fiches liées à ce séjour.</p>
        <div class="grid">
          ${field("Signataire principal", registration.signed_by)}
          ${field("Date de signature", registration.signed_at ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(registration.signed_at)) : null)}
        </div>
        ${registration.signature_data_url ? `<img class="signature" src="${escapeHtml(registration.signature_data_url)}" />` : ""}
      </footer>
    </article>`;
}

export function createPoliceFormHtml(
  registration: TravelerRegistrationDetail,
  documentUrls: Record<string, string>,
) {
  return `<!doctype html>
  <html lang="fr"><head><meta charset="utf-8" /><style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #17201e; font-family: Arial, sans-serif; }
    .page { min-height: 270mm; page-break-after: always; padding: 2mm; }
    .page:last-child { page-break-after: auto; }
    header { text-align: center; border-bottom: 2px solid #123f3a; padding-bottom: 12px; margin-bottom: 18px; }
    header p { font-size: 10px; font-weight: 800; letter-spacing: 2px; margin: 0; }
    header h1 { font-size: 24px; margin: 7px 0; color: #123f3a; }
    header div { font-size: 12px; }
    section { margin-bottom: 18px; }
    section h2 { font-size: 16px; color: #123f3a; border-bottom: 1px solid #d9dedc; padding-bottom: 6px; margin: 0 0 11px; }
    .summary { border: 1px solid #d9dedc; border-radius: 8px; padding: 12px; background: #f7f7f4; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 24px; }
    .field span { display: block; color: #68736f; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
    .field strong { display: block; font-size: 12px; margin-top: 3px; }
    .documents { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    figure { margin: 0; }
    figcaption { font-size: 10px; font-weight: 700; margin-bottom: 5px; }
    figure img { width: 100%; height: 125px; border: 1px solid #d9dedc; border-radius: 6px; object-fit: contain; }
    footer { margin-top: 18px; border-top: 1px solid #d9dedc; padding-top: 12px; }
    footer > p { color: #68736f; font-size: 9px; line-height: 1.5; }
    .signature { width: 220px; height: 75px; object-fit: contain; object-position: left center; margin-top: 8px; }
  </style></head><body>${registration.travelers.map((traveler) => travelerPage(registration, traveler, documentUrls)).join("")}</body></html>`;
}

export async function printPoliceForm(
  registration: TravelerRegistrationDetail,
  documentUrls: Record<string, string>,
) {
  await Print.printAsync({ html: createPoliceFormHtml(registration, documentUrls) });
}

export async function sharePoliceForm(
  registration: TravelerRegistrationDetail,
  documentUrls: Record<string, string>,
) {
  const html = createPoliceFormHtml(registration, documentUrls);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ html });
    return;
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: `Fiches de police — ${registration.reservation?.reference ?? "réservation"}`,
  });
}
