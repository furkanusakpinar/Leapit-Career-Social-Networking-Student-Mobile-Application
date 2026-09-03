export const parseGithubUrl = (url) => {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) {
    const owner = match[1];
    const repo = match[2].replace(/\.git$/, '').split('?')[0].split('#')[0];
    return { owner, repo };
  }
  return null;
};

export const fetchRepoTitle = async (githubUrl) => {
  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) return null;
  const { owner, repo } = parsed;
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'User-Agent': 'Leapit-App' }
    });
    if (response.ok) {
      const data = await response.json();
      const rawName = data.name || repo;
      return rawName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  } catch (e) {
    console.log('fetchRepoTitle error:', e);
  }
  return null;
};


export const convertRelativeUrlsToAbsolute = (markdown, githubUrl, defaultBranch = 'main') => {
  if (!markdown || !githubUrl) return markdown;
  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) return markdown;
  const { owner, repo } = parsed;

  const rawBaseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}`;

  let result = markdown.replace(
    /!\[([^\]]*)\]\(((?!https?:\/\/|mailto:|#)[^)]+)\)/g,
    (match, alt, path) => {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `![${alt}](${rawBaseUrl}/${cleanPath})`;
    }
  );

  result = result.replace(
    /<img([^>]+)src=["']((?!https?:\/\/|mailto:|#)[^"']+)["']/gi,
    (match, attributes, path) => {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `<img${attributes}src="${rawBaseUrl}/${cleanPath}"`;
    }
  );

  result = result.replace(
    /\[([^\]]*)\]\(((?!https?:\/\/|mailto:|#)[^)]+)\)/g,
    (match, text, path) => {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      const baseLinkUrl = `https://github.com/${owner}/${repo}/blob/${defaultBranch}`;
      return `[${text}](${baseLinkUrl}/${cleanPath})`;
    }
  );

  return result;
};

export const fetchReadmeFromGithub = async (githubUrl) => {
  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) return null;
  const { owner, repo } = parsed;
  
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        'Accept': 'application/vnd.github.raw',
        'User-Agent': 'Leapit-App'
      }
    });
    if (response.ok) {
      const markdown = await response.text();
      
      let branch = 'main';
      try {
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            'User-Agent': 'Leapit-App'
          }
        });
        if (repoResponse.ok) {
          const repoData = await repoResponse.json();
          branch = repoData.default_branch || 'main';
        }
      } catch (e) {
        console.log("Failed to get default branch, defaulting to 'main':", e);
      }

      return convertRelativeUrlsToAbsolute(markdown, githubUrl, branch);
    }
  } catch (error) {
    console.log("GitHub API fetch error:", error);
  }

  const branches = ['main', 'master'];
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
      const response = await fetch(url);
      if (response.ok) {
        const markdown = await response.text();
        return convertRelativeUrlsToAbsolute(markdown, githubUrl, branch);
      }
    } catch (error) {
      console.log(`Raw fallback error for ${branch}:`, error);
    }
  }
  return null;
};
