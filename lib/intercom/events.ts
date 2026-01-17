"use client";

import { trackEvent } from "@intercom/messenger-js-sdk";

/**
 * Intercom event tracking helpers
 * Use these to track customer journey events
 */
export const IntercomEvents = {
  // Quote flow events - conversion funnel tracking
  quoteView: () => {
    try {
      trackEvent("quote_view");
    } catch {
      // Intercom not loaded yet
    }
  },

  quoteStarted: () => {
    try {
      trackEvent("quote_form_started");
    } catch {
      // Intercom not loaded yet
    }
  },

  quoteStep1Complete: (data: {
    requestType: string;
    port: string;
    timeSensitive: boolean;
  }) => {
    try {
      trackEvent("quote_step1_complete", data);
    } catch {
      // Intercom not loaded yet
    }
  },

  quoteStep2Complete: (data: {
    hasContainer: boolean;
    hasTerminal: boolean;
    hasLfd: boolean;
  }) => {
    try {
      trackEvent("quote_step2_complete", data);
    } catch {
      // Intercom not loaded yet
    }
  },

  quoteStepCompleted: (step: number) => {
    try {
      trackEvent("quote_step_completed", { step });
    } catch {
      // Intercom not loaded yet
    }
  },

  quoteSubmitted: (data: {
    container: string;
    terminal: string;
    zip: string;
    containerType: string;
  }) => {
    try {
      trackEvent("quote_submitted", data);
    } catch {
      // Intercom not loaded yet
    }
  },

  quoteSubmitSuccess: (data: {
    referenceNumber: string | null;
    requestType: string;
    isUrgent: boolean;
    leadScore: number;
  }) => {
    try {
      trackEvent("quote_submit_success", data);
    } catch {
      // Intercom not loaded yet
    }
  },

  quoteSubmitError: (error: string) => {
    try {
      trackEvent("quote_submit_error", { error });
    } catch {
      // Intercom not loaded yet
    }
  },

  // Price estimator events
  priceEstimateViewed: (city: string, price: number) => {
    try {
      trackEvent("price_estimate_viewed", { city, price });
    } catch {
      // Intercom not loaded yet
    }
  },

  // Track page events
  trackSearched: (containerNumber: string) => {
    try {
      trackEvent("track_searched", { container_number: containerNumber });
    } catch {
      // Intercom not loaded yet
    }
  },

  trackResultViewed: (status: string, type: "load" | "quote") => {
    try {
      trackEvent("track_result_viewed", { status, type });
    } catch {
      // Intercom not loaded yet
    }
  },

  trackNotFound: (containerNumber: string) => {
    try {
      trackEvent("track_not_found", { container_number: containerNumber });
    } catch {
      // Intercom not loaded yet
    }
  },

  // Dashboard events
  dashboardQuotesViewed: (quoteCount: number) => {
    try {
      trackEvent("dashboard_quotes_viewed", { quote_count: quoteCount });
    } catch {
      // Intercom not loaded yet
    }
  },

  quoteDiscussionStarted: (referenceNumber: string) => {
    try {
      trackEvent("quote_discussion_started", { reference_number: referenceNumber });
    } catch {
      // Intercom not loaded yet
    }
  },
};
