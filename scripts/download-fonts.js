const fs = require("fs");
const path = require("path");
const https = require("https");

// Font URLs from Google Fonts
const ROBOTO_REGULAR_URL =
  "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf";
const ROBOTO_BOLD_URL =
  "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc-.ttf";
const ROBOTO_MONO_URL =
  "https://fonts.gstatic.com/s/robotomono/v22/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_SuW4.ttf";

// Font directory
const FONT_DIRECTORY = path.join(process.cwd(), "public/fonts");

// Function to download a font file
function downloadFont(url, destination) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading font from ${url} to ${destination}...`);
    const file = fs.createWriteStream(destination);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log(`Downloaded ${destination} successfully`);
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(destination, () => {}); // Delete the file if there's an error
        console.error(`Error downloading ${url}:`, err.message);
        reject(err);
      });
  });
}

async function downloadFonts() {
  try {
    // Create font directory if it doesn't exist
    if (!fs.existsSync(FONT_DIRECTORY)) {
      fs.mkdirSync(FONT_DIRECTORY, { recursive: true });
      console.log(`Created font directory: ${FONT_DIRECTORY}`);
    }

    // Download Roboto Regular
    const robotoRegularPath = path.join(FONT_DIRECTORY, "Roboto-Regular.ttf");
    if (!fs.existsSync(robotoRegularPath)) {
      await downloadFont(ROBOTO_REGULAR_URL, robotoRegularPath);
    } else {
      console.log(`${robotoRegularPath} already exists, skipping download`);
    }

    // Download Roboto Bold
    const robotoBoldPath = path.join(FONT_DIRECTORY, "Roboto-Bold.ttf");
    if (!fs.existsSync(robotoBoldPath)) {
      await downloadFont(ROBOTO_BOLD_URL, robotoBoldPath);
    } else {
      console.log(`${robotoBoldPath} already exists, skipping download`);
    }

    // Download Roboto Mono
    const robotoMonoPath = path.join(FONT_DIRECTORY, "RobotoMono-Regular.ttf");
    if (!fs.existsSync(robotoMonoPath)) {
      await downloadFont(ROBOTO_MONO_URL, robotoMonoPath);
    } else {
      console.log(`${robotoMonoPath} already exists, skipping download`);
    }

    console.log("All fonts downloaded successfully!");
  } catch (error) {
    console.error("Error downloading fonts:", error);
    process.exit(1);
  }
}

// Run the download function
downloadFonts();
