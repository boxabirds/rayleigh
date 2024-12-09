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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    setIsAuthenticated(true);

    toast({
      title: "Welcome!",
      description: `Successfully logged in as ${agent.session?.handle}`,
    });

    // Get the return URL from query parameters
    const params = new URLSearchParams(window.location.search);
    const returnPath = params.get('return');
    
    // Redirect back to the original page or home
    setTimeout(() => {
      window.location.href = returnPath ? decodeURIComponent(returnPath) : '/';
    }, 1500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel with blue background */}
      <div className="flex-1 bg-[#F1F3F5] flex items-center justify-end p-8">
        <div className="max-w-md w-full">
          <div className="text-[#42576C] text-2xl font-extrabold text-right"></div>
          <div className="text-[#1083FE] text-4xl font-extrabold text-right">Sign in</div>
          <div className="text-[#42576C] text-lg font-semibold mt-3 max-w-[400px] text-right">
            Enter your username and password
          </div>
        </div>
      </div>

      {/* Right panel with form */}
      <div className="flex-1 bg-white flex items-center justify-start p-8">
        <div className="max-w-md w-full space-y-6">
          {!showTwoFactor ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                {/* Hosting provider button */}
                <div className="space-y-2">
                  <FormLabel className="text-sm text-[#42576C] font-semibold">
                    Hosting provider
                  </FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between bg-[#F1F3F5] hover:bg-[#E4E7EC] text-[#0B0F14]"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        className="text-[#6F869F]"
                      >
                        <path
                          fill="currentColor"
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M4.062 11h2.961c.103-2.204.545-4.218 1.235-5.77.06-.136.123-.269.188-.399A8.007 8.007 0 0 0 4.062 11ZM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 2c-.227 0-.518.1-.868.432-.354.337-.719.872-1.047 1.61-.561 1.263-.958 2.991-1.06 4.958h5.95c-.102-1.967-.499-3.695-1.06-4.958-.328-.738-.693-1.273-1.047-1.61C12.518 4.099 12.227 4 12 4Zm4.977 7c-.103-2.204-.545-4.218-1.235-5.77a9.78 9.78 0 0 0-.188-.399A8.006 8.006 0 0 1 19.938 11h-2.961Zm-2.003 2H9.026c.101 1.966.498 3.695 1.06 4.958.327.738.692 1.273 1.046 1.61.35.333.641.432.868.432.227 0 .518-.1.868-.432.354-.337.719-.872 1.047-1.61.561-1.263.958-2.991 1.06-4.958Zm.58 6.169c.065-.13.128-.263.188-.399.69-1.552 1.132-3.566 1.235-5.77h2.961a8.006 8.006 0 0 1-4.384 6.169Zm-7.108 0a9.877 9.877 0 0 1-.188-.399c-.69-1.552-1.132-3.566-1.235-5.77H4.062a8.006 8.006 0 0 0 4.384 6.169Z"
                        />
                      </svg>
                      Bluesky Social
                    </div>
                    <div className="bg-[#D4DBE2] p-1.5 rounded-lg">
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        className="text-[#6F869F]"
                      >
                        <path
                          fill="currentColor"
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M15.586 2.5a2 2 0 0 1 2.828 0L21.5 5.586a2 2 0 0 1 0 2.828l-13 13A2 2 0 0 1 7.086 22H3a1 1 0 0 1-1-1v-4.086a2 2 0 0 1 .586-1.414l13-13L17 3.914l-1.414.586ZM13 21a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2h-7a1 1 0 0 1-1-1Zm0 2c-.227 0-.518.1-.868.432-.354.337-.719.872-1.047 1.61-.561 1.263-.958 2.991-1.06 4.958h5.95c-.102-1.967-.499-3.695-1.06-4.958-.328-.738-.693-1.273-1.047-1.61C12.518 4.099 12.227 4 12 4Zm4.977 7c-.103-2.204-.545-4.218-1.235-5.77a9.78 9.78 0 0 0-.188-.399A8.006 8.006 0 0 1 19.938 11h-2.961Zm-2.003 2H9.026c.101 1.966.498 3.695 1.06 4.958.327.738.692 1.273 1.046 1.61.35.333.641.432.868.432.227 0 .518-.1.868-.432.354-.337.719-.872 1.047-1.61.561-1.263.958-2.991 1.06-4.958Zm.58 6.169c.065-.13.128-.263.188-.399.69-1.552 1.132-3.566 1.235-5.77h2.961a8.006 8.006 0 0 1-4.384 6.169Zm-7.108 0a9.877 9.877 0 0 1-.188-.399c-.69-1.552-1.132-3.566-1.235-5.77H4.062a8.006 8.006 0 0 0 4.384 6.169Z"
                        />
                      </svg>
                    </div>
                  </Button>
                </div>

                <FormField
                  control={loginForm.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-[#42576C] font-semibold">
                        Username or email
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-[#F1F3F5] border-[#D4DBE2] focus:border-[#1083FE] focus:ring-[#1083FE]"
                          disabled={isLoading}
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
                      <FormLabel className="text-sm text-[#42576C] font-semibold">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          className="bg-[#F1F3F5] border-[#D4DBE2] focus:border-[#1083FE] focus:ring-[#1083FE]"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#1083FE] hover:bg-[#0073E6] text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...twoFactorForm}>
              <form onSubmit={twoFactorForm.handleSubmit(onTwoFactorSubmit)} className="space-y-4">
                <FormField
                  control={twoFactorForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-[#42576C] font-semibold">
                        Verification Code
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoFocus
                          placeholder="XXXXX-XXXXX"
                          className="bg-[#F1F3F5] border-[#D4DBE2] focus:border-[#1083FE] focus:ring-[#1083FE]"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#1083FE] hover:bg-[#0073E6] text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify"}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
