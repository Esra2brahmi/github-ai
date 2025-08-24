import { GithubRepoLoader} from '@langchain/community/document_loaders/web/github';
import type { Document } from '@langchain/core/documents';
import { generateEmbedding, summariseCode } from './gemini';
import { db } from '~/server/db';

export const loadGithubRepo = async (githubUrl: string,githubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || process.env.GITHUB_TOKEN || '',
        branch: 'main',
        recursive: true,
        ignoreFiles: ['.gitignore', 'README.md','package-lock.json', 'yarn.lock','pnpm-lock.yaml'],
        unknown:'warn',
        maxConcurrency: 2,
    })
    const docs = await loader.load();
    return docs
}


export const indexGithubRepo = async (projectId: string , githubUrl: string , githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken);
    const allEmbeddings = await generateEmbeddings(docs)
    await Promise.allSettled(
        allEmbeddings.map(async (res, index) => {
            console.log(`processing ${index} of ${allEmbeddings.length}`)
            if (!res || res.status !== 'fulfilled') return
            const { summary, sourceCode, fileName, embedding } = res.value

            const created = await db.sourceCodeEmbedding.create({
                data: {
                    summary,
                    sourceCode,
                    fileName,
                    projectId,
                }
            })
            await db.$executeRaw`
            UPDATE "SourceCodeEmbedding"
            SET "summaryEmbedding"= ${embedding}::vector
            WHERE "id"= ${created.id}
            `
        }))
}

const generateEmbeddings = async (docs: Document[])=>{
    return await Promise.allSettled(docs.map(async doc=>{
        const summary=await summariseCode(doc)
        const embedding=await generateEmbedding(summary)
        return {
            summary,
            embedding,
            sourceCode:JSON.parse(JSON.stringify(doc.pageContent)),
            fileName:doc.metadata.source
        }
    }))
}