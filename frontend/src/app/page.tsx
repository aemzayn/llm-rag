import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Bot, MessageSquare, FileText, Sparkles, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">LLM RAG</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">
            AI-powered chatbot with<br />document intelligence
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Upload your documents and chat with AI. Get intelligent answers powered by your own data.
          </p>
          
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Document Upload</p>
                <p className="text-sm">PDF, CSV, and TXT support</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">RAG Chat</p>
                <p className="text-sm">Context-aware conversations</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Multiple LLMs</p>
                <p className="text-sm">OpenAI, Anthropic, Ollama</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Built with Next.js, FastAPI, and LangChain
        </p>
      </div>

      {/* Right Side - Actions */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-semibold">LLM RAG</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight">
              Get Started
            </h2>
            <p className="text-muted-foreground">
              Sign in to your account or create a new one
            </p>
          </div>
          
          <div className="space-y-4">
            <Button asChild size="lg" className="w-full group">
              <Link href="/login">
                Sign In
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform motion-reduce:transform-none" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/signup">
                Create Account
              </Link>
            </Button>
          </div>

          {/* Mobile Features */}
          <div className="lg:hidden pt-8 space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Document Upload
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-primary" />
              RAG Chat
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Multiple LLMs
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
