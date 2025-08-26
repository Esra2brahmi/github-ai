'use client'

import React from "react"
import Image from "next/image"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Dialog, DialogContent, DialogHeader } from "~/components/ui/dialog"
import { Textarea } from "~/components/ui/textarea"
import useProject from "~/hooks/use-project"
import { askQuestion } from "./actions"
import { readStreamableValue } from "@ai-sdk/rsc"

const AskQuestionCard=()=>{
    const {project} = useProject()
    const [open, setOpen] = React.useState(false)
    const [question, setQuestion] = React.useState('')
    const [loading,setLoading] = React.useState(false)
    const [filesReferences,setFilesReferences]=React.useState<{fileName:string;sourceCode:string;summary:string}[]>([])
    const [answer,setAnswer]=React.useState('')

    const onSumbit=async (e:React.FormEvent<HTMLFormElement>)=>{
        e.preventDefault()
        if(!project?.id) return
        setLoading(true)
        setOpen(true)
        const {output,filesReferences}=await askQuestion(question,project.id)
        setFilesReferences(filesReferences)

        for await (const delta of readStreamableValue(output)){
            if(delta){
                setAnswer(ans => ans+delta)
            }
        }
        setLoading(false)
    }

    return (
        <>


        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <Image src='/github-alt-svgrepo-com.svg' alt='dionysus' width={40} height={40}/>
                </DialogHeader>
                {answer}
                <h1>Files references</h1>
                {filesReferences.map(file=>{
                    return <span>{file.fileName}</span>
                })}
            </DialogContent>         
        </Dialog>


       <Card className="relative col-span-3">
        <CardHeader>
            <CardTitle>Ask a question</CardTitle>
        </CardHeader>
        <CardContent>
            <form onSubmit={onSumbit}>
                <Textarea placeholder="which file should I edit to change the home page?" value={question} onChange={e=> setQuestion(e.target.value)}/>
                <div className="h-4"></div>
                <Button type="submit">
                    Ask Dionysus
                </Button>
            </form>
        </CardContent>
       </Card>      
</>
)
}

export default AskQuestionCard