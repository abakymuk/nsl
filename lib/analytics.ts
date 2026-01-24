"use client";

/**
 * Unified Analytics Layer
 * Sends events to both Mixpanel and Intercom
 */

import { MixpanelEvents } from "./mixpanel";
import { IntercomEvents } from "./intercom";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Track an event to all analytics providers
 */
export const Analytics = {
  // Quote funnel
  quoteView: () => {
    MixpanelEvents.quoteView();
    IntercomEvents.quoteView();
  },

  quoteStarted: () => {
    MixpanelEvents.quoteStarted();
    IntercomEvents.quoteStarted();
  },

  quoteStep1Complete: (data: {
    requestType: string;
    port: string;
    timeSensitive: boolean;
  }) => {
    MixpanelEvents.quoteStep1Complete(data);
    IntercomEvents.quoteStep1Complete(data);
  },

  quoteStep2Complete: (data: {
    hasContainer: boolean;
    hasTerminal: boolean;
    hasLfd: boolean;
  }) => {
    MixpanelEvents.quoteStep2Complete(data);
    IntercomEvents.quoteStep2Complete(data);
  },

  quoteStepCompleted: (step: number) => {
    MixpanelEvents.quoteStepCompleted(step);
    IntercomEvents.quoteStepCompleted(step);
  },

  quoteSubmitted: (data: {
    container: string;
    terminal: string;
    zip: string;
    containerType: string;
  }) => {
    MixpanelEvents.quoteSubmitted(data);
    IntercomEvents.quoteSubmitted(data);
  },

  quoteSubmitSuccess: (data: {
    referenceNumber: string | null;
    requestType: string;
    isUrgent: boolean;
    leadScore: number;
  }) => {
    MixpanelEvents.quoteSubmitSuccess(data);
    IntercomEvents.quoteSubmitSuccess(data);
  },

  quoteSubmitError: (error: string) => {
    MixpanelEvents.quoteSubmitError(error);
    IntercomEvents.quoteSubmitError(error);
  },

  quoteAccepted: (data: { quoteId: string; amount: number }) => {
    MixpanelEvents.quoteAccepted(data);
    // Intercom doesn't have this event
  },

  quoteDeclined: (data: { quoteId: string; reason?: string }) => {
    MixpanelEvents.quoteDeclined(data);
    // Intercom doesn't have this event
  },

  // Price estimator
  priceEstimateViewed: (city: string, price: number) => {
    MixpanelEvents.priceEstimateViewed(city, price);
    IntercomEvents.priceEstimateViewed(city, price);
  },

  // Tracking
  trackSearched: (containerNumber: string) => {
    MixpanelEvents.trackSearched(containerNumber);
    IntercomEvents.trackSearched(containerNumber);
  },

  trackResultViewed: (status: string, type: "load" | "quote") => {
    MixpanelEvents.trackResultViewed(status, type);
    IntercomEvents.trackResultViewed(status, type);
  },

  trackNotFound: (containerNumber: string) => {
    MixpanelEvents.trackNotFound(containerNumber);
    IntercomEvents.trackNotFound(containerNumber);
  },

  // Dashboard
  dashboardViewed: (section: string) => {
    MixpanelEvents.dashboardViewed(section);
    // Intercom doesn't have this event
  },

  dashboardQuotesViewed: (quoteCount: number) => {
    MixpanelEvents.dashboardQuotesViewed(quoteCount);
    IntercomEvents.dashboardQuotesViewed(quoteCount);
  },

  quoteDiscussionStarted: (referenceNumber: string) => {
    MixpanelEvents.quoteDiscussionStarted(referenceNumber);
    IntercomEvents.quoteDiscussionStarted(referenceNumber);
  },

  // Auth
  signUp: (method: string = "email") => {
    MixpanelEvents.signUp(method);
  },

  login: (method: string = "email") => {
    MixpanelEvents.login(method);
  },

  logout: () => {
    MixpanelEvents.logout();
  },

  // Contact form
  contactFormViewed: () => {
    MixpanelEvents.contactFormViewed();
  },

  contactFormSubmitted: (data: { hasPhone: boolean }) => {
    MixpanelEvents.contactFormSubmitted(data);
  },

  contactFormError: (error: string) => {
    MixpanelEvents.contactFormError(error);
  },

  // CTA tracking
  ctaClicked: (data: {
    ctaName: string;
    ctaLocation: string;
    ctaText?: string;
  }) => {
    MixpanelEvents.ctaClicked(data);
  },

  // Navigation
  navigationClicked: (data: { linkName: string; destination: string }) => {
    MixpanelEvents.navigationClicked(data);
  },

  // Phone calls
  phoneCallClicked: (location: string) => {
    MixpanelEvents.phoneCallClicked(location);
  },

  // External links
  externalLinkClicked: (data: { url: string; location: string }) => {
    MixpanelEvents.externalLinkClicked(data);
  },

  // Errors
  errorOccurred: (data: { errorType: string; errorMessage: string; location: string }) => {
    MixpanelEvents.errorOccurred(data);
  },

  // Feature engagement
  featureUsed: (data: { featureName: string; context?: string }) => {
    MixpanelEvents.featureUsed(data);
  },
};

/**
 * Log analytics event in development
 */
export function logAnalyticsEvent(event: string, properties?: Record<string, unknown>) {
  if (!IS_PRODUCTION) {
    console.log(`[Analytics] ${event}:`, properties);
  }
}
