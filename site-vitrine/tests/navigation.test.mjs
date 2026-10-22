import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderNavigation } from "../src/navigation.mjs";
import { getPages, renderPage } from "../src/pages.mjs";

const site = JSON.parse(
  await readFile(new URL("../content/site.json", import.meta.url), "utf8"),
);

test("La navigation compacte est partagée par toutes les pages et conserve les logos officiels", () => {
  for (const page of getPages(site)) {
    const html = renderPage(site, page);
    assert.equal([...html.matchAll(/id="site-menu"/g)].length, 1);
    assert.match(html, /aria-controls="site-menu"/);
    assert.match(html, /id="site-menu" class="site-menu" hidden/);
    assert.match(html, /assets\/navigation\.css/);
    assert.match(html, /asad-logo-light\.jpg/);
    assert.doesNotMatch(html, /id="mobile-menu"/);
    assert.doesNotMatch(
      html,
      /<dialog|aria-modal=|data-menu-image|menu-postcard/,
    );
    const desktop = html.match(/<nav class="desktop-nav"[\s\S]*?<\/nav>/)[0];
    assert.equal([...desktop.matchAll(/<a href=/g)].length, 4);
    assert.match(desktop, /more-toggle/);
  }
});

test("Les services, projets, villes et application restent accessibles sans JavaScript", () => {
  const html = renderNavigation(site, "/");
  const fallback = html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1];
  for (const href of [
    "/gestion-locative",
    "/sous-location",
    "/achat-investissement",
    "/destinations",
    "/projets",
    "/a-propos",
    "/#application",
    "/contact",
  ]) {
    assert.ok(fallback.includes(`href="${href}"`));
  }
  assert.match(html, /href="\/contact"/);
  assert.match(html, /En développement/);
});

test("La page courante est indiquée dans les liens directs et le menu mobile", () => {
  const html = renderNavigation(site, "/sous-location");
  assert.match(html, /href="\/sous-location" aria-current="page"/);
  assert.equal(
    [...html.matchAll(/href="\/sous-location" aria-current="page"/g)].length,
    3,
  );
  const destination = renderNavigation(site, "/destinations/tanger");
  assert.doesNotMatch(
    destination,
    /href="\/destinations"[^>]*aria-current="page"/,
  );
});

test("Le menu secondaire reste léger et annonce honnêtement l’application en développement", () => {
  const html = renderNavigation(site, "/");
  const panel = html.slice(html.indexOf('<div id="site-menu"'));
  assert.doesNotMatch(panel, /<img|<h[1-6]/);
  assert.match(panel, /En développement/);
  const secondary = html.match(/<nav class="menu-secondary"[\s\S]*?<\/nav>/)[0];
  assert.equal([...secondary.matchAll(/<a href=/g)].length, 3);
  assert.match(html, /data-menu-close aria-label="Fermer le menu"/);
});
