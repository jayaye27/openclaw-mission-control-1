'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { StepUserInfo } from './step-user-info'
import { StepToken } from './step-token'
import { StepConfirm } from './step-confirm'

interface UserInfo {
  firstName: string
  lastName: string
  email: string
}

type Step = 1 | 2 | 3

export function SetupWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle step 1 completion: collect user info and call API
  const handleUserInfoNext = async (info: UserInfo) => {
    setUserInfo(info)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed')
      }

      setGeneratedToken(data.token)
      setCurrentStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle step 2 completion: user confirmed they saved the token
  const handleTokenNext = () => {
    setCurrentStep(3)
  }

  // Handle step 2 back: go back to user info
  const handleTokenBack = () => {
    setCurrentStep(1)
    // Clear the token since they're going back - will need to regenerate
    setGeneratedToken(null)
  }

  // Handle step 3 confirmation: auto-login and redirect
  const handleConfirm = async () => {
    if (!generatedToken || !userInfo) return

    setIsLoading(true)
    setError(null)

    try {
      // Login with the generated token
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: generatedToken }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Login failed')
      }

      // Refresh the page to re-run server components
      // isFirstRun() will now return false, hiding the wizard
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsLoading(false)
    }
  }

  // Handle step 3 back: go back to token display
  const handleConfirmBack = () => {
    setCurrentStep(2)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-xl">
        {/* Step Indicator */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'w-8 bg-primary'
                    : step < currentStep
                    ? 'w-2 bg-primary/60'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Step {currentStep} of 3
          </p>
        </div>

        <CardContent className="pt-4">
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {currentStep === 1 && (
            <StepUserInfo
              onNext={handleUserInfoNext}
              initialValues={userInfo || undefined}
            />
          )}

          {currentStep === 2 && generatedToken && (
            <StepToken
              token={generatedToken}
              onNext={handleTokenNext}
              onBack={handleTokenBack}
            />
          )}

          {currentStep === 3 && userInfo && (
            <StepConfirm
              userInfo={userInfo}
              onConfirm={handleConfirm}
              onBack={handleConfirmBack}
              isLoading={isLoading}
            />
          )}

          {/* Show loading overlay during API call in step 1 */}
          {isLoading && currentStep === 1 && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Generating token...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
