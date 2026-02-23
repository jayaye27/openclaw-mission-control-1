'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface UserInfo {
  firstName: string
  lastName: string
  email: string
}

interface StepUserInfoProps {
  onNext: (userInfo: UserInfo) => void
  initialValues?: UserInfo
}

export function StepUserInfo({ onNext, initialValues }: StepUserInfoProps) {
  const [firstName, setFirstName] = useState(initialValues?.firstName || '')
  const [lastName, setLastName] = useState(initialValues?.lastName || '')
  const [email, setEmail] = useState(initialValues?.email || '')
  const [errors, setErrors] = useState<string[]>([])

  const validate = (): boolean => {
    const newErrors: string[] = []

    if (!firstName.trim()) {
      newErrors.push('First name is required')
    } else if (firstName.length > 50) {
      newErrors.push('First name must be 50 characters or less')
    }

    if (!lastName.trim()) {
      newErrors.push('Last name is required')
    } else if (lastName.length > 50) {
      newErrors.push('Last name must be 50 characters or less')
    }

    if (!email.trim()) {
      newErrors.push('Email is required')
    } else if (!email.includes('@') || !email.includes('.')) {
      newErrors.push('Please enter a valid email address')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Welcome to Alfo Claw
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Let&apos;s set up your admin account
        </p>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <ul className="list-disc list-inside text-sm text-destructive">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="firstName" className="text-sm font-medium text-foreground">
            First Name
          </label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="lastName" className="text-sm font-medium text-foreground">
            Last Name
          </label>
          <Input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter your last name"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
          />
          <p className="text-xs text-muted-foreground">
            For display purposes only. No emails will be sent.
          </p>
        </div>
      </div>

      <Button type="submit" className="w-full">
        Continue
      </Button>
    </form>
  )
}
