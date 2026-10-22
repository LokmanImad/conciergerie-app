import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { createServer } from "node:http";
import { once } from "node:events";
import { createContactHandler } from "../api/contact.mjs";
import {
  getSmtpConfiguration,
  safeSmtpErrorCode,
  sendSmtpMessage,
  SmtpConfigurationError,
  verifySmtpConfiguration,
} from "../lib/smtp.mjs";

// Reserved example domains and an injected transport: no external SMTP traffic.
const env = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USER: "contact@example.com",
  SMTP_PASSWORD: "test-password-not-a-real-secret",
  CONTACT_FROM_EMAIL: "contact@example.com",
  CONTACT_TO_EMAIL: "inbox@example.com",
};
const body = {
  name: "Visiteur test",
  email: "visitor@example.net",
  phone: "+212600000000",
  subject: "gestion-locative",
  city: "Tétouan",
  message: "Je souhaite vous confier la gestion de mon appartement.",
  consent: true,
  website: "",
  requestId: "5f8d2c40-0000-4000-8000-000000000000",
};
const request = (payload = body) => ({
  method: "POST",
  headers: {
    "content-type": "application/json",
    "sec-fetch-site": "same-origin",
  },
  body: payload,
});
function responseStub() {
  return {
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test("SMTP 465 impose TLS et la validation du certificat sans journaliser les secrets", () => {
  const configuration = getSmtpConfiguration(env);
  assert.equal(configuration.transport.port, 465);
  assert.equal(configuration.transport.secure, true);
  assert.equal(configuration.transport.tls.rejectUnauthorized, true);
  assert.equal(configuration.transport.tls.minVersion, "TLSv1.2");
  assert.equal(configuration.transport.logger, false);
  assert.equal(configuration.transport.debug, false);
  assert.equal(configuration.transport.disableFileAccess, true);
  assert.equal(configuration.transport.disableUrlAccess, true);
  const passwordWithSpaces = " password with spaces ";
  assert.equal(
    getSmtpConfiguration({ ...env, SMTP_PASSWORD: passwordWithSpaces })
      .transport.auth.pass,
    passwordWithSpaces,
  );
});

test("SMTP 587 exige STARTTLS, même si SMTP_SECURE n’est pas renseigné", () => {
  for (const secure of ["false", ""]) {
    const configuration = getSmtpConfiguration({
      ...env,
      SMTP_PORT: "587",
      SMTP_SECURE: secure,
    });
    assert.equal(configuration.transport.secure, false);
    assert.equal(configuration.transport.requireTLS, true);
  }
});

test("Les paramètres incomplets, adresses multiples et combinaisons non sûres sont rejetés", () => {
  for (const invalid of [
    { SMTP_HOST: "" },
    { SMTP_HOST: "https://smtp.example.com" },
    { SMTP_USER: "" },
    { SMTP_PASSWORD: "" },
    { SMTP_PORT: "25" },
    { SMTP_SECURE: "false" },
    { SMTP_SECURE: "oui" },
    { SMTP_PORT: "587", SMTP_SECURE: "true" },
    { CONTACT_FROM_EMAIL: "Asad <contact@example.com>" },
    { CONTACT_TO_EMAIL: "one@example.com,two@example.com" },
    { CONTACT_FROM_EMAIL: "a@example.com\r\nBcc:b@example.com" },
  ]) {
    assert.throws(
      () => getSmtpConfiguration({ ...env, ...invalid }),
      SmtpConfigurationError,
    );
  }
  assert.throws(
    () =>
      getSmtpConfiguration({
        ...env,
        SMTP_HOST: "",
        SMTP_PASSWORD: "secret-value",
      }),
    (error) =>
      error.fields.includes("SMTP_HOST") &&
      !error.message.includes("secret-value"),
  );
});

test("Le formulaire garde l’expéditeur officiel et permet de répondre au visiteur", async () => {
  let sent;
  let closed = false;
  const handler = createContactHandler({
    env,
    createTransport(options) {
      assert.equal(options.auth.user, env.SMTP_USER);
      return {
        async sendMail(message) {
          sent = message;
          return { accepted: [env.CONTACT_TO_EMAIL], rejected: [] };
        },
        close() {
          closed = true;
        },
      };
    },
  });
  const response = responseStub();
  await handler(
    request({
      ...body,
      to: "attacker@example.net",
      from: "attacker@example.net",
    }),
    response,
  );
  assert.equal(response.code, 200);
  assert.deepEqual(response.payload, { ok: true });
  assert.equal(response.headers["Cache-Control"], "no-store");
  assert.deepEqual(sent.from, {
    name: "Asad Hospitality",
    address: env.CONTACT_FROM_EMAIL,
  });
  assert.deepEqual(sent.to, [{ address: env.CONTACT_TO_EMAIL }]);
  assert.deepEqual(sent.envelope, {
    from: env.CONTACT_FROM_EMAIL,
    to: [env.CONTACT_TO_EMAIL],
  });
  assert.deepEqual(sent.replyTo, { address: body.email });
  assert.match(sent.subject, /Gestion locative — Tétouan/);
  assert.ok(sent.text.includes(body.message));
  assert.match(sent.messageId, /^<asad-contact-[a-f0-9]{64}@example\.com>$/);
  assert.equal(closed, true);
});

test("Une erreur SMTP ou un destinataire refusé ne produit jamais un succès", async () => {
  for (const result of ["authentication", "rejected", "wrong-recipient"]) {
    let closed = false;
    const logs = [];
    const handler = createContactHandler({
      env,
      logger: { error: (...items) => logs.push(items.join(" ")) },
      createTransport: () => ({
        async sendMail() {
          if (result === "authentication") {
            throw Object.assign(
              new Error(`Private server reply ${env.SMTP_PASSWORD}`),
              { code: "EAUTH" },
            );
          }
          return {
            accepted: result === "rejected" ? [] : ["other@example.com"],
          };
        },
        close() {
          closed = true;
        },
      }),
    });
    const response = responseStub();
    await handler(request(), response);
    assert.equal(response.code, 502);
    assert.equal(response.payload.ok, undefined);
    assert.equal(closed, true);
    assert.doesNotMatch(
      JSON.stringify(response.payload) + logs.join(""),
      /test-password-not-a-real-secret|Private server reply/,
    );
    assert.match(
      logs.join(""),
      result === "authentication" ? /EAUTH/ : /EENVELOPE/,
    );
  }
  assert.equal(
    safeSmtpErrorCode({ code: "some private server information" }),
    "SMTP_ERROR",
  );
});

test("La vérification SMTP contrôle la connexion mais n’envoie aucun message", async () => {
  let verified = false;
  let closed = false;
  await verifySmtpConfiguration(env, () => ({
    async verify() {
      verified = true;
      return true;
    },
    sendMail() {
      assert.fail("La vérification ne doit envoyer aucun e-mail.");
    },
    close() {
      closed = true;
    },
  }));
  assert.equal(verified, true);
  assert.equal(closed, true);
});

test("La connexion est libérée même si la vérification SMTP échoue", async () => {
  let closed = false;
  await assert.rejects(
    verifySmtpConfiguration(env, () => ({
      async verify() {
        throw Object.assign(new Error("test"), { code: "EAUTH" });
      },
      close() {
        closed = true;
      },
    })),
    { code: "EAUTH" },
  );
  assert.equal(closed, true);
});

test("Le champ anti-robot et les charges invalides ne déclenchent aucune connexion SMTP", async () => {
  const handler = createContactHandler({
    env,
    createTransport() {
      assert.fail("Aucun SMTP pour une demande rejetée.");
    },
  });
  const response = responseStub();
  await handler(request({ ...body, website: "spam" }), response);
  assert.equal(response.code, 200);
  await handler(request({ ...body, email: "invalid" }), response);
  assert.equal(response.code, 400);
  await handler({ ...request(), body: "not json" }, response);
  assert.equal(response.code, 400);
  await handler(request({ ...body, message: "a".repeat(17000) }), response);
  assert.equal(response.code, 413);
  await handler(
    { ...request(), headers: { "content-type": "text/plain" } },
    response,
  );
  assert.equal(response.code, 415);
});

test("Nodemailer compose réellement le message sans réseau avec le transport mémoire", async () => {
  let mime;
  await sendSmtpMessage(
    getSmtpConfiguration(env),
    {
      subject: "Demande Asad Hospitality",
      text: "Un message de test, sans envoi externe.",
      replyTo: { address: body.email },
    },
    () => {
      const transport = nodemailer.createTransport({
        streamTransport: true,
        buffer: true,
        newline: "unix",
      });
      return {
        async sendMail(message) {
          const info = await transport.sendMail(message);
          mime = info.message.toString("utf8");
          return { ...info, accepted: info.envelope.to };
        },
        close() {
          transport.close();
        },
      };
    },
  );
  assert.match(mime, /From: Asad Hospitality <contact@example\.com>/);
  assert.match(mime, /To: inbox@example\.com/);
  assert.match(mime, /Reply-To: visitor@example\.net/);
  assert.match(mime, /Content-Type: text\/plain; charset=utf-8/);
});

test("Une requête HTTP réelle est lue et transmise au transport simulé sans SMTP externe", async (t) => {
  let sentCount = 0;
  const handler = createContactHandler({
    env,
    createTransport: () => ({
      async sendMail(message) {
        sentCount += 1;
        assert.deepEqual(message.replyTo, { address: body.email });
        return { accepted: [env.CONTACT_TO_EMAIL] };
      },
      close() {},
    }),
  });
  const server = createServer((request, response) => {
    response.status = (code) => {
      response.statusCode = code;
      return response;
    };
    response.json = (payload) => {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(payload));
    };
    handler(request, response).catch(() => {
      response.statusCode = 500;
      response.end();
    });
  });
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/api/contact`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(sentCount, 1);
  const rejected = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "cross-site",
    },
    body: JSON.stringify(body),
  });
  assert.equal(rejected.status, 403);
  assert.equal(sentCount, 1);
});
