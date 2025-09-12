import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';
import type { Document } from '@langchain/core/documents';
import { generateEmbedding, summariseCode } from './gemini';
import { db } from '~/server/db';
import fetch from 'node-fetch';

interface GitHubRepoInfo {
    default_branch: string;
    [key: string]: unknown; // Allow for other properties we don't care about
}

// Helper to get default branch
async function getDefaultBranch(githubUrl: string, githubToken?: string) {
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const res = await fetch(apiUrl, {
        headers: {
            Authorization: githubToken ? `Bearer ${githubToken}` : '',
            'User-Agent': 'github-ai',
        },
    });
    if (!res.ok) throw new Error(`Failed to fetch repo info: ${res.statusText}`);
    const data = await res.json() as GitHubRepoInfo;
    return data.default_branch || 'main';
}

export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
    const branch = await getDefaultBranch(githubUrl, githubToken);
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || process.env.GITHUB_TOKEN || '',
        branch,
        recursive: true,
        ignoreFiles: ['.gitignore', 'README.md','package-lock.json', 'yarn.lock','pnpm-lock.yaml'],
        unknown: 'warn',
        maxConcurrency: 2,
    });
    const docs = await loader.load();
    return docs;
};

export const indexGithubRepo = async (projectId: string, githubUrl: string, githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken);
    const allEmbeddings = await generateEmbeddings(docs);
    await Promise.allSettled(
        allEmbeddings.map(async (res, index) => {
            console.log(`processing ${index} of ${allEmbeddings.length}`);
            if (!res || res.status !== 'fulfilled') return;
            const { summary, sourceCode, fileName, embedding } = res.value;

            const created = await db.sourceCodeEmbedding.create({
                data: {
                    summary,
                    sourceCode,
                    fileName,
                    projectId,
                },
            });
            await db.$executeRaw`
                UPDATE "SourceCodeEmbedding"
                SET "summaryEmbedding"= ${embedding}::vector
                WHERE "id"= ${created.id}
            `;
        })
    );
};

const generateEmbeddings = async (docs: Document[]) => {
    return await Promise.allSettled(
        docs.map(async (doc) => {
            const summary = await summariseCode(doc);
            const embedding = await generateEmbedding(summary);
            return {
                summary,
                embedding,
                sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
                fileName: doc.metadata.source,
            };
        })
    );
};
