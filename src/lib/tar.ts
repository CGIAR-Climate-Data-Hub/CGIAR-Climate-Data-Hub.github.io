import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { packTar, type TarEntry } from "modern-tar";
import type { SourceFile } from "@/lib/records";

const EPOCH = new Date(0);
const GIT_SYMLINK = 0o120000;
const byPath = (a: SourceFile, b: SourceFile) =>
  a.path < b.path ? -1 : Number(a.path > b.path);

async function tarGz(files: SourceFile[]) {
  const entries = files.toSorted(byPath).map((file): TarEntry => {
    const metadata = {
      name: file.path,
      mtime: EPOCH,
      uid: 0,
      gid: 0,
    };
    if (file.mode === GIT_SYMLINK)
      return {
        header: {
          ...metadata,
          size: 0,
          type: "symlink",
          linkname: new TextDecoder().decode(file.bytes),
        },
      };
    return {
      header: {
        ...metadata,
        size: file.bytes.length,
        mode: file.mode & 0o777,
      },
      body: file.bytes,
    };
  });
  return gzipSync(await packTar(entries));
}

export async function createSkillArtifact(files: SourceFile[]) {
  const type = files.length === 1 ? "skill-md" : "archive";
  const bytes = type === "skill-md" ? files[0].bytes : await tarGz(files);
  return {
    type,
    digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    base64: Buffer.from(bytes).toString("base64"),
  };
}
