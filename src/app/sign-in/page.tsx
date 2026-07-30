import { AuthLayout } from "@/components/auth/auth-layout";
import { MagicLinkFlow } from "@/components/auth/magic-link-flow";

export default function SignInPage() {
  return (
    <AuthLayout>
      <MagicLinkFlow callbackURL="/" />
    </AuthLayout>
  );
}
