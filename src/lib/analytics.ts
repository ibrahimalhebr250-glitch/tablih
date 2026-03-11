import { supabase } from './supabase';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

interface UserBehavior {
  event_type: string;
  event_data: any;
  user_phone?: string;
  session_id?: string;
  timestamp: string;
}

class Analytics {
  private gaInitialized = false;
  private measurementId: string | null = null;
  private userBehaviorQueue: UserBehavior[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  initialize(measurementId: string) {
    if (this.gaInitialized) return;

    this.measurementId = measurementId;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: any[]) {
      window.dataLayer?.push(args);
    };

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      page_path: window.location.pathname,
      send_page_view: true
    });

    this.gaInitialized = true;
  }

  trackPageView(path: string, title?: string) {
    if (this.gaInitialized && window.gtag) {
      window.gtag('config', this.measurementId!, {
        page_path: path,
        page_title: title || document.title
      });
    }
    this.trackUserBehavior('page_view', { path, title });
  }

  trackEvent({ action, category, label, value }: AnalyticsEvent) {
    if (this.gaInitialized && window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
    }
    this.trackUserBehavior('event', { action, category, label, value });
  }

  trackUserAction(action: string, details?: any) {
    this.trackUserBehavior(action, details ?? {});
  }

  trackOrderCreated(orderId: string, orderValue: number, userPhone?: string) {
    this.trackEvent({ action: 'order_created', category: 'orders', label: orderId, value: orderValue });
    this.trackUserBehavior('order_created', { order_id: orderId, value: orderValue }, userPhone);
  }

  trackInventoryAdded(batchId: string, quantity: number, userPhone?: string) {
    this.trackEvent({ action: 'inventory_added', category: 'inventory', label: batchId, value: quantity });
    this.trackUserBehavior('inventory_added', { batch_id: batchId, quantity }, userPhone);
  }

  trackDealCompleted(dealId: string, dealValue: number, userPhone?: string) {
    this.trackEvent({ action: 'deal_completed', category: 'deals', label: dealId, value: dealValue });
    this.trackUserBehavior('deal_completed', { deal_id: dealId, value: dealValue }, userPhone);
  }

  trackUserLogin(userPhone: string, userType: string) {
    if (this.gaInitialized && window.gtag) {
      window.gtag('event', 'user_login', { event_category: 'authentication', event_label: `${userType}_${userPhone}` });
    }
    this.trackUserBehavior('user_login', { user_type: userType }, userPhone);
    this.updateVisitorPhone(userPhone);
  }

  trackUserRegistration(userPhone: string, userType: string) {
    if (this.gaInitialized && window.gtag) {
      window.gtag('event', 'user_registration', { event_category: 'authentication', event_label: `${userType}_${userPhone}` });
    }
    this.trackUserBehavior('user_registration', { user_type: userType }, userPhone);
    this.updateVisitorPhone(userPhone);
  }

  trackSearch(searchTerm: string, resultsCount: number, userPhone?: string) {
    this.trackEvent({ action: 'search', category: 'search', label: searchTerm, value: resultsCount });
    this.trackUserBehavior('search', { term: searchTerm, results: resultsCount }, userPhone);
  }

  trackUserBehavior(eventType: string, eventData: any, userPhone?: string) {
    const behavior: UserBehavior = {
      event_type: eventType,
      event_data: eventData,
      user_phone: userPhone,
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString()
    };

    this.userBehaviorQueue.push(behavior);

    if (this.userBehaviorQueue.length >= 5) {
      this.flushBehaviorQueue();
    } else {
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flushBehaviorQueue(), 3000);
    }
  }

  async flushBehaviorQueue() {
    if (this.userBehaviorQueue.length === 0) return;
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }

    const behaviors = [...this.userBehaviorQueue];
    this.userBehaviorQueue = [];

    try {
      const rows = behaviors.map(b => ({
        event_type: b.event_type,
        event_data: b.event_data,
        user_phone: b.user_phone ?? null,
        session_id: b.session_id ?? null,
        created_at: b.timestamp,
      }));
      await supabase.from('user_behavior_tracking').insert(rows);
    } catch {
    }
  }

  private updateVisitorPhone(phone: string) {
    const visitorId = localStorage.getItem('_pvid');
    const sessionId = this.getSessionId();
    if (!visitorId) return;
    supabase
      .from('platform_visitor_logs')
      .update({ phone })
      .eq('visitor_id', visitorId)
      .is('phone', null)
      .then(() => {}).catch(() => {});
    if (sessionId) {
      supabase.rpc('update_session_phone', {
        p_session_id: sessionId,
        p_phone: phone,
      }).then(() => {}).catch(() => {});
    }
  }

  private getSessionId(): string {
    let sid = sessionStorage.getItem('_psid');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('_psid', sid);
    }
    return sid;
  }

  setUserProperties(properties: Record<string, any>) {
    if (!this.gaInitialized || !window.gtag) return;
    window.gtag('set', 'user_properties', properties);
  }

  trackTiming(category: string, variable: string, time: number, label?: string) {
    if (!this.gaInitialized || !window.gtag) return;
    window.gtag('event', 'timing_complete', { name: variable, value: time, event_category: category, event_label: label });
  }

  trackException(description: string, fatal = false) {
    if (!this.gaInitialized || !window.gtag) return;
    window.gtag('event', 'exception', { description, fatal });
  }
}

export const analytics = new Analytics();

export function initializeAnalytics() {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (gaId) analytics.initialize(gaId);

  window.addEventListener('beforeunload', () => {
    analytics.flushBehaviorQueue();
  });
}
