'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Copy, Download, Eye, EyeOff, Check } from 'lucide-react'

interface StepTokenProps {
  token: string
  onNext: () => void
  onBack: () => void
}

export function StepToken({ token, onNext, onBack }: StepTokenProps) {
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)

  const maskedToken = token.slice(0, 6) + '...' + token.slice(-6)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy token:', error)
    }
  }

  const handleDownload = () => {
    const content = `Alfo Claw Command Center - Admin Token
=======================================

Token: ${token}

IMPORTANT:
- Keep this token secure and private
- This is the only time you can see this token
- You will need this token to log in
- If lost, you must regenerate a new token

Generated: ${new Date().toISOString()}
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'alfo-claw-token.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Your Admin Token
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Save this token securely - you&apos;ll need it to log in
        </p>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 rounded-md bg-destructive/10 border border-destructive/30 p-4">
        <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
        <div className="text-sm text-destructive">
          <p className="font-semibold">This token will not be shown again</p>
          <p className="mt-1 text-destructive/80">
            Make sure to save it securely before continuing. If you lose this token,
            you&apos;ll need to regenerate a new one.
          </p>
        </div>
      </div>

      {/* Token Display */}
      <div className="relative">
        <div className="rounded-md bg-muted/50 border border-border p-4 font-mono text-sm break-all">
          {showToken ? token : maskedToken}
        </div>
        <button
          type="button"
          onClick={() => setShowToken(!showToken)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showToken ? 'Hide token' : 'Show token'}
        >
          {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy to Clipboard
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={handleDownload}
        >
          <Download className="size-4" />
          Download as .txt
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" className="flex-1" onClick={onNext}>
          I&apos;ve Saved My Token
        </Button>
      </div>
    </div>
  )
}
