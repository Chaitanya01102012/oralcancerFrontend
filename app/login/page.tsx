"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import * as authService from "@/services/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean(),
});

const registerSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const otpSchema = z.object({
  otp_code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

const resetPasswordSchema = z
  .object({
    new_password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string().min(6, "Confirm your password"),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type ForgotValues = z.infer<typeof forgotSchema>;
type OtpValues = z.infer<typeof otpSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
type AuthMode = "login" | "register" | "reset";
type ResetStep = "email" | "otp" | "password";

function getErrorMessage(err: unknown, fallback: string) {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const forgotForm = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp_code: "" },
  });

  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  function openReset() {
    setMode("reset");
    setResetStep("email");
    setResetEmail("");
    setResetOtp("");
    forgotForm.reset({ email: loginForm.getValues("email") || "" });
    otpForm.reset({ otp_code: "" });
    resetPasswordForm.reset({ new_password: "", confirm_password: "" });
  }

  function backToLogin() {
    setMode("login");
    setResetStep("email");
    setResetEmail("");
    setResetOtp("");
  }

  async function onLogin(values: LoginValues) {
    setSubmitting(true);
    try {
      await login(values.email, values.password, values.remember);
      toast.success("Welcome back");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Login failed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onRegister(values: RegisterValues) {
    setSubmitting(true);
    try {
      await register(values.email, values.password, values.full_name);
      toast.success("Account created");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onForgot(values: ForgotValues) {
    setSubmitting(true);
    try {
      const result = await authService.forgotPassword(values.email);
      setResetEmail(values.email);
      setResetStep("otp");
      otpForm.reset({ otp_code: "" });
      toast.success(result.message || "If an account exists with this email, a reset code has been sent.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not send reset code"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyOtp(values: OtpValues) {
    setSubmitting(true);
    try {
      await authService.verifyOtp(resetEmail, values.otp_code);
      setResetOtp(values.otp_code);
      setResetStep("password");
      resetPasswordForm.reset({ new_password: "", confirm_password: "" });
      toast.success("Code verified. Set a new password.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Invalid or expired code"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onResetPassword(values: ResetPasswordValues) {
    setSubmitting(true);
    try {
      const result = await authService.resetPassword(resetEmail, resetOtp, values.new_password);
      toast.success(result.message || "Password reset successful");
      const email = resetEmail;
      backToLogin();
      loginForm.setValue("email", email);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not reset password"));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    if (!resetEmail) return;
    setSubmitting(true);
    try {
      const result = await authService.forgotPassword(resetEmail);
      toast.success(result.message || "A new reset code has been sent.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not resend code"));
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    mode === "register"
      ? "Create account"
      : mode === "reset"
        ? resetStep === "otp"
          ? "Enter reset code"
          : resetStep === "password"
            ? "Set new password"
            : "Reset password"
        : "Sign in";

  const subtitle =
    mode === "register"
      ? "Access your OralCare AI diagnostic workspace."
      : mode === "reset"
        ? resetStep === "otp"
          ? `We sent a 6-digit code to ${resetEmail}.`
          : resetStep === "password"
            ? "Choose a new password for your account."
            : "Enter your email and we will send a reset code if an account exists."
        : "Access your OralCare AI diagnostic workspace.";

  return (
    <div className="flex min-h-screen flex-col bg-[#12141f]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(109,191,143,0.08)_0%,_transparent_60%)]" />
      <Navbar />
      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-[#252840] bg-[#1a1d2e] p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm text-[#a0a8b8]">{subtitle}</p>

          {mode === "login" ? (
            <form className="mt-8 space-y-4" onSubmit={loginForm.handleSubmit(onLogin)}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...loginForm.register("email")} />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-[#e05555]">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-[#6dbf8f] hover:underline"
                    onClick={openReset}
                  >
                    Forgot password?
                  </button>
                </div>
                <Input id="password" type="password" {...loginForm.register("password")} />
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-[#e05555]">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={loginForm.watch("remember")}
                  onCheckedChange={(v) => loginForm.setValue("remember", v === true)}
                />
                <Label htmlFor="remember" className="font-normal">
                  Remember Me
                </Label>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#6dbf8f] text-[#0d1a14] hover:bg-[#5aad7d]"
                disabled={submitting}
              >
                {submitting ? "Signing in..." : "Login"}
              </Button>
            </form>
          ) : mode === "register" ? (
            <form className="mt-8 space-y-4" onSubmit={registerForm.handleSubmit(onRegister)}>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" {...registerForm.register("full_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg_email">Email</Label>
                <Input id="reg_email" type="email" {...registerForm.register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg_password">Password</Label>
                <Input id="reg_password" type="password" {...registerForm.register("password")} />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#6dbf8f] text-[#0d1a14] hover:bg-[#5aad7d]"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Account"}
              </Button>
            </form>
          ) : resetStep === "email" ? (
            <form className="mt-8 space-y-4" onSubmit={forgotForm.handleSubmit(onForgot)}>
              <div className="space-y-2">
                <Label htmlFor="reset_email">Email</Label>
                <Input id="reset_email" type="email" {...forgotForm.register("email")} />
                {forgotForm.formState.errors.email && (
                  <p className="text-xs text-[#e05555]">{forgotForm.formState.errors.email.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-[#6dbf8f] text-[#0d1a14] hover:bg-[#5aad7d]"
                disabled={submitting}
              >
                {submitting ? "Sending code..." : "Send reset code"}
              </Button>
            </form>
          ) : resetStep === "otp" ? (
            <form className="mt-8 space-y-4" onSubmit={otpForm.handleSubmit(onVerifyOtp)}>
              <div className="space-y-2">
                <Label htmlFor="otp_code">Reset code</Label>
                <Input
                  id="otp_code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  {...otpForm.register("otp_code")}
                />
                {otpForm.formState.errors.otp_code && (
                  <p className="text-xs text-[#e05555]">{otpForm.formState.errors.otp_code.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-[#6dbf8f] text-[#0d1a14] hover:bg-[#5aad7d]"
                disabled={submitting}
              >
                {submitting ? "Verifying..." : "Verify code"}
              </Button>
              <p className="text-center text-xs text-[#7a8299]">
                Didn&apos;t get a code?{" "}
                <button
                  type="button"
                  className="font-medium text-[#6dbf8f]"
                  onClick={resendCode}
                  disabled={submitting}
                >
                  Resend
                </button>
              </p>
            </form>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={resetPasswordForm.handleSubmit(onResetPassword)}>
              <div className="space-y-2">
                <Label htmlFor="new_password">New password</Label>
                <Input id="new_password" type="password" {...resetPasswordForm.register("new_password")} />
                {resetPasswordForm.formState.errors.new_password && (
                  <p className="text-xs text-[#e05555]">
                    {resetPasswordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  {...resetPasswordForm.register("confirm_password")}
                />
                {resetPasswordForm.formState.errors.confirm_password && (
                  <p className="text-xs text-[#e05555]">
                    {resetPasswordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-[#6dbf8f] text-[#0d1a14] hover:bg-[#5aad7d]"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Reset password"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-[#a0a8b8]">
            {mode === "login" ? (
              <>
                Need an account?{" "}
                <button
                  type="button"
                  className="font-medium text-[#6dbf8f]"
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
              </>
            ) : mode === "register" ? (
              <>
                Already registered?{" "}
                <button
                  type="button"
                  className="font-medium text-[#6dbf8f]"
                  onClick={() => setMode("login")}
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Remembered your password?{" "}
                <button type="button" className="font-medium text-[#6dbf8f]" onClick={backToLogin}>
                  Back to login
                </button>
              </>
            )}
          </p>
          <p className="mt-3 text-center text-xs text-[#7a8299]">
            <Link href="/" className="hover:text-[#6dbf8f] transition-colors">Back to homepage</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
