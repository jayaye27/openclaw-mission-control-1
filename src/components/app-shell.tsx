'use client'

import { ReactNode } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header, AgentChatPanel } from '@/components/header'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { ChatNotificationToast } from '@/components/chat-notification-toast'
import { RestartAnnouncementBar } from '@/components/restart-announcement-bar'

/**
 * AppShell wraps authenticated pages with sidebar, header, and other UI chrome.
 * Used by the dashboard layout, not by auth pages like /login.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <KeyboardShortcuts />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <RestartAnnouncementBar />
          <main className="flex flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
      <AgentChatPanel />
      <ChatNotificationToast />
    </>
  )
}
