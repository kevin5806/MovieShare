import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "@/server/env";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function trimLeadingSlash(value: string) {
  return value.replace(/^\/+/, "");
}

function hasStorageConfig() {
  return Boolean(
    env.STORAGE_ENDPOINT &&
      env.STORAGE_PUBLIC_BASE_URL &&
      env.STORAGE_BUCKET &&
      env.STORAGE_ACCESS_KEY &&
      env.STORAGE_SECRET_KEY,
  );
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function getExtensionFromFile(file: File) {
  if (file.type && IMAGE_TYPE_EXTENSIONS.has(file.type)) {
    return IMAGE_TYPE_EXTENSIONS.get(file.type) ?? "bin";
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "jpg";
  }

  if (extension === "png" || extension === "webp") {
    return extension;
  }

  return "bin";
}

function assertImageFile(file: File) {
  if (file.size <= 0) {
    throw new Error("Choose an image file before saving.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must stay under 5 MB.");
  }

  if (!IMAGE_TYPE_EXTENSIONS.has(file.type)) {
    throw new Error("Only JPG, PNG and WebP images are supported.");
  }
}

function buildPublicUrl(objectKey: string) {
  const baseUrl = trimTrailingSlash(env.STORAGE_PUBLIC_BASE_URL);
  const encodedPath = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${baseUrl}/${encodedPath}`;
}

function getObjectKeyFromPublicUrl(url: string) {
  const publicBaseUrl = trimTrailingSlash(env.STORAGE_PUBLIC_BASE_URL);

  if (!publicBaseUrl || !url.startsWith(`${publicBaseUrl}/`)) {
    return null;
  }

  return trimLeadingSlash(url.slice(publicBaseUrl.length));
}

let storageClient: S3Client | null = null;

function getStorageClient() {
  if (!storageClient) {
    storageClient = new S3Client({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY,
        secretAccessKey: env.STORAGE_SECRET_KEY,
      },
    });
  }

  return storageClient;
}

export function getMediaStorageRuntimeConfig() {
  return {
    endpoint: env.STORAGE_ENDPOINT || null,
    publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL || null,
    bucket: env.STORAGE_BUCKET || null,
    region: env.STORAGE_REGION || null,
    source: hasStorageConfig() ? "environment" : "missing",
    isConfigured: hasStorageConfig(),
    maxUploadBytes: MAX_IMAGE_BYTES,
    allowedMimeTypes: [...IMAGE_TYPE_EXTENSIONS.keys()],
  } as const;
}

export async function deleteManagedImageByUrl(url: string | null | undefined) {
  if (!hasStorageConfig() || !url) {
    return;
  }

  const objectKey = getObjectKeyFromPublicUrl(url);

  if (!objectKey) {
    return;
  }

  await getStorageClient().send(
    new DeleteObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: objectKey,
    }),
  );
}

export async function uploadPublicImage(input: {
  file: File;
  folder: "profiles" | "lists";
  ownerId: string;
  slug?: string;
  previousUrl?: string | null;
}) {
  if (!hasStorageConfig()) {
    throw new Error("Media storage is not configured in this deployment.");
  }

  assertImageFile(input.file);

  const extension = getExtensionFromFile(input.file);
  const safeSlug = input.slug ? sanitizeSegment(input.slug) : null;
  const objectKey = [
    input.folder,
    sanitizeSegment(input.ownerId) || "user",
    safeSlug,
    `${Date.now()}-${crypto.randomUUID()}.${extension}`,
  ]
    .filter(Boolean)
    .join("/");
  const body = Buffer.from(await input.file.arrayBuffer());

  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: objectKey,
      Body: body,
      ContentType: input.file.type,
      CacheControl: "public, max-age=31536000, immutable",
      ContentLength: body.byteLength,
    }),
  );

  const url = buildPublicUrl(objectKey);

  if (input.previousUrl && input.previousUrl !== url) {
    await deleteManagedImageByUrl(input.previousUrl).catch((error) => {
      console.error("deleteManagedImageByUrl failed", error);
    });
  }

  return {
    objectKey,
    url,
  };
}
