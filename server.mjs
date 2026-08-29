// Production entry point for plain Node.js hosting (Cloud Run / Firebase App
// Hosting's generic Node buildpack). TanStack Start has no built-in
// standalone server — `dist/server/server.js` exports a fetch-style handler
// (`{ fetch(request) }`) that this file wires up to Node's http module. This
// is the pattern documented at
// https://tanstack.com/start/latest/docs/framework/react/guide/hosting for
// "plain Node.js" deployments.
//
// Static assets are served with a hand-rolled reader rather than a package
// like `sirv`: App Hosting's Node buildpack installs dependencies into a
// buildpack-layer directory outside Node's default module resolution path
// and never sets NODE_PATH, so any bare-specifier `import` here fails at
// runtime with ERR_MODULE_NOT_FOUND — confirmed by deploying with `sirv` and
// hitting exactly that. TanStack Start's own server bundle avoids this
// because Vite inlines its dependencies at build time; a plain unbundled
// npm import from this file does not get that treatment.
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { dirname, extname, join, normalize, sep } from "node:path"
import { Readable } from "node:stream"
import { fileURLToPath } from "node:url"
import serverEntry from "./dist/server/server.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const clientDir = join(__dirname, "dist/client")

const MIME_TYPES = {
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".webmanifest": "application/manifest+json; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".txt": "text/plain; charset=utf-8",
	".map": "application/json; charset=utf-8",
}

/** Serves a file from dist/client if one matches the request path. Returns whether it did. */
async function serveStaticAsset(req, res) {
	const url = new URL(req.url, "http://localhost")
	const decodedPath = decodeURIComponent(url.pathname)
	const filePath = normalize(join(clientDir, decodedPath))
	if (filePath !== clientDir && !filePath.startsWith(clientDir + sep)) return false

	let stats
	try {
		stats = await stat(filePath)
	} catch {
		return false
	}
	if (!stats.isFile()) return false

	res.setHeader("Content-Type", MIME_TYPES[extname(filePath)] ?? "application/octet-stream")
	res.setHeader("Content-Length", stats.size)
	// Vite's hashed filenames under /assets/ never change content, so cache
	// them for a year; everything else gets no special caching.
	if (decodedPath.startsWith("/assets/")) {
		res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
	}
	res.statusCode = 200
	createReadStream(filePath).pipe(res)
	return true
}

const port = Number(process.env.PORT) || 3000
const host = "0.0.0.0"

function toWebRequest(req) {
	const url = `http://${req.headers.host ?? `localhost:${port}`}${req.url}`
	const hasBody = req.method !== "GET" && req.method !== "HEAD"
	const headers = new Headers()
	for (const [key, value] of Object.entries(req.headers)) {
		if (value === undefined) continue
		headers.set(key, Array.isArray(value) ? value.join(", ") : value)
	}
	return new Request(url, {
		method: req.method,
		headers,
		body: hasBody ? Readable.toWeb(req) : undefined,
		duplex: hasBody ? "half" : undefined,
	})
}

const server = createServer(async (req, res) => {
	try {
		if (req.method === "GET" || req.method === "HEAD") {
			const served = await serveStaticAsset(req, res)
			if (served) return
		}
		const response = await serverEntry.fetch(toWebRequest(req))
		res.statusCode = response.status
		for (const [key, value] of response.headers) {
			res.setHeader(key, value)
		}
		if (response.body) {
			Readable.fromWeb(response.body).pipe(res)
		} else {
			res.end()
		}
	} catch (err) {
		console.error(err)
		res.statusCode = 500
		res.end("Internal Server Error")
	}
})

server.listen(port, host, () => {
	console.log(`Server listening on http://${host}:${port}`)
})
