import {Octokit} from "octokit"
import { db } from "~/server/db";

export const octokit = new Octokit ({
    auth : process.env.GITHUB_TOKEN
});

const githubUrl='https://github.com/Esra2brahmi/collab-sphere-ai'

type Response = {
    commitMessage : String ;
    commitHash : String ;
    commitAuthorName : String ;
    commitAuthorAvatar : String ;
    commitDate : String;
}

export const getCommitHashes = async (githubUrl: string): Promise<Response[]>=>{
    const [owner,repo]= githubUrl.split('/').slice(-2)
    if(!owner || !repo){
        throw new Error("Invalid GitHub URL")
    }
    const {data}= await octokit.rest.repos.listCommits({
        owner,
        repo
    })
    const sortedCommits = data.sort((a:any,b:any)=> new Date(b.commit.author.date).getTime()-new Date(a.commit.author.date).getTime()) as any[]

    return sortedCommits.slice(0,10).map((commit:any)=>({
        commitHash: commit.sha as string,
        commitMessage: commit.commit.message ?? "",
        commitAuthorName: commit.commit?.author?.name ?? "",
        commitAuthorAvatar: commit?.author?.avatar_url ?? "",
        commitDate: commit.commit?.author?.date ?? ""
    }))
}

export const pollCommits=async (projectId:string)=>{
    const {project,githubUrl} = await fetchProjectGithubUrl(projectId)
    const commitHashes = await getCommitHashes(githubUrl)
    const unprocessedCommits= await filterUnprocessedCommits(projectId,commitHashes)
    console.log(unprocessedCommits)
    return unprocessedCommits
}

async function fetchProjectGithubUrl(projectId:string){
    const project = await db.project.findUnique({
        where: {id:projectId},
        select: {
            githubUrl:true
        }
    })
    if(!project?.githubUrl){
        throw new Error("Project has no github url")
    }
    return { project,githubUrl:project?.githubUrl }
}

async function filterUnprocessedCommits(projectId: string,commitHashes:Response[]) {
    const processedCommits = await db.commit.findMany({
        where: {projectId}
    })
    const unprocessedCommits = commitHashes.filter((commit)=>!processedCommits.some((processedCommits)=>processedCommits.commitHash === commit.commitHash))
    return unprocessedCommits
}

await pollCommits('cmd9zb2gt0000wkrx5pq9j586').then(console.log)