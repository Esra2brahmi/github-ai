import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
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

    const response = await model.generateContent(prompt);
    // @ts-ignore
    return response?.response?.text() ?? '';
}

// Example usage for testing:
(async () => {
    console.log(
        await aiSummarizeCommit(`
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index 5f4b263..a13c41b 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -13,8 +13,8 @@ datasource db {
 model User {
-  id                String @id @default(cuid())
-  emailAddress      String @unique
-  firstName         String
-  lastName          String
-  imageUrl          String?
-  stripeSubscriptionId String? @unique
+  id                String @id @default(cuid())
+  emailAddress      String @unique
+  firstName         String
+  lastName          String
+  imageUrl          String?
+  stripeSubscriptionId String? @unique
 }
`)
    );
})();