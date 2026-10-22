import { createHash } from "node:crypto";
import {
  getSmtpConfiguration,
  isEmailAddress,
  safeSmtpErrorCode,
  sendSmtpMessage,
  SmtpConfigurationError,
} from "../lib/smtp.mjs";

const SUBJECTS = {
  "gestion-locative": "Gestion locative",
  "sous-location": "Sous-location",
  "achat-investissement": "Achat & investissement",
  application: "Lancement de l’application",
  "ouverture-marrakech": "Ouverture à Marrakech",
  autre: "Autre demande",
};
const CITIES = new Set(["Tanger", "Tétouan", "Asilah", "Marrakech", "Autre"]);

export function validateContact(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const fields = [
    "name",
    "email",
    "phone",
    "city",
    "subject",
    "message",
    "website",
    "requestId",
  ];
  const data = Object.fromEntries(
    fields.map((key) => [
      key,
      typeof body[key] === "string" ? body[key].trim() : "",
    ]),
  );
  if (data.website) return { spam: true };
  if (
    data.name.length < 2 ||
    data.name.length > 120 ||
    !isEmailAddress(data.email) ||
    data.phone.length > 40 ||
    !CITIES.has(data.city) ||
    !Object.hasOwn(SUBJECTS, data.subject) ||
    data.message.length < 15 ||
    data.message.length > 5000 ||
    body.consent !== true ||
    !/^[a-f0-9-]{36}$/i.test(data.requestId)
  )
    return null;
  return { ...data, consent: true };
}

async function readBody(request) {
  const limit = 16000;
  if (Number(request.headers["content-length"] || 0) > limit)
    throw new Error("TOO_LARGE");
  if (request.body !== undefined) {
    const raw =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body);
    if (Buffer.byteLength(raw) > limit) throw new Error("TOO_LARGE");
    return JSON.parse(raw);
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("TOO_LARGE");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createContactHandler({
  env = process.env,
  createTransport,
  logger = console,
} = {}) {
  return async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store");
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return response.status(405).json({ error: "Méthode non autorisée." });
    }
    const fetchSite = request.headers["sec-fetch-site"];
    if (fetchSite === "cross-site")
      return response.status(403).json({ error: "Demande non autorisée." });
    if (
      !String(request.headers["content-type"] || "").startsWith(
        "application/json",
      )
    ) {
      return response
        .status(415)
        .json({ error: "Format de demande invalide." });
    }
    let body;
    try {
      body = await readBody(request);
    } catch (error) {
      return response
        .status(error.message === "TOO_LARGE" ? 413 : 400)
        .json({ error: "Votre demande est invalide ou trop volumineuse." });
    }
    const data = validateContact(body);
    if (!data)
      return response.status(400).json({
        error:
          "Vérifiez vos coordonnées, le sujet, la ville et votre message (15 caractères minimum).",
      });
    if (data.spam) return response.status(200).json({ ok: true });
    let configuration;
    try {
      configuration = getSmtpConfiguration(env);
    } catch (error) {
      if (!(error instanceof SmtpConfigurationError)) throw error;
      logger.error("[contact] Configuration SMTP :", error.fields.join(", "));
      return response.status(503).json({
        error:
          "L’envoi du formulaire est momentanément indisponible. Écrivez-nous à info@asadhospitality.ma ou contactez-nous sur WhatsApp.",
      });
    }
    // A stable Message-ID helps trace retries, but SMTP does not guarantee
    // deduplication (including when a server accepts mail then loses its reply).
    const identity = createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
    try {
      await sendSmtpMessage(
        configuration,
        {
          messageId: `<asad-contact-${identity}@${configuration.from.split("@")[1]}>`,
          replyTo: { address: data.email },
          subject: `Asad Hospitality — ${SUBJECTS[data.subject]} — ${data.city}`,
          text: `Nouvelle demande depuis le site Asad Hospitality\n\nNom : ${data.name}\nE-mail : ${data.email}\nTéléphone : ${data.phone || "Non renseigné"}\nVille : ${data.city}\nSujet : ${SUBJECTS[data.subject]}\n\n${data.message}\n\nConsentement au traitement de la demande : oui.`,
        },
        createTransport,
      );
      return response.status(200).json({ ok: true });
    } catch (error) {
      // Never log the SMTP response, credentials or visitors' message contents.
      logger.error("[contact] Échec SMTP :", safeSmtpErrorCode(error));
      return response.status(502).json({
        error:
          "L’envoi est temporairement indisponible. Réessayez ou contactez-nous directement.",
      });
    }
  };
}

export default createContactHandler();
