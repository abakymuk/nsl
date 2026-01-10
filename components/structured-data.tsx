export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://newstreamlogistics.com",
    name: "New Stream Logistics",
    description:
      "Reliable LA/LB Drayage — Without Guesswork. Clear pricing. Real tracking. Straightforward communication.",
    url: "https://newstreamlogistics.com",
    telephone: "+1-310-555-1234",
    email: "info@newstreamlogistics.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Los Angeles",
      addressRegion: "CA",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 33.7701,
      longitude: -118.1937,
    },
    areaServed: [
      {
        "@type": "City",
        name: "Los Angeles",
      },
      {
        "@type": "City",
        name: "Long Beach",
      },
      {
        "@type": "State",
        name: "California",
      },
    ],
    priceRange: "$$",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "06:00",
        closes: "18:00",
      },
    ],
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ServiceSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Container Drayage",
    provider: {
      "@type": "LocalBusiness",
      name: "New Stream Logistics",
    },
    areaServed: {
      "@type": "State",
      name: "California",
    },
    description:
      "Professional container drayage services from Los Angeles and Long Beach ports. Standard delivery, expedited service, pre-pull options, and transloading available.",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Drayage Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Standard Drayage",
            description: "Reliable container pickup and delivery from LA/LB ports",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Expedited Drayage",
            description: "Priority pickup for urgent containers",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Pre-Pull Service",
            description: "Extract containers before LFD to avoid demurrage",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Transloading",
            description: "Container to truck/warehouse transfer services",
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How quickly can I get a quote for drayage services?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We provide honest quotes within 1-2 hours. We believe it's better to give you an accurate quote than an instant fake one.",
        },
      },
      {
        "@type": "Question",
        name: "Which terminals do you service?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We service all major LA/LB terminals including APM, Fenix Marine Services, TraPac, Yusen, LBCT, TTI, Everport, PCT, WBCT, and LACT.",
        },
      },
      {
        "@type": "Question",
        name: "Do you offer expedited container pickup?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, we offer expedited pickup services for urgent containers with approaching Last Free Days (LFD) to help you avoid demurrage charges.",
        },
      },
      {
        "@type": "Question",
        name: "Are you licensed and insured?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, we are fully licensed with USDOT, MC authority, and carry comprehensive cargo insurance. We are compliant with all federal and state regulations.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
