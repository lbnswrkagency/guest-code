// utils/imageOptimizer.js
const sharp = require("sharp");
const chalk = require("chalk");

const optimizeImage = async (buffer, options = {}) => {
  const {
    maxWidth = 500, // Maximum width for avatar
    maxHeight = 500, // Maximum height for avatar
    quality = 80, // JPEG quality (0-100)
    maxSizeKB = 200, // Target max file size in KB
  } = options;

  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata();

    // Initialize Sharp with the buffer
    let processedImage = sharp(buffer);

    // Resize image while maintaining aspect ratio
    processedImage = processedImage
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality }); // Convert to JPEG with specified quality

    // Get the optimized buffer
    let optimizedBuffer = await processedImage.toBuffer();
    let currentQuality = quality;

    // If the image is still too large, gradually reduce quality until it meets the size requirement
    while (optimizedBuffer.length > maxSizeKB * 1024 && currentQuality > 40) {
      currentQuality -= 5;

      optimizedBuffer = await sharp(buffer)
        .resize(maxWidth, maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: currentQuality })
        .toBuffer();
    }

    const finalMetadata = await sharp(optimizedBuffer).metadata();

    return optimizedBuffer;
  } catch (error) {
    console.error(chalk.red("[Image Optimizer] Error:"), error);
    throw new Error("Image optimization failed");
  }
};

module.exports = { optimizeImage };
