import { CenteredCard } from "@/components/ui/centered-card";
import { EmailCodeFlow } from "@/components/auth/email-code-flow";
import { PasskeySignIn } from "@/components/auth/passkey-sign-in";

export default function SignInPage() {
  return (
    <CenteredCard>
      <PasskeySignIn callbackURL="/" />
      <EmailCodeFlow callbackURL="/" />
    </CenteredCard>
  );
}
