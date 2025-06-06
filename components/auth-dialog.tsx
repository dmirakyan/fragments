import Auth, { ViewType } from './auth'
import Logo from './logo'
import { validateEmail } from '@/app/actions/validate-email'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { SupabaseClient } from '@supabase/supabase-js'

export function AuthDialog({
  open,
  setOpen,
  supabase,
  view,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  supabase: SupabaseClient
  view: ViewType
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <VisuallyHidden>
          <DialogTitle>Sign in to LemonFarm</DialogTitle>
          <DialogDescription>
            Sign in or create an account to access LemonFarm
          </DialogDescription>
        </VisuallyHidden>
        <div className="flex justify-center items-center flex-col">
          <h1 className="flex items-center gap-4 text-xl font-bold mb-6 w-full">
            <img src="/logos/logo_large.png" alt="LemonFarm" className="w-8 h-8" />
            Sign in to LemonFarm
          </h1>
          <div className="w-full">
            <Auth
              supabaseClient={supabase}
              view={view}
              providers={['google']}
              socialLayout="horizontal"
              onSignUpValidate={validateEmail}
              metadata={{
                is_fragments_user: true,
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
