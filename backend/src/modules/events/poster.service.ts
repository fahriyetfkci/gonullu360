import { mkdir, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { ValidationError } from "../../shared/errors";

const imageTypes = {
  "image/jpeg": { extension: "jpg", signature: [0xff, 0xd8, 0xff] },
  "image/png": { extension: "png", signature: [0x89, 0x50, 0x4e, 0x47] },
} as const;

export interface PosterUploadResult {
  posterUrl: string;
  posterStorageKey: string;
}

function hasSignature(buffer: Buffer, signature: readonly number[]): boolean {
  return signature.every((byte, index) => buffer[index] === byte);
}

export async function savePoster(buffer: Buffer, mimeType?: string): Promise<PosterUploadResult> {
  const imageType = mimeType ? imageTypes[mimeType as keyof typeof imageTypes] : undefined;
  if (!imageType || !buffer.length || !hasSignature(buffer, imageType.signature)) {
    throw new ValidationError("Yalnızca geçerli PNG veya JPEG afişleri yüklenebilir");
  }

  const storageKey = `events/${randomUUID()}.${imageType.extension}`;
  const uploadRoot = resolve(env.UPLOAD_DIR);
  const destination = resolve(uploadRoot, storageKey);
  if (!destination.startsWith(`${uploadRoot}${sep}`)) {
    throw new ValidationError("Geçersiz afiş yolu");
  }

  await mkdir(resolve(uploadRoot, "events"), { recursive: true });
  await writeFile(destination, buffer, { flag: "wx" });

  return {
    posterUrl: `/uploads/${storageKey.replaceAll("\\", "/")}`,
    posterStorageKey: storageKey,
  };
}
