import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function SignUpForm() {
  const { signUp } = useAuth()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [invitationData, setInvitationData] = useState<any>(null)
  const [checkingInvitation, setCheckingInvitation] = useState(false)

  const invitationId = searchParams.get('invitation')
  const invitedEmail = searchParams.get('email')

  useEffect(() => {
    // If we have an invitation ID, verify it and pre-fill the email
    if (invitationId && invitedEmail) {
      setCheckingInvitation(true)
      verifyInvitation()
    }
  }, [invitationId, invitedEmail])

  const verifyInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('invitation_id', invitationId)
        .eq('email', invitedEmail)
        .eq('status', 'invited')
        .single()

      if (error || !data) {
        toast.error('Invalid or expired invitation')
        return
      }

      // Check if invitation has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('This invitation has expired')
        return
      }

      setInvitationData(data)
      setEmail(invitedEmail || '')
    } catch (error) {
      console.error('Error verifying invitation:', error)
      toast.error('Failed to verify invitation')
    } finally {
      setCheckingInvitation(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Sign up the user
      const { error: signUpError, data } = await signUp(email, password)
      if (signUpError) throw signUpError

      // If we have an invitation, update the user_roles record
      if (invitationData && data?.user) {
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({
            user_id: data.user.id,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('invitation_id', invitationData.invitation_id)

        if (updateError) {
          console.error('Failed to update invitation status:', updateError)
        } else {
          // Also create user_metadata record for the new user
          await supabase
            .from('user_metadata')
            .insert({
              user_id: data.user.id,
              status: 'active',
              login_count: 0,
              tags: [],
              created_by: invitationData.created_by
            })
        }
      }

      toast.success(
        invitationData 
          ? 'Account created! You can now sign in.' 
          : 'Check your email to confirm your account!'
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  if (checkingInvitation) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Verifying invitation...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {invitationData && <UserPlus className="h-5 w-5" />}
          Sign Up
        </CardTitle>
        <CardDescription>
          {invitationData 
            ? `You've been invited as ${invitationData.role}. Create your account below.`
            : 'Create an account to get started'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitationData && (
          <Alert className="mb-4">
            <UserPlus className="h-4 w-4" />
            <AlertDescription>
              You're accepting an invitation to join with <strong>{invitationData.role}</strong> privileges.
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!!invitationData}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign Up
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}