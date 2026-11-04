import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError, fieldErrors } from "../../api/client";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./useAuth";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, signOutReason } = useAuth();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      await login(values);
      // GuestRoute performs the redirect once the session is set.
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        const mapped = fieldErrors(error);
        if (mapped.email) setError("email", { message: mapped.email });
        if (mapped.password) setError("password", { message: mapped.password });
        if (!mapped.email && !mapped.password) setFormError(error.message);
      } else {
        // 401 "Incorrect email or password.", 429, network error...
        setFormError(error instanceof Error ? error.message : "Something went wrong.");
      }
    }
  };

  const redirect = params.get("redirect");
  const registerLink = redirect
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : "/register";

  return (
    <AuthLayout title="Welcome back">
      <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
        {signOutReason === "expired" && !formError && (
          <Alert severity="info">Your session has expired. Please log in again.</Alert>
        )}
        {formError && <Alert severity="error">{formError}</Alert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus
          fullWidth
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          fullWidth
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register("password")}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" component="span">
            No account?{" "}
          </Typography>
          <Link component={RouterLink} to={registerLink} variant="body2">
            Create one
          </Link>
        </Box>
      </Stack>
    </AuthLayout>
  );
}
