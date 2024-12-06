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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1a1a1a]">
      <Card className="w-[90%] max-w-md p-8 bg-white dark:bg-[#222222] shadow-2xl hover:shadow-3xl transition-all duration-300 border-[#e5e5e5] dark:border-[#333333]">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0085ff] to-[#00a2ff] bg-clip-text text-transparent">
              Sign in with BlueSky
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your account details below
            </p>
          </div>

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
                      <FormLabel className="text-[#4a4a4a] dark:text-[#e5e5e5]">Username or Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="handle.bsky.social"
                          className="bg-[#f9f9f9] dark:bg-[#2a2a2a] border-[#e5e5e5] dark:border-[#333333] focus:border-[#0085ff] dark:focus:border-[#00a2ff]"
                        />
                      </FormControl>
                      <FormMessage className="text-[#ff4a4a]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#4a4a4a] dark:text-[#e5e5e5]">Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          className="bg-[#f9f9f9] dark:bg-[#2a2a2a] border-[#e5e5e5] dark:border-[#333333] focus:border-[#0085ff] dark:focus:border-[#00a2ff]"
                        />
                      </FormControl>
                      <FormMessage className="text-[#ff4a4a]" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#0085ff] hover:bg-[#0075e0] text-white transition-all hover:scale-105"
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
                        <FormLabel className="text-[#4a4a4a] dark:text-[#e5e5e5]">Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="XXXXX-XXXXX"
                            {...field}
                            className="bg-[#f9f9f9] dark:bg-[#2a2a2a] border-[#e5e5e5] dark:border-[#333333] focus:border-[#0085ff] dark:focus:border-[#00a2ff]"
                          />
                        </FormControl>
                        <FormMessage className="text-[#ff4a4a]" />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the code sent to your email (format: XXXXX-XXXXX)
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#0085ff] hover:bg-[#0075e0] text-white"
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
