import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
mkdirSync(uploadDirectory, { recursive: true });
