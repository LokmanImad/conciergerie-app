import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPages, renderPage } from "../src/pages.mjs";
import { escapeHtml, safeUrl } from "../src/html.mjs";

export const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export async function build() {
  const site = JSON.parse(
    await readFile(resolve(projectRoot, "content/site.json"), "utf8"),
  );
  site.email = process.env.PUBLIC_CONTACT_EMAIL || site.email;
  site.phone = process.env.PUBLIC_CONTACT_PHONE || site.phone;
  site.whatsapp = process.env.PUBLIC_WHATSAPP_NUMBER || site.whatsapp;
  if (!safeUrl(site.url) || !safeUrl(site.appUrl))
    throw new Error(
      "Les adresses du site et de l’application doivent utiliser HTTPS.",
    );
  const output = resolve(projectRoot, "dist");
  await mkdir(output, { recursive: true });
  await cp(resolve(projectRoot, "public"), output, { recursive: true });
  const pages = getPages(site);
  for (const page of pages) {
    const filename = resolve(
      output,
      page.path === "/" ? "index.html" : `${page.path.slice(1)}.html`,
    );
    await mkdir(dirname(filename), { recursive: true });
    await writeFile(filename, renderPage(site, page));
  }
  await writeFile(
    resolve(output, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages
      .filter((page) => !page.noindex)
      .map(
        (page) =>
          `<url><loc>${escapeHtml(new URL(page.path, site.url).href)}</loc></url>`,
      )
      .join("")}</urlset>`,
  );
  await writeFile(
    resolve(output, "robots.txt"),
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${site.url}/sitemap.xml\n`,
  );
  console.log(
    `Asad Hospitality : ${pages.length} pages générées dans site-vitrine/dist.`,
  );
  return { pages, site, output };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await build();
