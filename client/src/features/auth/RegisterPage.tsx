import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Link, Stack, TextField, Typography } from "@mui/material";
import { ApiError, fieldErrors } from "../../api/client";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./useAuth";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80, "Name must be at most 80 characters"),
    email: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email address")),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
type RegisterValues = z.infer<typeof registerSchema>;

const FIELDS = ["name", "email", "password"] as const;

export default function RegisterPage() {
  const { register: signUp } = useAuth();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async ({ name, email, password }: RegisterValues) => {
    setFormError(null);
    try {
      await signUp({ name, email, password });
      // GuestRoute sends the new user to the projects page.
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("Something went wrong.");
        return;
      }
      const mapped = fieldErrors(error);
      let shown = false;
      for (const field of FIELDS) {
        const message = mapped[field];
        if (message) {
          setError(field, { message });
          shown = true;
        }
      }
      // Anything not tied to a field (429, network error...) goes above the form.
      if (!shown) setFormError(error.message);
    }
  };

  const redirect = params.get("redirect");
  const loginLink = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";

  return (
    <AuthLayout title="Create your account">
      <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
        {formError && <Alert severity="error">{formError}</Alert>}

        <TextField
          label="Name"
          autoComplete="name"
          placeholder="Your name"
          autoFocus
          fullWidth
          error={!!errors.name}
          helperText={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          fullWidth
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          fullWidth
          error={!!errors.password}
          helperText={errors.password?.message ?? "Min 8 characters"}
          {...register("password")}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          fullWidth
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" component="span">
            Already have an account?{" "}
          </Typography>
          <Link component={RouterLink} to={loginLink} variant="body2">
            Log in
          </Link>
        </Box>
      </Stack>
    </AuthLayout>
  );
}