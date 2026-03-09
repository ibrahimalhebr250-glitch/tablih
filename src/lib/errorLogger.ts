import { supabase } from './supabase';

type ErrorType = 'db_error' | 'deal_failure' | 'match_failure' | 'network_error' | 'session_error' | 'ui_error' | 'other';
type Severity = 'critical' | 'error' | 'warning' | 'info';

interface ErrorContext {
  page?: string;
  action?: string;
  orderId?: string;
  dealId?: string;
  batchId?: string;
  extra?: Record<string, unknown>;
}

interface LogErrorOptions {
  type: ErrorType;
  code?: string;
  message: string;
  severity?: Severity;
  userPhone?: string;
  sessionToken?: string;
  stack?: string;
  context?: ErrorContext;
}

const queue: LogErrorOptions[] = [];
let flushing = false;

async function flushQueue() {
  if (flushing || queue.length === 0) return;
  flushing = true;

  const batch = queue.splice(0, 10);

  try {
    await supabase.from('error_logs').insert(
      batch.map((e) => ({
        error_type: e.type,
        error_code: e.code ?? null,
        message: e.message,
        severity: e.severity ?? 'error',
        user_phone: e.userPhone ?? null,
        session_token: e.sessionToken ?? null,
        stack_trace: e.stack ?? null,
        context: {
          page: e.context?.page,
          action: e.context?.action,
          orderId: e.context?.orderId,
          dealId: e.context?.dealId,
          batchId: e.context?.batchId,
          userAgent: navigator.userAgent,
          ...e.context?.extra,
        },
      }))
    );
  } catch {
    // silently discard — logging should never crash the app
  } finally {
    flushing = false;
    if (queue.length > 0) {
      setTimeout(flushQueue, 2000);
    }
  }
}

export function logError(opts: LogErrorOptions) {
  if (import.meta.env.DEV) {
    console.error(`[${opts.type}]`, opts.message, opts.context ?? '');
  }
  queue.push(opts);
  setTimeout(flushQueue, 500);
}

export function logDBError(message: string, userPhone?: string, context?: ErrorContext) {
  logError({ type: 'db_error', message, severity: 'error', userPhone, context });
}

export function logDealFailure(message: string, userPhone?: string, context?: ErrorContext) {
  logError({ type: 'deal_failure', message, severity: 'critical', userPhone, context });
}

export function logMatchFailure(message: string, userPhone?: string, context?: ErrorContext) {
  logError({ type: 'match_failure', message, severity: 'error', userPhone, context });
}

export function logNetworkError(message: string, userPhone?: string, context?: ErrorContext) {
  logError({ type: 'network_error', message, severity: 'warning', userPhone, context });
}

export function logSessionError(message: string, userPhone?: string, context?: ErrorContext) {
  logError({ type: 'session_error', message, severity: 'error', userPhone, context });
}

export function logUIError(error: Error, context?: ErrorContext) {
  logError({
    type: 'ui_error',
    message: error.message,
    severity: 'error',
    stack: error.stack,
    context,
  });
}

export function setupGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    logError({
      type: 'ui_error',
      code: 'UNHANDLED_PROMISE',
      message,
      severity: 'critical',
      stack: reason instanceof Error ? reason.stack : undefined,
      context: { page: window.location.pathname },
    });
  });

  window.addEventListener('error', (event) => {
    logError({
      type: 'ui_error',
      code: 'GLOBAL_ERROR',
      message: event.message,
      severity: 'critical',
      stack: event.error?.stack,
      context: { page: window.location.pathname },
    });
  });
}
