import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login, loading, authConfig, loginWithSso, isAuthenticated } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Surface any error passed back from the OIDC callback redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) setErrorMsg(decodeURIComponent(err));
  }, []);

  // Demo mode never shows a login wall — redirect straight into the app.
  useEffect(() => {
    if (authConfig.mode === 'demo' || isAuthenticated) {
      navigate('/');
    }
  }, [authConfig.mode, isAuthenticated, navigate]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setErrorMsg(null);
    const success = await login(values.username, values.password);
    if (success) {
      navigate('/');
    }
  };

  const isFormMode = authConfig.mode === 'local' || authConfig.mode === 'ldap';
  const providerName = authConfig.providerName ?? 'SSO';

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Research Portal Login
          </CardTitle>
          <CardDescription className="text-center">
            {isFormMode
              ? `Enter your ${authConfig.mode === 'ldap' ? 'institutional ' : ''}credentials to access the research management system`
              : `Sign in via ${providerName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div
              className="mb-4 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive"
              data-testid="text-login-error"
            >
              {errorMsg}
            </div>
          )}

          {authConfig.mode === 'oidc' && (
            <Button
              type="button"
              className="w-full"
              onClick={loginWithSso}
              disabled={loading}
              data-testid="button-login-sso"
            >
              Sign in with {providerName}
            </Button>
          )}

          {isFormMode && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" autoComplete="off" data-1p-ignore="true" data-lpignore="true" data-testid="input-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          autoComplete="off" data-1p-ignore="true" data-lpignore="true"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                  {loading ? 'Logging in...' : 'Log in'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Contact your administrator if you need access
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
