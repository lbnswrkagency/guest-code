const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const chalk = require("chalk");
const crypto = require("crypto");

const {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET_NAME,
  USE_CLOUDFRONT,
  S3_CLOUDFRONT_URL,
} = process.env;

// Add configuration logging
console.log(chalk.blue("[S3Service] Initializing with config:"), {
  region: AWS_REGION,
  bucketName: AWS_S3_BUCKET_NAME,
  hasAccessKey: !!AWS_ACCESS_KEY_ID,
  hasSecretKey: !!AWS_SECRET_ACCESS_KEY,
  useCloudfront: USE_CLOUDFRONT,
  cloudfrontUrl: S3_CLOUDFRONT_URL,
});

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Test S3 connection
async function testS3Connection() {
  try {
    console.log(chalk.blue("[S3Service] Testing S3 connection..."));
    const command = new HeadObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: "test.txt",
    });
    await s3.send(command);
    console.log(chalk.green("[S3Service] S3 connection successful!"));
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404) {
      console.log(
        chalk.green(
          "[S3Service] S3 connection successful (bucket exists but file doesn't)"
        )
      );
    } else {
      console.error(chalk.red("[S3Service] S3 connection test failed:"), {
        errorName: error.name,
        errorMessage: error.message,
        httpStatus: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
      });
    }
  }
}

// Call test on initialization
testS3Connection();

const CACHE_CONTROL = {
  thumbnail: "public, max-age=31536000", // 1 year
  medium: "public, max-age=31536000",
  full: "public, max-age=31536000",
};

// Upload cache for deduplication
const uploadCache = new Map();

const calculateHash = async (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

const calculateMD5 = async (buffer) => {
  return crypto.createHash("md5").update(buffer).digest("base64");
};

const getImageUrl = (key) => {
  if (
    (USE_CLOUDFRONT === "true" || USE_CLOUDFRONT === true) &&
    S3_CLOUDFRONT_URL
  ) {
    console.log(chalk.blue("[S3Service] Using CloudFront URL:"), {
      cloudfrontDomain: S3_CLOUDFRONT_URL,
      key,
      fullUrl: `${S3_CLOUDFRONT_URL}/${key}`,
    });
    return `${S3_CLOUDFRONT_URL}/${key}`;
  }

  console.log(chalk.yellow("[S3Service] Using direct S3 URL:"), {
    useCloudfront: USE_CLOUDFRONT,
    cloudfrontUrl: S3_CLOUDFRONT_URL,
    reason: !USE_CLOUDFRONT
      ? "USE_CLOUDFRONT is not enabled"
      : "S3_CLOUDFRONT_URL is not set",
  });
  return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
};

const isRetryableError = (error) => {
  const retryableCodes = ["NetworkingError", "TimeoutError", "RequestTimeout"];
  return retryableCodes.includes(error.name) || error.statusCode === 503;
};

const uploadToS3 = async (fileBuffer, key, mimetype, quality = "full") => {
  console.log(chalk.blue("[S3Service] Starting upload:"), {
    key,
    size: fileBuffer.length,
    mimetype,
    quality,
  });

  try {
    const contentHash = await calculateHash(fileBuffer);
    const contentMD5 = await calculateMD5(fileBuffer);

    const params = {
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
      CacheControl: CACHE_CONTROL[quality],
      Metadata: {
        "image-quality": quality,
        "content-hash": contentHash,
        "upload-date": new Date().toISOString(),
      },
      ContentMD5: contentMD5,
    };

    console.log(chalk.blue("[S3Service] Uploading with params:"), {
      bucket: params.Bucket,
      key: params.Key,
      contentType: params.ContentType,
      cacheControl: params.CacheControl,
    });

    const command = new PutObjectCommand(params);
    const result = await s3.send(command);

    console.log(chalk.green("[S3Service] Upload successful:"), {
      etag: result.ETag,
      requestId: result.$metadata?.requestId,
    });

    const url = getImageUrl(key);
    console.log(chalk.blue("[S3Service] Generated URL:"), url);

    return url;
  } catch (error) {
    console.error(chalk.red("[S3Service] Upload failed:"), {
      errorName: error.name,
      errorMessage: error.message,
      httpStatus: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      extendedRequestId: error.$metadata?.extendedRequestId,
    });
    throw error;
  }
};

const uploadWithDeduplication = async (key, uploadFn) => {
  if (uploadCache.has(key)) {
    return uploadCache.get(key);
  }

  const promise = uploadFn().finally(() => {
    uploadCache.delete(key);
  });

  uploadCache.set(key, promise);
  return promise;
};

const uploadMultipleResolutions = async (
  files,
  folder,
  fileName,
  onProgress
) => {
  const urls = {};
  const totalFiles = Object.keys(files).length;
  let completedFiles = 0;

  for (const [quality, file] of Object.entries(files)) {
    try {
      const uploadKey = `${folder}/${quality}/${fileName}`;
      const url = await uploadWithDeduplication(uploadKey, async () => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return uploadToS3(buffer, folder, fileName, file.type, quality);
      });

      urls[quality] = url;
      completedFiles++;

      if (onProgress) {
        onProgress((completedFiles / totalFiles) * 100);
      }
    } catch (error) {
      console.error(
        chalk.red(`Failed to upload ${quality} version:`, error.message)
      );
      throw new Error(`Failed to upload ${quality} version: ${error.message}`);
    }
  }

  return urls;
};

