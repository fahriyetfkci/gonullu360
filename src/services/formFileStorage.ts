import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { config } from '../config';

export const uploadDirectory = path.resolve(process.cwd(), config.uploadDir);
fs.mkdirSync(uploadDirectory, { recursive: true });

function safeOriginalName(value: string) {
  return path.basename(value).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'dosya';
}

export const formFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => {
      file.originalname = safeOriginalName(file.originalname);
      callback(null, crypto.randomUUID());
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 20, fields: 250, fieldSize: 250 * 1024 },
});

export function removeStoredFiles(files: Array<Pick<Express.Multer.File, 'path'>>) {
  return Promise.allSettled(files.map(file => fs.promises.unlink(file.path)));
}

export function removeStoredNames(names: string[]) {
  return Promise.allSettled(names.map(name => fs.promises.unlink(path.join(uploadDirectory, name))));
}

export function storedFilePath(storedName: string) {
  return path.join(uploadDirectory, path.basename(storedName));
}

export function isAcceptedFile(file: Express.Multer.File, acceptedTypes: string[]) {
  if (!acceptedTypes.length) return true;
  const extension = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();
  return acceptedTypes.some(value => {
    const accepted = value.trim().toLowerCase();
    if (accepted.startsWith('.')) return extension === accepted;
    if (accepted.endsWith('/*')) return mime.startsWith(accepted.slice(0, -1));
    return mime === accepted;
  });
}
