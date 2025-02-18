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
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    };

    const result = await s3.upload(params).promise();
    return `https://${CLOUDFRONT_DOMAIN}/${result.Key}`;
  } catch (error) {
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
