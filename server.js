const express = require("express");
const cors = require("cors");
const faceapi = require("@vladmandic/face-api");
const canvas = require("canvas");
const path = require("path");

// Monkey-patch face-api with Node.js canvas implementations
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();
const PORT = process.env.PORT || 3001;
const MODELS_PATH = path.join(__dirname, "models");

let modelsLoaded = false;

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ------------------------------------------------------------------
// Load face-api models once at startup
// ------------------------------------------------------------------
async function loadModels() {
  console.log("Loading face-api models from", MODELS_PATH);
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
  modelsLoaded = true;
  console.log("All face-api models loaded successfully.");
}

// ------------------------------------------------------------------
// POST /verify-face
// ------------------------------------------------------------------
app.post("/verify-face", async (req, res) => {
  try {
    const { image_base64 } = req.body;

    if (!image_base64) {
      return res.status(400).json({ error: "Missing image_base64 in request body." });
    }

    // Decode base64 → Buffer → canvas Image
    const buffer = Buffer.from(image_base64, "base64");
    const img = await canvas.loadImage(buffer);

    // Detect a single face with landmarks + descriptor
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return res.status(200).json({ error: "No face detected in the image." });
    }

    // Return the 128-dimensional descriptor as a plain array
    const descriptor = Array.from(detection.descriptor);
    return res.status(200).json({ descriptor });
  } catch (err) {
    console.error("Error in /verify-face:", err);
    return res.status(500).json({ error: err.message || "Internal server error." });
  }
});

// ------------------------------------------------------------------
// GET /health
// ------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", modelsLoaded });
});

// ------------------------------------------------------------------
// Start server
// ------------------------------------------------------------------
loadModels()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Face-verify server listening on 0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to load models:", err);
    process.exit(1);
  });
