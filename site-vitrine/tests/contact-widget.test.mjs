import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  contactNumber,
  renderContactWidget,
  renderHeaderPhone,
} from "../src/contact-widget.mjs";
import { getPages, renderPage } from "../src/pages.mjs";

const site = JSON.parse(
  await readFile(new URL("../content/site.json", import.meta.url), "utf8"),
);

test("Les coordonnées d’appel et WhatsApp ne sont pas interverties", () => {
  const widget = renderContactWidget(site);
  assert.match(widget, /data-contact-call href="tel:\+212622625187"/);
  assert.match(
    widget,
    /data-contact-whatsapp href="https:\/\/wa\.me\/212669834697"/,
  );
  assert.match(widget, /target="_blank" rel="noopener noreferrer"/);
  assert.match(renderHeaderPhone(site), /href="tel:\+212622625187"/);
  assert.match(renderHeaderPhone(site), /aria-label="Appeler Asad Hospitality/);
});

test("Les numéros invalides ne peuvent pas injecter de liens ou de balises", () => {
  for (const value of [
    null,
    "",
    "javascript:alert(1)",
    '+212" onclick="test',
    "123",
    "+0123456789",
  ])
    assert.equal(contactNumber(value), null);
  assert.equal(contactNumber("+212 (622) 625-187"), "212622625187");
  assert.equal(renderContactWidget({ phone: "", whatsapp: "" }), "");
  assert.equal(renderHeaderPhone({ phone: "invalid" }), "");
});

test("Les moyens de contact absents sont omis et une alternative sans JavaScript existe", () => {
  const phoneOnly = renderContactWidget({ phone: site.phone });
  assert.match(phoneOnly, /data-contact-call/);
  assert.doesNotMatch(phoneOnly, /data-contact-whatsapp/);
  assert.match(phoneOnly, /<noscript><a[^>]+href="tel:\+212622625187"/);
  const whatsappOnly = renderContactWidget({ whatsapp: site.whatsapp });
  assert.doesNotMatch(whatsappOnly, /data-contact-call/);
  assert.match(
    whatsappOnly,
    /<noscript><a[^>]+href="https:\/\/wa\.me\/212669834697"/,
  );
});

test("Toutes les pages proposent un seul panneau de contact accessible et la feuille mobile", () => {
  for (const page of getPages(site)) {
    const html = renderPage(site, page);
    assert.equal([...html.matchAll(/id="contact-options"/g)].length, 1);
    assert.equal([...html.matchAll(/data-contact-widget/g)].length, 1);
    assert.match(html, /aria-controls="contact-options"/);
    assert.match(html, /assets\/mobile\.css/);
    assert.match(html, /viewport-fit=cover/);
    assert.match(html, /class="header-phone"/);
  }
});

test("Les styles et scripts portent une version cohérente pour éviter un ancien cache", () => {
  const html = renderPage(
    { ...site, assetVersion: "abc123" },
    getPages(site)[0],
  );
  for (const file of [
    "site.css",
    "brand.css",
    "experience.css",
    "navigation.css",
    "mobile.css",
    "site.js",
  ])
    assert.ok(html.includes(`/assets/${file}?v=abc123`));
});
