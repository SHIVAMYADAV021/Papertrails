require("dotenv").config({ path: ".env.local" });

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const accessKeyId =
  process.env.TIGRIS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;

const secretAccessKey =
  process.env.TIGRIS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

const endpoint =
  process.env.TIGRIS_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3;

const bucket =
  process.env.TIGRIS_BUCKET_NAME || process.env.TIGRIS_BUCKET;

const region = process.env.AWS_REGION || "auto";

if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
  throw new Error("Tigris environment variables are incomplete.");
}

const s3 = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

// Generate a temporary PDF upload link.
async function createUploadUrl(key) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "application/pdf"
  });

  return getSignedUrl(s3, command, {
    expiresIn: 300
  });
}

// Generate a temporary visitor download link.
async function createDownloadUrl(key, filename) {
  const safeFilename = String(filename || "book.pdf")
    .replace(/["\\\r\n]/g, "");

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: "application/pdf",
    ResponseContentDisposition: `inline; filename="${safeFilename}"`
  });

  return getSignedUrl(s3, command, {
    expiresIn: 900
  });
}

// Verify the uploaded PDF using actual object metadata.
async function getPdfMetadata(key) {
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key
  });

  const result = await s3.send(command);

  return {
    size: result.ContentLength || 0,
    contentType: result.ContentType || ""
  };
}

// Delete a PDF from private storage.
async function deletePdf(key) {
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });

  await s3.send(command);
}

module.exports = {
  createUploadUrl,
  createDownloadUrl,
  getPdfMetadata,
  deletePdf
};