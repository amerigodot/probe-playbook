import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function Login() {
  const { user, signIn, signInWithAzure, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      if (error.message === "Invalid login credentials") {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message);
      }
    }
    setSubmitting(false);
  };

  const handleAzureLogin = async () => {
    try {
      await signInWithAzure();
    } catch (error: any) {
      toast.error(error.message || "Azure AD login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Sign in to AgentOps</CardTitle>
          <CardDescription>Monitor and govern your AI agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 border-primary/20 hover:bg-primary/5" 
            onClick={handleAzureLogin}
          >
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            Sign in with Azure AD (Entra ID)
          </Button>
          
          <div className="relative flex items-center py-2">
            <Separator className="flex-grow" />
            <span className="mx-2 text-xs text-muted-foreground uppercase">or</span>
            <Separator className="flex-grow" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-0">
          <div className="flex justify-between w-full text-sm">
            <Link to="/signup" className="text-primary hover:underline">Create account</Link>
            <Link to="/forgot-password" className="text-muted-foreground hover:underline">Forgot password?</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
