const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const MODELS_DIR = path.join(__dirname, "models");
const BASE_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

// Each model consists of a manifest JSON + one or more shard .bin files.
const MODEL_FILES = [
  // SSD MobileNet v1
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model-shard1",
  "ssd_mobilenetv1_model-shard2",
  // Face Landmark 68
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  // Face Recognition
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
];

function download(url, dest) {
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
        return download(response.headers.location, dest).then(resolve, reject);
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

async function main() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`Created directory: ${MODELS_DIR}`);
  }

  for (const file of MODEL_FILES) {
    const dest = path.join(MODELS_DIR, file);

    if (fs.existsSync(dest)) {
      console.log(`[skip] ${file} already exists.`);
      continue;
    }

    const url = `${BASE_URL}/${file}`;
    console.log(`[download] ${file} ...`);
    try {
      await download(url, dest);
      console.log(`[done] ${file}`);
    } catch (err) {
      console.error(`[error] ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log("\nAll model files are ready.");
}

main();
