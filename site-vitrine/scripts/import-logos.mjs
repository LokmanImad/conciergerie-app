import { copyFile, readFile, writeFile } from "node:fs/promises";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputs = process.argv.slice(2);
if (inputs.length !== 2) {
  throw new Error(
    'Usage : node scripts/import-logos.mjs "chemin/logo-fond-clair.png" "chemin/logo-fond-noir.png"',
  );
}
const paths = inputs.map((input) => resolve(input));
const extensions = paths.map((input) => extname(input).toLowerCase());
if (
  extensions.some(
    (extension) => ![".png", ".jpg", ".jpeg", ".webp"].includes(extension),
  )
) {
  throw new Error("Les logos doivent être des fichiers PNG, JPG ou WebP.");
}
// Validate both inputs before modifying the site. Copy originals byte for byte.
await Promise.all(paths.map((input) => readFile(input)));
const filenames = extensions.map(
  (extension, index) =>
    `asad-logo-${index === 0 ? "light" : "dark"}${extension}`,
);
for (let index = 0; index < paths.length; index++) {
  const target = resolve(root, "public/assets", filenames[index]);
  if (paths[index] !== target) await copyFile(paths[index], target);
}
const configPath = resolve(root, "content/site.json");
const site = JSON.parse(await readFile(configPath, "utf8"));
site.branding = {
  ...site.branding,
  logoLight: `/assets/${filenames[0]}`,
  logoDark: `/assets/${filenames[1]}`,
  signature: "Where hospitality roars",
};
await writeFile(configPath, `${JSON.stringify(site, null, 2)}\n`);
console.log(
  "Les deux logos originaux sont intégrés. Lancez npm run build pour actualiser le site.",
);
