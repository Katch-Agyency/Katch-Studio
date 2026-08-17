/* ============================================================
   Repo download helper — fetches the pushed repository tarball
   from GitHub and expands it into a {path → content} file map.
   Shared by the Vercel (direct upload) and Netlify (zip) backends
   so providers never need the studio to re-send files.
   ============================================================ */

import * as tar from "tar";
import { ApiError } from "./http.mjs";

const MAX_FILES = 500;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Download + extract `owner/repo@branch` → Record<path, utf8 content>. */
export async function fetchRepoFiles({ owner, repo, branch = "main", token = "" }) {
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(branch)}`;

  let res = null;
  try {
    res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}`, "User-Agent": "Katch-Studio-Deploy" } } : undefined);
  } catch (err) {
    throw new ApiError(502, "repo-download-failed", "Could not download the repository from GitHub.");
  }

  if (res.status === 401 && token) {
    /* Some setups only accept the ?token= query form */
    res = await fetch(`${url}?token=${encodeURIComponent(token)}`);
  }
  if (res.status !== 200) {
    throw new ApiError(502, "repo-download-failed", "GitHub could not provide the repository archive.");
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const files = {};
  let count = 0;

  await new Promise((resolve, reject) => {
    const extract = tar.t({
      file: buffer,
      onentry(entry) {
        const path = entry.path;
        /* entries look like "owner-repo-{sha}/path/to/file" — strip the root dir */
        const rel = path.split("/").slice(1).join("/");
        if (entry.type !== "File" || !rel) {
          entry.resume();
          return;
        }
        const chunks = [];
        let size = 0;
        entry.on("data", (c) => {
          size += c.length;
          if (size > MAX_FILE_BYTES) {
            entry.destroy(new ApiError(413, "file-too-large", `File "${rel}" exceeds the 10 MB limit.`));
            return;
          }
          chunks.push(c);
        });
        entry.on("end", () => {
          if (entry.destroyed) return;
          count += 1;
          if (count > MAX_FILES) {
            reject(new ApiError(413, "too-many-files", "The repository has too many files (limit 500)."));
            return;
          }
          files[rel] = Buffer.concat(chunks).toString("utf8");
        });
        entry.on("error", reject);
      },
      strict: true,
    });
    extract.on("end", () => resolve());
    extract.on("error", (err) => {
      if (err instanceof ApiError) reject(err);
      else reject(new ApiError(502, "repo-extract-failed", "Could not unpack the repository archive."));
    });
  });

  if (Object.keys(files).length === 0) {
    throw new ApiError(502, "repo-empty", "The repository archive contained no files.");
  }
  return files;
}
