import imageCompression from "browser-image-compression";

const IMAGE_QUALITIES = {
  thumbnail: {
    maxSizeMB: 0.1,
    maxWidthOrHeight: 150,
    useWebWorker: true,
  },
  medium: {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 600,
    useWebWorker: true,
  },
  full: {
    maxSizeMB: 2,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  },
};

const validateImageSignature = async (file) => {
  const buffer = await file.arrayBuffer();
  const arr = new Uint8Array(buffer).subarray(0, 4);
  const header = Array.from(arr)
    .map((byte) => byte.toString(16))
    .join("");

  const validSignatures = {
    ffd8ffe0: "image/jpeg", // JPEG
    "89504e47": "image/png", // PNG
    47494638: "image/gif", // GIF
    52494646: "image/webp", // WebP
  };

  if (!validSignatures[header]) {
    throw new Error("Invalid image file");
  }
  return buffer;
};

const getQualitySettings = (fileSize, metadata, quality) => {
  const { width, height } = metadata;
  const mpixels = (width * height) / 1000000;

  if (quality === "thumbnail") return 0.65;
  if (mpixels > 4) return 0.75; // High-res images
  if (fileSize > 5 * 1024 * 1024) return 0.8; // Large files
  return 0.85; // Default quality
};

export const getImageDimensions = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
      });
    };
    img.src = URL.createObjectURL(file);
  });
};

export const processImage = async (file, uniqueId) => {
  try {
    // Security validations
    await validateImageSignature(file);

    // Size validation
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      throw new Error(
        `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`
      );
    }

    const processedFiles = {};
    const metadata = await getImageDimensions(file);

    // Validate dimensions
    if (metadata.width < 200 || metadata.height < 200) {
      throw new Error(
        "Image dimensions too small. Minimum 200x200 pixels required."
      );
    }

    // Add timestamp to prevent caching issues
    const timestamp = Date.now();

    for (const [quality, options] of Object.entries(IMAGE_QUALITIES)) {
      const compressedFile = await imageCompression(file, {
        ...options,
        fileType: "image/webp",
        initialQuality: getQualitySettings(file.size, metadata, quality),
        alwaysKeepResolution: quality === "full",
      });

      processedFiles[quality] = {
        file: compressedFile,
        preview: URL.createObjectURL(compressedFile) + `?t=${timestamp}`,
        size: compressedFile.size,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.width / metadata.height,
        },
      };
    }

    return processedFiles;
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

export const generateBlurPlaceholder = async (file) => {
  const options = {
    maxSizeMB: 0.001,
    maxWidthOrHeight: 10,
    useWebWorker: true,
    fileType: "image/webp",
  };

  const tiny = await imageCompression(file, options);
  return URL.createObjectURL(tiny);
};
