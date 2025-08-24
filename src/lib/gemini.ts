import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Document } from '@langchain/core/documents';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-8b',
});

export const aiSummarizeCommit = async (diff: string) => {
    const prompt = `
You are an expert programmer tasked with summarizing a git diff.

Reminders about the git diff format:
Each file starts with a few metadata lines, for example:
diff --git a/lib/index.js b/lib/index.js
index aadf691..bfef603 100644
--- a/lib/index.js
+++ b/lib/index.js
This means that lib/index.js was modified in this commit. This is just an example.

Then there are lines that show what was changed:
A line starting with + means it was added,
a line starting with - means it was deleted,
and lines starting with neither are just context to help understand the changes.
They are not part of the diff.

Example summary comments:
Increased returned recordings from '10' to '100' in [packages/server/recordings_api.ts], [packages/server/constants.ts];
Fixed a typo in the GitHub action name [.github/workflows/gpt-commit-summarizer.yml];
Moved Octokit initialization to a separate file [src/octokit.ts], [src/index.ts];
Added OpenAI completions API [packages/utils/apis/openai.ts];
Lowered numeric tolerance in test files.

Most commits will have fewer comments than these examples.
If more than two files are affected, you can skip listing filenames in the last comment.
Do not include any part of the examples in your summary — they are just for inspiration.

Please summarize the following diff:

${diff}
    `.trim();

    const response = await generateWithRetry(() => model.generateContent(prompt));
    // @ts-ignore
    return response?.response?.text() ?? '';
}

async function generateWithRetry<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 1000): Promise<T> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await fn();
        } catch (err: any) {
            const msg = String(err?.message || err);
            const status = err?.status;
            const retryInfoDelay = err?.errorDetails?.find?.((d: any) => d?.['@type']?.includes('RetryInfo'))?.retryDelay;
            const isRateLimited = status === 429 || /Too Many Requests/i.test(msg) || /quota/i.test(msg);
            if (isRateLimited && attempt < retries) {
                const delayMs = retryInfoDelay ? parseInt(String(retryInfoDelay)) * 1000 : baseDelayMs * Math.pow(2, attempt);
                await new Promise((r) => setTimeout(r, isNaN(delayMs) ? baseDelayMs : delayMs));
                attempt++;
                continue;
            }
            throw err;
        }
    }
}

export async function summariseCode(doc:Document){
    console.log("getting summary for",doc.metadata.source);
    const code=doc.pageContent.slice(0,10000);
    const response=await generateWithRetry(() => model.generateContent([
        `You are an intelligent software engineer who specialises in onboarding junio software engineers into projects`,
        `you are onboarding a new junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file
        Here is the code : 
        ---
        ${code}
        ---
        Give a summary of no more than 100 words of the code above`,

    ]));

    return response.response.text();
}

export async function generateEmbedding(summary:string){
    const model = genAI.getGenerativeModel({
        model: "text-embedding-004"
    })
    const result=await generateWithRetry(() => model.embedContent(summary))
    const embeddings=result.embedding
    return embeddings.values
}


