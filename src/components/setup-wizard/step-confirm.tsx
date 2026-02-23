'use client'

import { Button } from '@/components/ui/button'
import { Loader2, User, Mail } from 'lucide-react'

interface UserInfo {
  firstName: string
  lastName: string
  email: string
}

interface StepConfirmProps {
  userInfo: UserInfo
  onConfirm: () => void
  onBack: () => void
  isLoading: boolean
}

export function StepConfirm({ userInfo, onConfirm, onBack, isLoading }: StepConfirmProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Confirm Setup
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review your information before completing setup
        </p>
      </div>

      {/* User Info Summary */}
      <div className="rounded-md bg-muted/30 border border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <User className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm font-medium text-foreground">
              {userInfo.firstName} {userInfo.lastName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium text-foreground">
              {userInfo.email}
            </p>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        <p>
          After completing setup, you&apos;ll be automatically logged in and
          redirected to the dashboard.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Setting up...
            </>
          ) : (
            'Complete Setup'
          )}
        </Button>
      </div>
    </div>
  )
}