const deleteExistingFile = async (folder, quality, fileName) => {
  const key = `${folder}/${quality}/${fileName}`;

  try {
    const command = new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
    });

    await s3.send(command);
  } catch (error) {
    if (error.name !== "NoSuchKey") {
      console.error(chalk.yellow("Delete error:", error.message));
      throw error;
    }
  }
};

const deleteFileFromS3 = async (folder, fileName) => {
  let key;
  
  // If folder is empty, fileName contains the full key
  if (!folder || folder.trim() === "") {
    key = fileName;
  } else {
    key = `${folder}/${fileName}`;
  }

  console.log(chalk.blue("[S3Service] Deleting file:"), {
    bucket: AWS_S3_BUCKET_NAME,
    key,
  });

  try {
    const command = new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
    });

    await s3.send(command);
    console.log(chalk.green("[S3Service] File deleted successfully:"), key);
  } catch (error) {
    if (error.name !== "NoSuchKey") {
      console.error(chalk.red("[S3Service] Delete error:"), error.message);
      throw error;
    } else {
      console.log(chalk.yellow("[S3Service] File not found, skipping:"), key);
    }
  }
};

const listFilesFromS3 = async (folder) => {
  console.log(chalk.blue("[S3Service] Listing files in folder:"), folder);
  
  try {
    const { ListObjectsV2Command } = require("@aws-sdk/client-s3");
    
    const command = new ListObjectsV2Command({
      Bucket: AWS_S3_BUCKET_NAME,
      Prefix: folder ? `${folder}/` : "",
    });

    const result = await s3.send(command);
    
    const files = (result.Contents || []).map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      etag: item.ETag,
    }));

    console.log(chalk.green("[S3Service] Listed files:"), files.length);
    return files;
  } catch (error) {
    console.error(chalk.red("[S3Service] List files error:"), error.message);
    throw error;
  }
};

const generateSignedUrl = async (folder, fileName) => {
  const key = folder ? `${folder}/${fileName}` : fileName;
  
  console.log(chalk.blue("[S3Service] Generating signed URL for:"), key);
  
  try {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    
    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
    console.log(chalk.green("[S3Service] Signed URL generated successfully"));
    return url;
  } catch (error) {
    console.error(chalk.red("[S3Service] Generate signed URL error:"), error.message);
    throw error;
  }
};

module.exports = {
  uploadToS3,
  uploadMultipleResolutions,
  deleteExistingFile,
  deleteFileFromS3,
  listFilesFromS3,
  generateSignedUrl,
};
