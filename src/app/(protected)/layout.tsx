import { UserButton } from "@clerk/nextjs"
import { SidebarProvider } from "~/components/ui/sidebar"
import React from 'react'
import { AppSidebar } from "./app-sidebar"

type Props = {
    children: React.ReactNode
}

const SidebarLayout =({ children }: Props) => {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <main className="w-full">
                <div className="flex items-center gap-2 border-sidebar-border bg-sidebar border shadow rounded-md p-2 px-4 m-4">
                    <div className="ml-auto"></div>
                    <UserButton/>
                </div>
                <div className="h-6">
                    <div className="border-sidebar-border bg-sidebar border shadow rounded-md overflow-y-scroll h-[calc(100vh-6rem)] p-6 m-4">
                        {children}
                    </div>
                </div>
            </main>
        </SidebarProvider>
    )
}

export default SidebarLayout