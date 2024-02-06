const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
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

const listFilesFromS3 = async (folder) => {
  const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      sessionToken: AWS_SESSION_TOKEN, // Include this only if necessary
    },
  });

  const command = new ListObjectsV2Command({
    Bucket: AWS_S3_BUCKET_NAME,
    Prefix: `${folder}/`, // Make sure to end with '/' to list contents of the folder
  });

  try {
    const { Contents } = await s3Client.send(command);
    const files = Contents.map((file) => {
      return {
        name: file.Key.substring(file.Key.lastIndexOf("/") + 1),
        url: `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${file.Key}`,
      };
    }).filter((file) => file.name); // Filter out entries without a name

    return files;
  } catch (error) {
    console.error("Error listing files from S3:", error);
    throw error; // Or handle error as needed
  }
};

const generateSignedUrl = async (folder, fileName) => {
  const params = {
    Bucket: AWS_S3_BUCKET_NAME,
    Key: `${folder}/${fileName}`,
    Expires: 3600, // URL expiration time in seconds
  };

  try {
    const command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: params.Expires,
    });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
};

const deleteFileFromS3 = async (folder, fileName) => {
  const params = {
    Bucket: AWS_S3_BUCKET_NAME,
    Key: `${folder}/${fileName}`,
  };

  try {
    const command = new DeleteObjectCommand(params);
    await s3.send(command);
    console.log(`File deleted from S3: ${folder}/${fileName}`);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
};

module.exports = {
  uploadToS3,
  deleteExistingAvatar,
  listFilesFromS3,
  generateSignedUrl,
  deleteFileFromS3,
};
