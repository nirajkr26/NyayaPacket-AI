import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

const BUCKET_NAME = env.S3_BUCKET_NAME || "nyayapacket-ai";

export const s3Client = new S3Client({
  endpoint: env.AWS_ENDPOINT_URL_S3,
  region: env.AWS_REGION || "auto",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || "mock-access-key",
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || "mock-secret-key",
  },
  forcePathStyle: true,
});

export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

export async function generatePresignedUploadUrl(
  storageKey: string,
  mimeType: string,
  expiresInSeconds = 900
): Promise<PresignedUploadResult> {
  // In test environment, return mock signed URL
  if (env.NODE_ENV === "test") {
    return {
      uploadUrl: `https://mock-s3.local/${BUCKET_NAME}/${storageKey}?signed=mock`,
      storageKey,
      expiresInSeconds,
    };
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  return {
    uploadUrl,
    storageKey,
    expiresInSeconds,
  };
}

export async function generatePresignedDownloadUrl(
  storageKey: string,
  expiresInSeconds = 900
): Promise<string> {
  if (env.NODE_ENV === "test") {
    return `https://mock-s3.local/${BUCKET_NAME}/${storageKey}?download=mock`;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export async function uploadBufferToS3(
  storageKey: string,
  buffer: Buffer,
  mimeType = "application/pdf"
): Promise<{ success: boolean; storageKey: string }> {
  if (env.NODE_ENV === "test") {
    logger.debug({ storageKey }, "Simulating buffer upload in test mode");
    return { success: true, storageKey };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    });
    await s3Client.send(command);
    return { success: true, storageKey };
  } catch (err: any) {
    logger.error({ err: err.message, storageKey }, "Failed to upload buffer to S3");
    throw err;
  }
}

export async function verifyObjectExists(
  storageKey: string
): Promise<{ exists: boolean; size?: number; mimeType?: string }> {
  if (env.NODE_ENV === "test") {
    return { exists: true, size: 1024, mimeType: "application/pdf" };
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });
    const response = await s3Client.send(command);
    return {
      exists: true,
      size: response.ContentLength,
      mimeType: response.ContentType,
    };
  } catch (err: any) {
    logger.warn({ err: err.message, storageKey }, "S3 HeadObject check failed");
    return { exists: false };
  }
}

export async function getObjectBuffer(
  storageKey: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (env.NODE_ENV === "test") {
    return {
      buffer: Buffer.from("Mock document content for test environment"),
      contentType: "text/plain",
    };
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });
    const response = await s3Client.send(command);
    if (!response.Body) return null;

    const byteArray = await response.Body.transformToByteArray();
    return {
      buffer: Buffer.from(byteArray),
      contentType: response.ContentType || "application/octet-stream",
    };
  } catch (err: any) {
    logger.error({ err: err.message, storageKey }, "Failed to fetch object buffer from S3");
    return null;
  }
}
