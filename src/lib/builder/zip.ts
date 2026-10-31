import { strToU8, zipSync } from "fflate";
import { redactSecrets, safeRelativePath, withinFileLimits } from "@/lib/builder/paths";
import type { ProjectFile } from "@/lib/builder/types";

export function zipProject(slug: string, files: ProjectFile[], apiKey: string | null = null): Uint8Array | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  if (!withinFileLimits(files)) return null;
  const archive: Record<string, Uint8Array> = {};
  for (const file of files) {
    const path = safeRelativePath(file.path);
    if (!path) return null;
    const contents = redactSecrets(file.contents, apiKey);
    if (apiKey && apiKey.length >= 8 && contents.includes(apiKey)) return null;
    archive[`${slug}/${path}`] = strToU8(contents);
  }
  return zipSync(archive, { level: 6 });
}
