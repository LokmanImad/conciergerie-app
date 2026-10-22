import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPages, renderPage } from "../src/pages.mjs";
import { escapeHtml, safeUrl } from "../src/html.mjs";
import handler, {
  createContactHandler,
  validateContact,
} from "../api/contact.mjs";
import { brandLogo } from "../src/brand.mjs";

const site = JSON.parse(
  await readFile(new URL("../content/site.json", import.meta.url), "utf8"),
);
const payload = {
  name: "Test local",
  email: "exemple@example.com",
  phone: "",
  subject: "gestion-locative",
  city: "Tanger",
  message: "Une demande de test locale sans envoi externe.",
  consent: true,
  website: "",
  requestId: "5f8d2c40-0000-4000-8000-000000000000",
};

test("Les liens internes rendus correspondent à des pages existantes", () => {
  const pages = getPages(site);
  const routes = new Set(pages.map((page) => page.path));
  for (const page of pages) {
    const html = renderPage(site, page);
    for (const [, href] of html.matchAll(/href="(\/[^\"]*)"/g)) {
      const path = href.split(/[?#]/)[0] || "/";
      if (path.startsWith("/assets/")) continue;
      assert.ok(routes.has(path), `${page.path} → ${path}`);
    }
  }
});

test("Marrakech est présenté comme une ouverture prochaine", () => {
  const marrakech = site.destinations.find((city) => city.slug === "marrakech");
  assert.equal(marrakech.available, false);
  const page = getPages(site).find(
    (item) => item.path === "/destinations/marrakech",
  );
  assert.match(page.body, /ne sont pas encore ouverts/);
});

test("Aucun programme ou tarif fictif dans le catalogue initial", () => {
  assert.deepEqual(site.projects, []);
  assert.match(
    getPages(site).find((page) => page.path === "/projets").body,
    /catalogue en ligne est en préparation/,
  );
});

test("Les valeurs de contenu sont échappées et les liens dangereux rejetés", () => {
  assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("//example.com"), null);
  assert.equal(safeUrl("/assets/interior.webp"), "/assets/interior.webp");
});

test("Les deux logos officiels sont référencés sans l’ancien monogramme", async () => {
  assert.equal(site.branding.logoLight, "/assets/asad-logo-light.jpg");
  assert.equal(site.branding.logoDark, "/assets/asad-logo-dark.png");
  assert.match(brandLogo(site), /asad-logo-light\.jpg/);
  assert.match(brandLogo(site, "dark"), /asad-logo-dark\.png/);
  for (const variant of ["light", "dark"]) {
    const original = new URL(
      variant === "light"
        ? "../public/assets/WhatsApp Image 2025-11-17 à 18.32.00_833d0f08.jpg"
        : "../public/assets/WhatsApp_Image_2025-11-17_à_18.32.00_833d0f08-removebg-preview.png",
      import.meta.url,
    );
    const copy = new URL(
      variant === "light"
        ? "../public/assets/asad-logo-light.jpg"
        : "../public/assets/asad-logo-dark.png",
      import.meta.url,
    );
    assert.deepEqual(await readFile(copy), await readFile(original));
  }
  const rendered = renderPage(site, getPages(site)[0]);
  assert.doesNotMatch(rendered, /brand-mark\.svg/);
});

test("Le formulaire exige un consentement, un e-mail et un sujet valides", () => {
  assert.ok(validateContact(payload));
  for (const invalid of [
    { consent: false },
    { email: "incorrect" },
    { email: "a@example.com,b@example.com" },
    { email: "a@example.com\r\nBcc: b@example.com" },
    { email: "<a@example.com>" },
    { subject: "__proto__" },
    { city: "inconnue" },
    { message: "court" },
    { message: "a".repeat(5001) },
  ]) {
    assert.equal(validateContact({ ...payload, ...invalid }), null);
  }
  assert.deepEqual(validateContact({ ...payload, website: "spam" }), {
    spam: true,
  });
});

function responseStub() {
  return {
    code: 0,
    payload: null,
    setHeader() {},
    status(code) {
      this.code = code;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test("Le serveur refuse les requêtes externes et les méthodes inattendues", async () => {
  const response = responseStub();
  await handler({ method: "GET", headers: {} }, response);
  assert.equal(response.code, 405);
  await handler(
    { method: "POST", headers: { "sec-fetch-site": "cross-site" } },
    response,
  );
  assert.equal(response.code, 403);
});

test("Pas de faux succès lorsque le service d’e-mail n’est pas configuré", async () => {
  const response = responseStub();
  const unconfiguredHandler = createContactHandler({
    env: {},
    logger: { error() {} },
    createTransport() {
      assert.fail("Aucune connexion ne doit être tentée sans configuration.");
    },
  });
  await unconfiguredHandler(
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    },
    response,
  );
  assert.equal(response.code, 503);
  assert.equal(response.payload.ok, undefined);
});
