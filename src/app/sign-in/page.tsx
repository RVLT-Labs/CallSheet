import { CenteredCard } from "@/components/ui/centered-card";
import { MagicLinkFlow } from "@/components/auth/magic-link-flow";

export default function SignInPage() {
  return (
    <CenteredCard>
      <MagicLinkFlow callbackURL="/" />
    </CenteredCard>
  );
}
