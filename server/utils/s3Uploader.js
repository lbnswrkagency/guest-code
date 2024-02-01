const {
  S3Client,
  PutObjectCommand,
  ListObjectsCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { createRequest } = require("@aws-sdk/util-create-request");
const fs = require("fs").promises;
require("dotenv").config();

const {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN,
  AWS_S3_BUCKET_NAME,
} = process.env;

const bucketName = process.env.AWS_S3_BUCKET_NAME;

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    sessionToken: AWS_SESSION_TOKEN,
  },
});

const deleteExistingAvatar = async (folder, fileName) => {
  const listParams = {
    Bucket: AWS_S3_BUCKET_NAME,
    Prefix: `${folder}/${fileName}`,
  };

  try {
    const { Contents } = await s3.send(new ListObjectsCommand(listParams));
    if (Contents && Contents.length > 0) {
      const deleteParams = {
        Bucket: AWS_S3_BUCKET_NAME,
        Key: Contents[0].Key,
      };
      await s3.send(new DeleteObjectCommand(deleteParams));
    }
  } catch (error) {
    console.error("Error deleting existing avatar:", error);
    // Consider how you want to handle this error. For example, you might want to throw it or handle it gracefully.
  }
};

const uploadToS3 = async (fileBufferOrPath, folder, fileName, mimetype) => {
  await deleteExistingAvatar(folder, fileName); // Check and delete existing file

  const isBuffer = Buffer.isBuffer(fileBufferOrPath);
  const fileStream = isBuffer
    ? fileBufferOrPath
    : await fs.readFile(fileBufferOrPath);

  const key = `${folder}/${fileName}`;

  const params = {
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
    Body: fileStream,
    ContentType: mimetype || (isBuffer ? "image/jpeg" : undefined),
    // Removed ACL parameter
  };

  try {
    const command = new PutObjectCommand(params);
    const response = await s3.send(command);
    return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  uploadToS3,
  deleteExistingAvatar,
};
