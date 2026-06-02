// lib/github.ts – Simple GitHub push helper (placeholder implementation)
// Requires environment variables:
//   GITHUB_TOKEN – a personal access token with repo scope
//   GITHUB_REPO  – "owner/repo" string of the target repository
// The helper creates/updates a JSON file under `events/` containing the payload.

export async function pushEvent(event: string, payload: any) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    if (!token || !repo) {
      console.warn("GitHub token or repo not configured – skipping push");
      return;
    }

    const [owner, repoName] = repo.split("/");
    const path = `events/${event}.json`;
    const content = Buffer.from(JSON.stringify(payload, null, 2)).toString("base64");

    // Try to get the current file SHA (if it exists)
    let sha: string | undefined;
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }
    } catch (e) {
      // ignore – file may not exist yet
    }

    const body = {
      message: `Push ${event} event`,
      content,
      ...(sha ? { sha } : {}),
    };

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(body),
    });

    if (!putRes.ok) {
      const text = await putRes.text();
      console.error(`Failed to push event to GitHub: ${putRes.status} ${putRes.statusText} - ${text}`);
    }
  } catch (err) {
    console.error("Failed to push event to GitHub:", err);
  }
}
