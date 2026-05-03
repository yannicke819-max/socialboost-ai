import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/Logo';

export const metadata = { title: 'Mot de passe oublié — SocialBoost AI' };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="flex justify-center">
        <Logo />
      </div>
      <div className="mt-8 rounded-2xl border border-border bg-bg-elevated p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          Mot de passe oublié
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Pour réinitialiser ton mot de passe, contacte{' '}
          <a
            href="mailto:support@socialboost.ai"
            className="inline-flex items-center gap-1 font-mono text-fg underline-offset-2 hover:underline"
          >
            <Mail size={13} aria-hidden />
            support@socialboost.ai
          </a>
          . On revient vers toi sous 48 heures.
        </p>
        <Button href="/login" variant="outline" size="md" className="mt-6 w-full">
          <ArrowLeft size={16} /> Retour à la connexion
        </Button>
      </div>
    </main>
  );
}
