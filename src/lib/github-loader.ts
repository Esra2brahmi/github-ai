import { GithubRepoLoader} from '@langchain/community/document_loaders/web/github';

export const loadGithubRepo = async (githubUrl: string,githubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || '',
        branch: 'main',
        recursive: true,
        ignoreFiles: ['.gitignore', 'README.md','package-lock.json', 'yarn.lock','pnpm-lock.yaml'],
        unknown:'warn',
        maxConcurrency: 5,
    })
    const docs = await loader.load();
    return docs
}


export const indexGithubRepo = async (projectId: string , githubUrl: string , githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken);
    const allEmbeddings = await generateEmbeddings(docs)
}