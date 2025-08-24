import {Octokit} from "octokit"
import { db } from "~/server/db";
import { aiSummarizeCommit } from "./gemini";
export const octokit = new Octokit ({
    auth : process.env.GITHUB_TOKEN
});

const githubUrl='https://github.com/Esra2brahmi/collab-sphere-ai'

type Response = {
    commitMessage : string ;
    commitHash : string ;
    commitAuthorName : string ;
    commitAuthorAvatar : string ;
    commitDate : string;
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

    // Process fewer commits per run to reduce LLM usage
    return sortedCommits.slice(0,5).map((commit:any)=>({
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
    // Throttle: process sequentially to avoid rate-limit bursts
    const summaries: string[] = []
    for (const commit of unprocessedCommits) {
        try {
            const summary = await summariseCommit(githubUrl, commit.commitHash)
            summaries.push(summary || "")
        } catch (e) {
            console.warn("summariseCommit failed for", commit.commitHash, e)
            summaries.push("")
        }
        // small delay to be extra nice to the API
        await new Promise(r => setTimeout(r, 500))
    }
    const commits= await db.commit.createMany({
        data:summaries.map((summary,index)=>{
            console.log(`processing commit ${index}`)
            return {
                projectId: projectId,
                commitHash: unprocessedCommits[index]!.commitHash,
                commitMessage: unprocessedCommits[index]!.commitMessage,
                commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
                commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
                commitDate: unprocessedCommits[index]!.commitDate,
                summary
            }
        })
    })
    return commits
}

async function summariseCommit(githubUrl: string,commitHash:string){
    const [owner, repo] = githubUrl.split('/').slice(-2)
    if(!owner || !repo){
        throw new Error("Invalid GitHub URL")
    }
    const res = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
        owner,
        repo,
        ref: commitHash,
        headers: {
            accept: 'application/vnd.github.v3.diff'
        }
    })
    // res.data is a string containing the unified diff when using the diff media type
    const diffText = res.data as unknown as string
    return await aiSummarizeCommit(diffText) || " "
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

//await pollCommits('cmd9zb2gt0000wkrx5pq9j586').then(console.log)