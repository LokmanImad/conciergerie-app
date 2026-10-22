import nodemailer from "nodemailer";

export function isEmailAddress(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@<>,;:"\\\x00-\x1f\x7f]+@[^\s@<>,;:"\\\x00-\x1f\x7f]+\.[^\s@<>,;:"\\\x00-\x1f\x7f]+$/.test(
      value,
    )
  );
}

export class SmtpConfigurationError extends Error {
  constructor(fields) {
    // Only variable names belong in this error, never their values.
    super(`Paramètres SMTP manquants ou invalides : ${fields.join(", ")}.`);
    this.name = "SmtpConfigurationError";
    this.fields = fields;
  }
}

export function getSmtpConfiguration(env = process.env) {
  const value = (key) => String(env[key] || "").trim();
  const host = value("SMTP_HOST");
  const user = value("SMTP_USER");
  // A password may intentionally contain leading/trailing spaces.
  const pass = env.SMTP_PASSWORD;
  const from = value("CONTACT_FROM_EMAIL");
  const to = value("CONTACT_TO_EMAIL");
  const port = Number(value("SMTP_PORT") || "465");
  const secureValue = value("SMTP_SECURE").toLowerCase();
  const secure = secureValue ? secureValue === "true" : port === 465;
  const invalid = [];

  if (
    !host ||
    host.length > 253 ||
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host)
  )
    invalid.push("SMTP_HOST");
  if (!user || /[\r\n\0]/.test(user)) invalid.push("SMTP_USER");
  if (typeof pass !== "string" || !pass.length) invalid.push("SMTP_PASSWORD");
  if (!isEmailAddress(from)) invalid.push("CONTACT_FROM_EMAIL");
  if (!isEmailAddress(to)) invalid.push("CONTACT_TO_EMAIL");
  if (port !== 465 && port !== 587) invalid.push("SMTP_PORT");
  if (
    (secureValue && !["true", "false"].includes(secureValue)) ||
    (port === 465 && !secure) ||
    (port === 587 && secure)
  )
    invalid.push("SMTP_SECURE");
  if (invalid.length) throw new SmtpConfigurationError(invalid);

  return {
    from,
    to,
    transport: {
      host,
      port,
      secure,
      requireTLS: !secure,
      auth: { user, pass },
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      dnsTimeout: 5000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    },
  };
}

export async function sendSmtpMessage(
  configuration,
  message,
  createTransport = nodemailer.createTransport,
) {
  const transport = createTransport(configuration.transport);
  try {
    const info = await transport.sendMail({
      ...message,
      from: { name: "Asad Hospitality", address: configuration.from },
      to: [{ address: configuration.to }],
      // The SMTP envelope cannot be changed by a visitor's e-mail address.
      envelope: { from: configuration.from, to: [configuration.to] },
    });
    const accepted = info.accepted?.some(
      (recipient) =>
        (typeof recipient === "string"
          ? recipient
          : recipient?.address
        )?.toLowerCase() === configuration.to.toLowerCase(),
    );
    if (!accepted) {
      const error = new Error("Le serveur n’a pas accepté le destinataire.");
      error.code = "EENVELOPE";
      throw error;
    }
    return info;
  } finally {
    transport.close();
  }
}

export async function verifySmtpConfiguration(
  env = process.env,
  createTransport = nodemailer.createTransport,
) {
  const configuration = getSmtpConfiguration(env);
  const transport = createTransport(configuration.transport);
  try {
    // verify() checks DNS, TLS and authentication; it never sends an e-mail.
    return await transport.verify();
  } finally {
    transport.close();
  }
}

export function safeSmtpErrorCode(error) {
  const known = new Set([
    "EAUTH",
    "ECONNECTION",
    "ECONNREFUSED",
    "EDNS",
    "EENVELOPE",
    "EMESSAGE",
    "ESOCKET",
    "ETIMEDOUT",
    "ETLS",
    "CERT_HAS_EXPIRED",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "ERR_TLS_CERT_ALTNAME_INVALID",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  ]);
  return known.has(error?.code) ? error.code : "SMTP_ERROR";
}
