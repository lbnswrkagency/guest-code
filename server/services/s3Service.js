const AWS = require("aws-sdk");
const { CloudFront } = require("aws-sdk");
const fs = require("fs");
const chalk = require("chalk");

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const cloudfront = new CloudFront();

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const USE_CLOUDFRONT = process.env.USE_CLOUDFRONT;
const S3_CLOUDFRONT_URL = process.env.S3_CLOUDFRONT_URL;

// Log configuration on startup
console.log(chalk.blue("[S3Service] Configuration:"), {
  bucketName: BUCKET_NAME,
  region: process.env.AWS_REGION,
  useCloudfront: USE_CLOUDFRONT,
  cloudfrontDomain: CLOUDFRONT_DOMAIN || S3_CLOUDFRONT_URL,
});

function getImageUrl(key) {
  // Use CloudFront if enabled and domain is set
  if (
    (USE_CLOUDFRONT === "true" || USE_CLOUDFRONT === true) &&
    (CLOUDFRONT_DOMAIN || S3_CLOUDFRONT_URL)
  ) {
    const domain = CLOUDFRONT_DOMAIN || S3_CLOUDFRONT_URL;
    console.log(chalk.blue("[S3Service] Using CloudFront URL:"), {
      domain,
      key,
      fullUrl: `https://${domain}/${key}`,
    });
    return `https://${domain}/${key}`;
  }

  // Fall back to direct S3 URL
  console.log(chalk.yellow("[S3Service] Using direct S3 URL:"), {
    useCloudfront: USE_CLOUDFRONT,
    cloudfrontDomain: CLOUDFRONT_DOMAIN || S3_CLOUDFRONT_URL,
    reason: !USE_CLOUDFRONT
      ? "USE_CLOUDFRONT is not enabled"
      : "CloudFront domain is not set",
  });
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function uploadToS3(buffer, key) {
  try {
    console.log(chalk.blue("[S3Service] Uploading to S3:"), {
      bucketName: BUCKET_NAME,
      key,
      size: buffer.length,
    });

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    };

    const result = await s3.upload(params).promise();
    console.log(chalk.green("[S3Service] Upload successful:"), {
      key: result.Key,
      location: result.Location,
    });

    return getImageUrl(result.Key);
  } catch (error) {
    console.error(chalk.red("[S3Service] Upload failed:"), {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function deleteFromS3(key) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    throw error;
  }
}

async function invalidateCache(paths) {
  try {
    const params = {
      DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    };

    const result = await cloudfront.createInvalidation(params).promise();
    return result;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  invalidateCache,
};
