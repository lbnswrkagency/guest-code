const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const chalk = require("chalk");

const {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET_NAME,
} = process.env;

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const uploadToS3 = async (fileBuffer, folder, fileName, mimetype) => {
  const key = `${folder}/${fileName}`;

  try {
    await deleteExistingAvatar(folder, fileName).catch(() => {});

    const params = {
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error(chalk.red("S3 upload error:"), error.message);
    throw error;
  }
};

const deleteExistingAvatar = async (folder, fileName) => {
  const key = `${folder}/${fileName}`;

  try {
    const command = new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
    });

    await s3.send(command);
  } catch (error) {
    if (error.name !== "NoSuchKey") {
      throw error;
    }
  }
};

module.exports = {
  uploadToS3,
  deleteExistingAvatar,
};
