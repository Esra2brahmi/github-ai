'use server'
import { streamText } from 'ai'
import { createStreamableValue } from '@ai-sdk/rsc'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateEmbedding } from '~/lib/gemini'
import { db } from '~/server/db'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,

})

export async function askQuestion(question:string,projectId:string){
     const stream=createStreamableValue()

     const queryVector=await generateEmbedding(question)
     const vectorQuery = `[${queryVector.join(',')}]`


     const result = await db.$queryRaw`
     SELECT "fileName","sourceCode","summary",
     1-("summaryEmbedding"<=>${vectorQuery}::vector) AS similarity
     FROM "SourceCodeEmbedding"
     WHERE 1-("summaryEmbedding"<=>${vectorQuery}::vector) > .5
     AND "projectId" =${projectId}
     ORDER BY similarity DESC
     LIMIT 10  
     ` as {fileName:string;sourceCode:string;summary:string}[]

     let context= ''
     for (const doc of result){
        context += `source:${doc.fileName}\ncode content:${doc.sourceCode}\n summary of file:${doc.summary}\n\n`
     }

     (async () => {
        const { textStream } = await streamText({
          model: google('gemini-1.5-flash'),
          prompt: `
      You are an AI code assistant who answers questions about the codebase. 
      Your target audience is a technical intern.
      
      The AI assistant is a powerful, human-like artificial intelligence.  
      Traits of the AI include: expert knowledge, helpfulness, cleverness, and articulateness.  
      The AI is well-behaved, well-mannered, always friendly, kind, inspiring, and eager to provide vivid and thoughtful responses.  
      
      The AI knows nearly everything and can accurately answer questions on any topic.  
      If the question is about code or a specific file, the AI will provide a detailed step-by-step answer.  
      
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK
      
      START QUESTION
      ${question}
      END OF QUESTION
      
      Guidelines:
      - Always take into account any CONTEXT BLOCK provided in the conversation.  
      - If the context does not provide the answer, say: "I'm sorry, but I don’t know the answer."  
      - Do not apologize for previous responses; instead, indicate when new information was gained.  
      - Do not invent anything outside of the provided context.  
      - Answer in markdown syntax with code snippets if needed.  
      - Be as detailed as possible when answering.
          `,
        });

        for await (const delta of textStream){
            stream.update(delta)
        }
        stream.done()
      })()

      return {
        output:stream.value,
        filesReferences:result
      }
      
}
