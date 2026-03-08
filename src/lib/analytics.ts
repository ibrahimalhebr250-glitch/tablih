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
    if (!this.gaInitialized || !window.gtag) return;

    window.gtag('config', this.measurementId!, {
      page_path: path,
      page_title: title || document.title
    });

    this.trackUserBehavior('page_view', { path, title });
  }

  trackEvent({ action, category, label, value }: AnalyticsEvent) {
    if (!this.gaInitialized || !window.gtag) return;

    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });

    this.trackUserBehavior('event', { action, category, label, value });
  }

  trackUserAction(action: string, details?: any) {
    this.trackEvent({
      action,
      category: 'user_action',
      label: JSON.stringify(details)
    });
  }

  trackOrderCreated(orderId: string, orderValue: number) {
    this.trackEvent({
      action: 'order_created',
      category: 'orders',
      label: orderId,
      value: orderValue
    });
  }

  trackInventoryAdded(batchId: string, quantity: number) {
    this.trackEvent({
      action: 'inventory_added',
      category: 'inventory',
      label: batchId,
      value: quantity
    });
  }

  trackDealCompleted(dealId: string, dealValue: number) {
    this.trackEvent({
      action: 'deal_completed',
      category: 'deals',
      label: dealId,
      value: dealValue
    });
  }

  trackUserLogin(userPhone: string, userType: 'buyer' | 'supplier') {
    this.trackEvent({
      action: 'user_login',
      category: 'authentication',
      label: `${userType}_${userPhone}`
    });
  }

  trackUserRegistration(userPhone: string, userType: 'company' | 'individual') {
    this.trackEvent({
      action: 'user_registration',
      category: 'authentication',
      label: `${userType}_${userPhone}`
    });
  }

  trackSearch(searchTerm: string, resultsCount: number) {
    this.trackEvent({
      action: 'search',
      category: 'search',
      label: searchTerm,
      value: resultsCount
    });
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

    if (this.userBehaviorQueue.length >= 10) {
      this.flushBehaviorQueue();
    }
  }

  async flushBehaviorQueue() {
    if (this.userBehaviorQueue.length === 0) return;

    const behaviors = [...this.userBehaviorQueue];
    this.userBehaviorQueue = [];

    try {
      const response = await fetch('/api/track-behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ behaviors })
      });

      if (!response.ok) {
        console.warn('Failed to send behavior tracking data');
      }
    } catch (error) {
      console.warn('Error sending behavior tracking data:', error);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  setUserProperties(properties: Record<string, any>) {
    if (!this.gaInitialized || !window.gtag) return;

    window.gtag('set', 'user_properties', properties);
  }

  trackTiming(category: string, variable: string, time: number, label?: string) {
    if (!this.gaInitialized || !window.gtag) return;

    window.gtag('event', 'timing_complete', {
      name: variable,
      value: time,
      event_category: category,
      event_label: label
    });
  }

  trackException(description: string, fatal: boolean = false) {
    if (!this.gaInitialized || !window.gtag) return;

    window.gtag('event', 'exception', {
      description,
      fatal
    });
  }
}

export const analytics = new Analytics();

export function initializeAnalytics() {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (gaId) {
    analytics.initialize(gaId);
  }
}
