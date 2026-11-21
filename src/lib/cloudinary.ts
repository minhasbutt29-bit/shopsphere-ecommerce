import { v2 as cloudinary } from "cloudinary";
import { HttpError } from "./http";

const MAX_BYTES = 5 * 1024 * 1024;

/** Verifies the real file type from magic bytes rather than trusting the client MIME type. */
export function sniffImageType(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

export function cloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export async function uploadImage(file: File, folder = "shopsphere/products"): Promise<{ url: string; publicId: string }> {
  if (!cloudinaryConfigured()) throw new HttpError(503, "Image uploads are not configured (Cloudinary env vars missing)");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Image must be 5MB or smaller");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffImageType(buf)) throw new HttpError(415, "Only JPEG, PNG or WebP images are allowed");

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "image" }, (err, res) => {
        if (err || !res) return reject(err ?? new Error("Upload failed"));
        resolve({ url: res.secure_url, publicId: res.public_id });
      })
      .end(buf);
  });
}

export async function deleteImage(publicId: string) {
  if (!cloudinaryConfigured()) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  await cloudinary.uploader.destroy(publicId).catch(() => undefined);
}
