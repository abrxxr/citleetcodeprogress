import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Code, Zap } from "lucide-react";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ registerNumber: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ registerNumber: "", password: "", confirmPassword: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginForm.registerNumber, loginForm.password);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (registerForm.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(registerForm.registerNumber, registerForm.password);
    setLoading(false);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "You can now log in with your register number." });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Elite Contest Tracker</h1>
          </div>
          <p className="text-muted-foreground text-sm">Track your LeetCode contest performance</p>
        </div>

        <Card>
          <Tabs defaultValue="login">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-reg">Register Number</Label>
                    <Input id="login-reg" required value={loginForm.registerNumber} onChange={(e) => setLoginForm({ ...loginForm, registerNumber: e.target.value })} placeholder="e.g. 24AM0004" className="uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" required value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="••••••" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-register">Register Number</Label>
                    <Input id="reg-register" required value={registerForm.registerNumber} onChange={(e) => setRegisterForm({ ...registerForm, registerNumber: e.target.value })} placeholder="e.g. 24AM0004" className="uppercase" />
                    <p className="text-xs text-muted-foreground">Only approved students can register</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input id="reg-password" type="password" required value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="Min 6 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">Confirm Password</Label>
                    <Input id="reg-confirm" type="password" required value={registerForm.confirmPassword} onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} placeholder="••••••" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1">
            <Code className="h-4 w-4" />
            <span>Track Contests</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap className="h-4 w-4" />
            <span>Earn Badges</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Trophy className="h-4 w-4" />
            <span>Climb Ranks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
