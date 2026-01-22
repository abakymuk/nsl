export interface Testimonial {
  quote: string;
  author: string;
  title: string;
  company: string;
  rating: number;
}

export const testimonials: Testimonial[] = [
  {
    quote: "Finally, a drayage company that answers the phone and actually does what they say.",
    author: "James Chen",
    title: "Operations Manager",
    company: "Pacific Freight Solutions",
    rating: 5,
  },
  {
    quote: "They saved us from $2,000 in demurrage by pre-pulling before the LFD. Great communication.",
    author: "Maria Rodriguez",
    title: "Logistics Coordinator",
    company: "West Coast Imports",
    rating: 5,
  },
  {
    quote: "No BS. They told us upfront they couldn't make our timeline and suggested alternatives. Refreshing honesty.",
    author: "Robert Kim",
    title: "Supply Chain Director",
    company: "Golden State Trading",
    rating: 5,
  },
  {
    quote: "We've tried 5 drayage companies in LA. New Stream is the only one that consistently delivers on promises.",
    author: "Sarah Thompson",
    title: "Warehouse Manager",
    company: "Inland Distribution Co.",
    rating: 5,
  },
  {
    quote: "Their dispatcher remembered our delivery requirements from last month. That's rare in this industry.",
    author: "David Park",
    title: "Import Specialist",
    company: "Harbor Logistics Group",
    rating: 5,
  },
  {
    quote: "Container was on hold for customs. They worked with the terminal and got it released same day.",
    author: "Lisa Nakamura",
    title: "Operations Lead",
    company: "Transpacific Cargo",
    rating: 5,
  },
  {
    quote: "Instant updates at every stage, complete transparency on charges, no hidden costs. New Stream truly stands out as a reliable logistics partner.",
    author: "Göksu Songur",
    title: "Operations Manager",
    company: "LEX Logistics Inc",
    rating: 5,
  },
];

// Featured testimonial for quote page
export const featuredTestimonial = testimonials[1]; // Maria's demurrage saving story
