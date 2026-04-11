import { Button } from "./button";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import UserButton from "@/components/auth/user-button";

const Navigation = () => {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl flex items-center gap-1.5">
          <span className="font-medium text-muted-foreground">Volnyn</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="font-bold text-foreground">LogoAI<span className="text-primary">pro</span></span>
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link
            href="/generate"
            className="text-gray-500 hover:text-primary transition-colors"
          >
            Generate
          </Link>
          <Link
            href="/dashboard/my-designs"
            className="text-gray-500 hover:text-primary transition-colors"
          >
            My Designs
          </Link>
          <Link
            href="/pricing"
            className="text-gray-500 hover:text-primary transition-colors"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {!isAuthenticated ? (
            <Button
              className="inline-flex text-white"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              Sign In
            </Button>
          ) : (
            <UserButton />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
