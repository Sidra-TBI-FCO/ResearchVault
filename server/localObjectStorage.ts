import { randomUUID } from "crypto";
import { createReadStream, existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { type Response } from "express";
import { ObjectNotFoundError } from "./objectStorage";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "/data/uploads";
const APP_URL = process.env.APP_URL || "http://localhost:5000";

// Resolves the local file path for a given UUID
function localFilePath(id: string): string {
  return path.join(UPLOADS_DIR, id);
}

export class LocalFile {
  constructor(
    public readonly filePath: string,
    public readonly contentType: string = "application/octet-stream",
  ) {}
}

export class LocalObjectStorageService {
  async getObjectEntityUploadURL(): Promise<string> {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const id = randomUUID();
    return `${APP_URL}/api/objects/local-upload/${id}`;
  }

  // Saves a file body buffer/stream to disk and returns the local file.
  async saveFile(id: string, body: Buffer, contentType: string): Promise<void> {
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(localFilePath(id), body);
  }

  async getObjectEntityFile(objectPath: string): Promise<LocalFile> {
    // objectPath is /objects/local-upload/<uuid>
    const id = objectPath.split("/").pop();
    if (!id) throw new ObjectNotFoundError();
    const filePath = localFilePath(id);
    if (!existsSync(filePath)) throw new ObjectNotFoundError();
    return new LocalFile(filePath);
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.includes("/api/objects/local-upload/")) {
      const id = rawPath.split("/").pop();
      return `/objects/local-upload/${id}`;
    }
    return rawPath;
  }

  async downloadObject(file: LocalFile, res: Response): Promise<void> {
    res.set("Content-Type", file.contentType);
    const stream = createReadStream(file.filePath);
    stream.on("error", () => {
      if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
    });
    stream.pipe(res);
  }

  async trySetObjectEntityAclPolicy(rawPath: string, _aclPolicy: any): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity(_opts: { userId?: string; objectFile: any; requestedPermission?: any }): Promise<boolean> {
    return true;
  }
}
