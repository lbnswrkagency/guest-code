const AWS = require("aws-sdk");
const { CloudFront } = require("aws-sdk");
const fs = require("fs");

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const cloudfront = new CloudFront();

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;

async function uploadToS3(buffer, key) {
  try {
    console.log("[S3Service] Starting upload to S3:", {
      bucket: BUCKET_NAME,
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
    console.log("[S3Service] Upload successful:", {
      location: result.Location,
      key: result.Key,
      cloudfrontUrl: `https://${CLOUDFRONT_DOMAIN}/${result.Key}`,
    });

    return `https://${CLOUDFRONT_DOMAIN}/${result.Key}`;
  } catch (error) {
    console.error("[S3Service] Error uploading to S3:", error);
    throw error;
  }
}

async function deleteFromS3(key) {
  try {
    console.log("[S3Service] Deleting from S3:", {
      bucket: BUCKET_NAME,
      key,
    });

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    console.log("[S3Service] Delete successful");

    return true;
  } catch (error) {
    console.error("[S3Service] Error deleting from S3:", error);
    throw error;
  }
}

async function invalidateCache(paths) {
  try {
    console.log("[S3Service] Invalidating CloudFront cache:", {
      distributionId: CLOUDFRONT_DISTRIBUTION_ID,
      paths,
    });

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
    console.log("[S3Service] Cache invalidation created:", {
      id: result.Invalidation.Id,
      status: result.Invalidation.Status,
      paths: result.Invalidation.InvalidationBatch.Paths.Items,
    });

    return result;
  } catch (error) {
    console.error("[S3Service] Error invalidating cache:", error);
    throw error;
  }
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  invalidateCache,
};
