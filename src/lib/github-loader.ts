import { GithubRepoLoader} from '@langchain/community/document_loaders/web/github';

export const loadGithubRepo = async (githubUrl: string,githubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        
    })
}