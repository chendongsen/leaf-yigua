import { createReadStream, statSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const clean = normalize(decoded === "/" ? "/index.html" : decoded);
  return join(root, clean);
}

createServer((request, response) => {
  const filePath = safePath(request.url || "/");
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const stats = statSync(filePath);
  const type = types[extname(filePath).toLowerCase()] || "application/octet-stream";
  const range = request.headers.range;

  if (range) {
    const [startRaw, endRaw] = range.replace(/bytes=/, "").split("-");
    const start = Number(startRaw);
    const end = endRaw ? Number(endRaw) : stats.size - 1;
    response.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stats.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": type,
    });
    createReadStream(filePath, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, {
    "Content-Length": stats.size,
    "Content-Type": type,
    "Accept-Ranges": "bytes",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`LULU AI STUDIO preview: http://localhost:${port}`);
});
