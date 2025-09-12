import { Octokit } from "octokit";
import { db } from "~/server/db";
import { aiSummarizeCommit } from "./gemini";
import fetch from "node-fetch";

export const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

type CommitResponse = {
    commitMessage: string;
    commitHash: string;
    commitAuthorName: string;
    commitAuthorAvatar: string;
    commitDate: string;
};

// --------------------
// Get repo default branch dynamically
// --------------------
async function getDefaultBranch(githubUrl: string, githubToken?: string): Promise<string> {
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error("Invalid GitHub URL");

    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const response = await fetch(apiUrl, {
        headers: {
            Authorization: githubToken ? `Bearer ${githubToken}` : "",
            "User-Agent": "github-ai"
        }
    });

    if (!response.ok) throw new Error(`Failed to fetch repo metadata: ${response.statusText}`);
    
    interface GitHubRepoResponse {
        default_branch: string;
        [key: string]: unknown; // Allow for other properties we don't care about
    }
    
    const data = await response.json() as GitHubRepoResponse;
    return data.default_branch || "main";
}

// --------------------
// Get latest commits
// --------------------
export const getCommitHashes = async (
    githubUrl: string,
    branch: string
): Promise<CommitResponse[]> => {
    console.log("Fetching commits for repo:", githubUrl);

    const [owner, repo] = githubUrl.split('/').slice(-2);
    if (!owner || !repo) throw new Error("Invalid GitHub URL");

    const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: 100
    });

    console.log(`Fetched ${data.length} commits from branch ${branch}`);

    const sortedCommits = data.sort(
        (a: any, b: any) =>
            new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()
    );

    return sortedCommits.slice(0, 5).map((commit: any) => ({
        commitHash: commit.sha,
        commitMessage: commit.commit.message ?? "",
        commitAuthorName: commit.commit?.author?.name ?? "",
        commitAuthorAvatar: commit?.author?.avatar_url ?? "",
        commitDate: commit.commit?.author?.date ?? ""
    }));
};

// --------------------
// Poll commits and summarize
// --------------------
export const pollCommits = async (projectId: string) => {
    const { project, githubUrl } = await fetchProjectGithubUrl(projectId);
    console.log("Project GitHub URL:", githubUrl);

    const branch = await getDefaultBranch(githubUrl, process.env.GITHUB_TOKEN);
    const commitHashes = await getCommitHashes(githubUrl, branch);
    const unprocessedCommits = await filterUnprocessedCommits(projectId, commitHashes);

    const summaries: string[] = [];

    for (const commit of unprocessedCommits) {
        try {
            const summary = await summariseCommit(githubUrl, commit.commitHash);
            summaries.push(summary || "");
        } catch (e) {
            console.warn("summariseCommit failed for", commit.commitHash, e);
            summaries.push("");
        }
        await new Promise(r => setTimeout(r, 500)); // small delay to avoid rate limit
    }

    // Batch insert into DB
    const commits = await db.commit.createMany({
        data: summaries.map((summary, index) => {
            const commit = unprocessedCommits[index]!;
            console.log(`Processing commit ${index + 1}/${unprocessedCommits.length}`);
            return {
                projectId,
                commitHash: commit.commitHash,
                commitMessage: commit.commitMessage,
                commitAuthorName: commit.commitAuthorName,
                commitAuthorAvatar: commit.commitAuthorAvatar,
                commitDate: commit.commitDate,
                summary
            };
        })
    });

    return commits;
};

// --------------------
// Summarize a single commit
// --------------------
async function summariseCommit(githubUrl: string, commitHash: string): Promise<string> {
    const [owner, repo] = githubUrl.split('/').slice(-2);
    if (!owner || !repo) throw new Error("Invalid GitHub URL");

    try {
        const res = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
            owner,
            repo,
            ref: commitHash,
            headers: { accept: 'application/vnd.github.v3.diff' }
        });

        const diffText = String(res.data);
        if (!diffText) return " ";

        const summary = await aiSummarizeCommit(diffText);
        return summary || " ";
    } catch (error) {
        console.error(`Error fetching diff for commit ${commitHash}:`, error);
        return " ";
    }
}

// --------------------
// Helper: fetch project GitHub URL
// --------------------
async function fetchProjectGithubUrl(projectId: string) {
    const project = await db.project.findUnique({
        where: { id: projectId },
        select: { githubUrl: true }
    });
    if (!project?.githubUrl) throw new Error("Project has no GitHub URL");
    return { project, githubUrl: project.githubUrl };
}

// --------------------
// Helper: filter out already processed commits
// --------------------
async function filterUnprocessedCommits(projectId: string, commits: CommitResponse[]) {
    console.log("Received", commits.length, "commits from GitHub");

    const processedCommits = await db.commit.findMany({
        where: { projectId }
    });

    const unprocessed = commits.filter(
        commit => !processedCommits.some(pc => pc.commitHash === commit.commitHash)
    );

    console.log("Unprocessed commits:", unprocessed.length);
    return unprocessed;
}
