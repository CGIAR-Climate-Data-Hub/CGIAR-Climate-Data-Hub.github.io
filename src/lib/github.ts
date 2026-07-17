// One home for the GitHub URL shapes the site links to. Repos are
// owner/name slugs (SITE_REPO, CATALOG_REPO, SKILLS_REPO in site.config).

export const githubUrl = (repo: string) => `https://github.com/${repo}`;

// A prefilled new issue; the title becomes the prompt ("[record] ")
export const issueUrl = (repo: string, title = "") =>
  `${githubUrl(repo)}/issues/new${title ? `?title=${encodeURIComponent(title)}` : ""}`;

// Entries loaded without a source file have no filePath: no path, no URL
export const editUrl = (repo: string, path?: string) =>
  path ? `${githubUrl(repo)}/edit/main/${path}` : undefined;

export const blobUrl = (repo: string, path?: string) =>
  path ? `${githubUrl(repo)}/blob/main/${path}` : undefined;

export const treeUrl = (repo: string, path: string) =>
  `${githubUrl(repo)}/tree/main/${path}`;
