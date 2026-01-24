"use client";

import mixpanel from "mixpanel-browser";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function track(event: string, properties?: Record<string, unknown>) {
  try {
    if (IS_PRODUCTION) {
      mixpanel.track(event, properties);
    } else {
      console.log(`[Mixpanel] ${event}:`, properties);
    }
  } catch {
    // Mixpanel not initialized yet
  }
}

/**
 * Mixpanel event tracking helpers
 * Comprehensive analytics for conversion funnel and user behavior
 */
export const MixpanelEvents = {
  // Quote flow events - conversion funnel tracking
  quoteView: () => {
    track("quote_view", { funnel_step: "view" });
  },

  quoteStarted: () => {
    track("quote_started", { funnel_step: "started" });
  },

  quoteStep1Complete: (data: {
    requestType: string;
    port: string;
    timeSensitive: boolean;
  }) => {
    track("quote_step1_complete", {
      request_type: data.requestType,
      port: data.port,
      time_sensitive: data.timeSensitive,
    });
  },

  quoteStep2Complete: (data: {
    hasContainer: boolean;
    hasTerminal: boolean;
    hasLfd: boolean;
  }) => {
    track("quote_step2_complete", {
      has_container: data.hasContainer,
      has_terminal: data.hasTerminal,
      has_lfd: data.hasLfd,
    });
  },

  quoteStepCompleted: (step: number) => {
    track("quote_step_completed", { step });
  },

  quoteSubmitted: (data: {
    container: string;
    terminal: string;
    zip: string;
    containerType: string;
  }) => {
    track("quote_submitted", {
      container_number: data.container,
      terminal: data.terminal,
      zip_code: data.zip,
      container_type: data.containerType,
    });
  },

  quoteSubmitSuccess: (data: {
    referenceNumber: string | null;
    requestType: string;
    isUrgent: boolean;
    leadScore: number;
  }) => {
    track("quote_submit_success", {
      reference_number: data.referenceNumber,
      request_type: data.requestType,
      is_urgent: data.isUrgent,
      lead_score: data.leadScore,
    });
  },

  quoteSubmitError: (error: string) => {
    track("quote_submit_error", { error });
  },

  quoteAccepted: (data: { quoteId: string; amount: number }) => {
    track("quote_accepted", {
      quote_id: data.quoteId,
      amount: data.amount,
    });
  },

  quoteDeclined: (data: { quoteId: string; reason?: string }) => {
    track("quote_declined", {
      quote_id: data.quoteId,
      reason: data.reason,
    });
  },

  // Price estimator events
  priceEstimateViewed: (city: string, price: number) => {
    track("price_estimate_viewed", { city, price });
  },

  // Track page events
  trackSearched: (containerNumber: string) => {
    track("track_searched", { container_number: containerNumber });
  },

  trackResultViewed: (status: string, type: "load" | "quote") => {
    track("track_result_viewed", { status, type });
  },

  trackNotFound: (containerNumber: string) => {
    track("track_not_found", { container_number: containerNumber });
  },

  // Dashboard events
  dashboardViewed: (section: string) => {
    track("dashboard_viewed", { section });
  },

  dashboardQuotesViewed: (quoteCount: number) => {
    track("dashboard_quotes_viewed", { quote_count: quoteCount });
  },

  quoteDiscussionStarted: (referenceNumber: string) => {
    track("quote_discussion_started", { reference_number: referenceNumber });
  },

  // Auth events
  signUp: (method: string = "email") => {
    track("sign_up", { method });
  },

  login: (method: string = "email") => {
    track("login", { method });
  },

  logout: () => {
    track("logout");
  },

  // Contact form events
  contactFormViewed: () => {
    track("contact_form_viewed");
  },

  contactFormSubmitted: (data: { hasPhone: boolean }) => {
    track("contact_form_submitted", { has_phone: data.hasPhone });
  },

  contactFormError: (error: string) => {
    track("contact_form_error", { error });
  },

  // CTA / Button click events
  ctaClicked: (data: {
    ctaName: string;
    ctaLocation: string;
    ctaText?: string;
  }) => {
    track("cta_clicked", {
      cta_name: data.ctaName,
      cta_location: data.ctaLocation,
      cta_text: data.ctaText,
    });
  },

  // Navigation events
  navigationClicked: (data: { linkName: string; destination: string }) => {
    track("navigation_clicked", {
      link_name: data.linkName,
      destination: data.destination,
    });
  },

  // Phone call events
  phoneCallClicked: (location: string) => {
    track("phone_call_clicked", { location });
  },

  // External link events
  externalLinkClicked: (data: { url: string; location: string }) => {
    track("external_link_clicked", {
      url: data.url,
      location: data.location,
    });
  },

  // Error events
  errorOccurred: (data: { errorType: string; errorMessage: string; location: string }) => {
    track("error_occurred", {
      error_type: data.errorType,
      error_message: data.errorMessage,
      location: data.location,
    });
  },

  // Feature engagement
  featureUsed: (data: { featureName: string; context?: string }) => {
    track("feature_used", {
      feature_name: data.featureName,
      context: data.context,
    });
  },
};
