const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const MODELS_DIR = path.join(__dirname, "models");
const BASE_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

// Manifest files for the three models we need.
// We download each manifest, parse it, and then download every
// weight file referenced inside it.
const MANIFESTS = [
  "ssd_mobilenetv1_model-weights_manifest.json",
  "face_landmark_68_model-weights_manifest.json",
  "face_recognition_model-weights_manifest.json",
];

/** Download a URL to a local file path, following redirects. */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = url.startsWith("https") ? https.get : http.get;

    get(url, (response) => {
      // Follow redirects (301/302)
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve, reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(
          new Error(`Failed to download ${url} — HTTP ${response.statusCode}`)
        );
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/** Download a URL and return its body as a string (for JSON manifests). */
function downloadText(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith("https") ? https.get : http.get;

    get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        return downloadText(response.headers.location).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        return reject(
          new Error(`Failed to fetch ${url} — HTTP ${response.statusCode}`)
        );
      }
      let data = "";
      response.on("data", (chunk) => (data += chunk));
      response.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

/** Fetch helper: download a file if it doesn't already exist locally. */
async function ensureFile(fileName) {
  const dest = path.join(MODELS_DIR, fileName);
  if (fs.existsSync(dest)) {
    console.log(`[skip]     ${fileName} (already exists)`);
    return;
  }
  const url = `${BASE_URL}/${fileName}`;
  console.log(`[download] ${fileName} ...`);
  await downloadFile(url, dest);
  console.log(`[done]     ${fileName}`);
}

async function main() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`Created directory: ${MODELS_DIR}`);
  }

  for (const manifest of MANIFESTS) {
    console.log(`\n--- ${manifest} ---`);

    // 1. Download the manifest JSON
    await ensureFile(manifest);

    // 2. Parse it to discover referenced weight files
    const manifestPath = path.join(MODELS_DIR, manifest);
    const manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // Manifest is an array of { paths: [...], weights: [...] } entries.
    const weightFiles = new Set();
    for (const entry of manifestJson) {
      if (entry.paths) {
        for (const p of entry.paths) {
          weightFiles.add(p);
        }
      }
    }

    // 3. Download each weight file
    for (const wf of weightFiles) {
      try {
        await ensureFile(wf);
      } catch (err) {
        console.error(`[error]    ${wf}: ${err.message}`);
        process.exit(1);
      }
    }
  }

  console.log("\nAll model files are ready.");
}

main();
