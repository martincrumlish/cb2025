# 3. Standardize Error Handling

## Problem Statement
Error handling is inconsistent across the application:
- Some errors are silently logged to console
- No error boundaries to catch React errors
- API errors have different formats
- No user-friendly error messages
- No error tracking/monitoring

## Proposed Solution
Implement a comprehensive error handling system with:
- Global error boundary for React
- Standardized API error format
- User-friendly error messages
- Error logging and monitoring
- Recovery strategies

## Implementation Steps

### Step 1: Create Error Types

Create `src/types/errors.ts`:
```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Too many requests', 'RATE_LIMIT', 429);
    if (retryAfter) {
      this.retryAfter = retryAfter;
    }
  }
  retryAfter?: number;
}
```

### Step 2: Create Global Error Boundary

Create `src/components/ErrorBoundary.tsx`:
```typescript
import React, { Component, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { captureError } from '@/lib/error-tracking';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error tracking service
    const errorId = captureError(error, {
      componentStack: errorInfo.componentStack,
      props: this.props,
    });
    
    this.setState({ errorInfo, errorId });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            reset={this.handleReset} 
          />
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. The error has been logged and we'll look into it.
                {this.state.errorId && (
                  <span className="block mt-2 text-xs">
                    Error ID: {this.state.errorId}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs bg-muted p-2 rounded">
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'} 
                  variant="outline"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Step 3: Create Async Error Boundary

Create `src/components/AsyncErrorBoundary.tsx`:
```typescript
import { useEffect } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';

