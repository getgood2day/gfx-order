const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

// Initialize Express app
const app = express();
const PORT = 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS for frontend communication
app.use(express.static("public")); // Serve static files

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Discord Webhook URL (replace with your webhook URL)
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN";

// Global storage for references (this can be replaced with a database in production)
const referencesDir = path.join(__dirname, "public/references");

// Ensure references directory exists
if (!fs.existsSync(referencesDir)) {
  fs.mkdirSync(referencesDir, { recursive: true });
}

// Route to handle form submission
app.post("/submit-order", upload.single("reference-upload"), async (req, res) => {
  try {
    const { designType, packageType, details, selectedReference } = req.body;
    const referenceFile = req.file;

    // Build Discord message
    const discordMessage = {
      content: "New Order Received!",
      embeds: [
        {
          title: "Order Details",
          fields: [
            { name: "Design Type", value: designType, inline: true },
            { name: "Package", value: packageType, inline: true },
            { name: "Details", value: details || "N/A", inline: false },
            { name: "Selected Reference", value: selectedReference || "None", inline: false }
          ],
          color: 0x00ff00,
        },
      ],
    };

    // Prepare form data for Discord Webhook
    const formData = new FormData();
    formData.append("payload_json", JSON.stringify(discordMessage));

    // Attach uploaded file if present
    if (referenceFile) {
      formData.append("file", fs.createReadStream(referenceFile.path), referenceFile.originalname);
    }

    // Send data to Discord Webhook
    await axios.post(DISCORD_WEBHOOK_URL, formData, { headers: formData.getHeaders() });

    // Cleanup uploaded file
    if (referenceFile) fs.unlinkSync(referenceFile.path);

    res.status(200).json({ message: "Order submitted successfully!" });
  } catch (error) {
    console.error("Error sending order to Discord:", error);
    res.status(500).json({ message: "Failed to submit order." });
  }
});

// Route to upload a new reference (admin only)
app.post("/admin/upload-reference", upload.single("reference"), (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Move file to references directory
    const newFilePath = path.join(referencesDir, file.originalname);
    fs.renameSync(file.path, newFilePath);

    res.status(200).json({ message: "Reference uploaded successfully!" });
  } catch (error) {
    console.error("Error uploading reference:", error);
    res.status(500).json({ message: "Failed to upload reference." });
  }
});

// Route to get all references
app.get("/references", (req, res) => {
  try {
    const files = fs.readdirSync(referencesDir);
    const references = files.map((file) => `/references/${file}`);
    res.status(200).json(references);
  } catch (error) {
    console.error("Error retrieving references:", error);
    res.status(500).json({ message: "Failed to retrieve references." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});