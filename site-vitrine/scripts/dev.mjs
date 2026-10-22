import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { build } from "./build.mjs";
import handleContact from "../api/contact.mjs";

const { output } = await build();
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if (url.pathname === "/api/contact") {
    response.status = (code) => {
      response.statusCode = code;
      return response;
    };
    response.json = (data) => {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(data));
    };
    try {
      await handleContact(request, response);
    } catch {
      response.status(500).json({ error: "Une erreur est survenue." });
    }
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  try {
    const decoded = decodeURIComponent(url.pathname);
    let filename = resolve(output, decoded.replace(/^\/+/, "") || "index.html");
    if (filename !== output && !filename.startsWith(output + sep)) {
      response.writeHead(400);
      response.end();
      return;
    }
    if (!extname(filename)) filename += ".html";
    let code = 200;
    try {
      await stat(filename);
    } catch {
      filename = resolve(output, "404.html");
      code = 404;
    }
    response.writeHead(code, {
      "Content-Type": types[extname(filename)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(
      request.method === "HEAD" ? undefined : await readFile(filename),
    );
  } catch {
    response.writeHead(400);
    response.end("Adresse invalide.");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Asad Hospitality — Local: http://127.0.0.1:${port}`),
);