export function AsyncErrorBoundary({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();
  
  return (
    <ErrorBoundary
      fallback={({ error, reset: localReset }) => (
        <ErrorFallback 
          error={error} 
          reset={() => {
            localReset();
            reset();
          }} 
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Step 4: Standardize API Error Responses

Create `src/lib/api-error-handler.ts`:
```typescript
interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    details?: Record<string, any>;
  };
  success: false;
}

export function createApiError(
  error: AppError | Error,
  path?: string
): ApiErrorResponse {
  const isAppError = error instanceof AppError;
  
  return {
    success: false,
    error: {
      message: isAppError ? error.message : 'Internal server error',
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      statusCode: isAppError ? error.statusCode : 500,
      timestamp: new Date().toISOString(),
      path,
      details: isAppError && error instanceof ValidationError ? 
        { fields: error.fields } : undefined,
    },
  };
}

export async function handleApiError(
  error: unknown,
  req: Request,
  res: Response
): Promise<void> {
  let appError: AppError;
  
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : error.message,
      'INTERNAL_ERROR',
      500
    );
  } else {
    appError = new AppError('Unknown error', 'UNKNOWN_ERROR', 500);
  }
  
  // Log error
  console.error({
    error: appError,
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
    },
    timestamp: new Date().toISOString(),
  });
  
  const response = createApiError(appError, req.url);
  res.status(appError.statusCode).json(response);
}
```

### Step 5: Create Error Tracking Service

Create `src/lib/error-tracking.ts`:
```typescript
import * as Sentry from '@sentry/react';

// Initialize Sentry (or your preferred error tracking service)
export function initErrorTracking() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.VITE_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay(),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}

export function captureError(
  error: Error,
  context?: Record<string, any>
): string {
  const errorId = crypto.randomUUID();
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        errorId,
      },
    });
  } else {
    console.error('Captured Error:', { error, context, errorId });
  }
  
  return errorId;
}

export function setUserContext(user: { id: string; email?: string }) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser(user);
  }
}
```

### Step 6: Create Custom Hooks for Error Handling

Create `src/hooks/useErrorHandler.ts`:
```typescript
import { useCallback } from 'react';
import { toast } from 'sonner';
import { captureError } from '@/lib/error-tracking';
import { AppError } from '@/types/errors';

interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showToast = true,
    fallbackMessage = 'An error occurred',
    onError,
  } = options;
  
  const handleError = useCallback((error: unknown) => {
    let message = fallbackMessage;
    let errorObj: Error;
    
    if (error instanceof AppError) {
      message = error.message;
      errorObj = error;
    } else if (error instanceof Error) {
      message = error.message || fallbackMessage;
      errorObj = error;
    } else if (typeof error === 'string') {
      message = error;
      errorObj = new Error(error);
    } else {
      errorObj = new Error(fallbackMessage);
    }
    
    // Capture error for tracking
    captureError(errorObj);
    
    // Show toast notification
    if (showToast) {
      toast.error(message);
    }
    
    // Call custom error handler if provided
    onError?.(errorObj);
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', errorObj);
    }
  }, [showToast, fallbackMessage, onError]);
  
  return { handleError };
}
```

### Step 7: Create API Client with Error Handling

Create `src/lib/api-client.ts`:
```typescript
import { AppError, AuthenticationError, ValidationError } from '@/types/errors';

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }
  
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      switch (response.status) {
        case 400:
          throw new ValidationError(
            errorData.error?.message || 'Validation failed',
            errorData.error?.details?.fields
          );
        case 401:
          throw new AuthenticationError(errorData.error?.message);
        case 403:
          throw new AuthorizationError(errorData.error?.message);
        case 404:
          throw new NotFoundError(errorData.error?.message || 'Resource');
        case 429:
          throw new RateLimitError(
            response.headers.get('Retry-After') 
              ? parseInt(response.headers.get('Retry-After')!)
              : undefined
          );
        default:
          throw new AppError(
            errorData.error?.message || 'Request failed',
            errorData.error?.code || 'API_ERROR',
            response.status
          );
      }
    }
    
    return response.json();
  }
  
  private async fetchWithTimeout(
    url: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new AppError('Request timeout', 'TIMEOUT', 408);
      }
      throw error;
    }
  }
  
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}${path}`,
      {
        ...options,
        method: 'GET',
        headers: { ...this.defaultHeaders, ...options?.headers },
      }
    );
    return this.handleResponse<T>(response);
  }
  
  async post<T>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}${path}`,
      {
        ...options,
        method: 'POST',
        headers: { ...this.defaultHeaders, ...options?.headers },
        body: data ? JSON.stringify(data) : undefined,
      }
    );
    return this.handleResponse<T>(response);
  }
  
  // Similar methods for PUT, PATCH, DELETE...
}

export const apiClient = new ApiClient('/api');
```

### Step 8: Update Components to Use Error Handling

Update `src/pages/admin/AdminSettings.tsx`:
```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

const AdminSettings = () => {
  const { handleError } = useErrorHandler({
    fallbackMessage: 'Failed to save settings',
  });
  
  const onSubmit = async (data: AppSettingsForm) => {
    try {
      await updateAppSettings(user.id, data);
      toast.success('Settings saved successfully!');
    } catch (error) {
      handleError(error);
    }
  };
  
  // Rest of component...
};
```

### Step 9: Add Error Recovery Strategies

Create `src/components/ErrorRecovery.tsx`:
```typescript
import { Component } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onRetry?: () => void;
  maxRetries?: number;
}

interface State {
  retryCount: number;
}

export class ErrorRecovery extends Component<Props, State> {
  state = { retryCount: 0 };
  
  handleRetry = () => {
    const { maxRetries = 3, onRetry } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prev => ({ retryCount: prev.retryCount + 1 }));
      onRetry?.();
    }
  };
  
  render() {
    const { maxRetries = 3 } = this.props;
    const canRetry = this.state.retryCount < maxRetries;
    
    return (
      <>
        {this.props.children}
        {this.state.retryCount > 0 && (
          <div className="mt-4">
            <Button
              onClick={this.handleRetry}
              disabled={!canRetry}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry ({this.state.retryCount}/{maxRetries})
            </Button>
          </div>
        )}
      </>
    );
  }
}
```

### Step 10: Setup Error Monitoring Dashboard

Create `src/pages/admin/ErrorMonitoring.tsx`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorLogs } from '@/lib/error-logs';

export function ErrorMonitoring() {
  const { data: errors } = useQuery({
    queryKey: ['error-logs'],
    queryFn: getErrorLogs,
  });
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {errors?.map(error => (
              <div key={error.id} className="border rounded p-4">
                <div className="flex justify-between">
                  <span className="font-medium">{error.message}</span>
                  <Badge variant={error.level === 'error' ? 'destructive' : 'warning'}>
                    {error.level}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {error.timestamp} • {error.user} • {error.path}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Testing Error Handling

Create `src/tests/error-handling.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { AppError, ValidationError } from '@/types/errors';
import { createApiError } from '@/lib/api-error-handler';

describe('Error Handling', () => {
  it('creates proper API error response', () => {
    const error = new ValidationError('Invalid input', {
      email: 'Invalid email format',
    });
    
    const response = createApiError(error, '/api/test');
    
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('VALIDATION_ERROR');
    expect(response.error.statusCode).toBe(400);
    expect(response.error.details?.fields).toEqual({
      email: 'Invalid email format',
    });
  });
});
```

## Error Handling Checklist
- [ ] Create error type definitions
- [ ] Implement global error boundary
- [ ] Setup async error boundary
- [ ] Standardize API error responses
- [ ] Integrate error tracking service
- [ ] Create error handling hooks
- [ ] Update API client with error handling
- [ ] Update all components to use error handler
- [ ] Add error recovery strategies
- [ ] Setup error monitoring
- [ ] Document error codes
- [ ] Test error scenarios
- [ ] Add error logging
- [ ] Setup alerting for critical errors

## Benefits After Implementation
- Consistent error experience for users
- Better debugging with error tracking
- Reduced app crashes
- Improved user trust
- Faster issue resolution
- Better monitoring and alerting