import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'LLM RAG Chatbot',
  description: 'AI-powered chatbot with document embedding',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            className: '',
            style: {
              background: 'hsl(0 0% 14.9%)',
              color: 'hsl(0 0% 98%)',
              border: '1px solid hsl(0 0% 14.9%)',
            },
          }}
        />
      </body>
    </html>
  )
}
