import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { BskyAgent } from "@atproto/api";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

const twoFactorSchema = z.object({
  code: z.string()
    .length(11, "Code must be in the format XXXXX-XXXXX")
    .regex(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/, "Code must be in the format XXXXX-XXXXX"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type TwoFactorFormData = z.infer<typeof twoFactorSchema>;

export default function AuthPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [loginData, setLoginData] = useState<LoginFormData | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const twoFactorForm = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: "",
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const agent = new BskyAgent({
        service: "https://bsky.social",
      });

      toast({
        title: "Authenticating",
        description: "Connecting to BlueSky...",
      });

      await agent.login({
        identifier: data.identifier,
        password: data.password,
      });

      // If we get here without an error, we're logged in
      handleSuccessfulLogin(agent);
    } catch (error: any) {
      console.error("Login error:", error);

      // Check if this is a 2FA request
      if (error.message === "A sign in code has been sent to your email address") {
        setLoginData(data);
        setShowTwoFactor(true);
        toast({
          title: "Verification Required",
          description: "Please enter the verification code sent to your email",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description:
            error.message || "Please check your credentials and try again",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onTwoFactorSubmit = async (data: TwoFactorFormData) => {
    if (!loginData) return;

    setIsLoading(true);
    try {
      const agent = new BskyAgent({
        service: "https://bsky.social",
      });

      await agent.login({
        identifier: loginData.identifier,
        password: loginData.password,
        authFactorToken: data.code,
      });

      handleSuccessfulLogin(agent);
    } catch (error: any) {
      console.error("2FA Verification error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulLogin = (agent: BskyAgent) => {
    if (!agent.session) return;

    // Store the session securely
    localStorage.setItem("bsky-session", JSON.stringify(agent.session));

    toast({
      title: "Welcome!",
      description: `Successfully logged in as ${agent.session?.handle}`,
    });

    // Redirect to home after successful login
    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background bg-gradient-to-b from-background to-background/95">
      <Card className="w-[90%] max-w-md p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-opacity-50">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Sign in with BlueSky
          </h1>

          {!showTwoFactor ? (
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username or Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="handle.bsky.social"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full transition-all hover:scale-105"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="mr-2">Signing in</span>
                      <span className="animate-spin">⋯</span>
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...twoFactorForm}>
              <form
                onSubmit={twoFactorForm.handleSubmit(onTwoFactorSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <FormField
                    control={twoFactorForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="XXXXX-XXXXX"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the code sent to your email (format: XXXXX-XXXXX)
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify"}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </Card>
    </div>
  );
}
