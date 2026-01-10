# New Stream Logistics - Trust-First Drayage Website V1

Trust-First Drayage Website (Foundational Version) built with Next.js 16, React 19, Tailwind CSS 4, and shadcn UI.

## Overview

This is a V1 website for New Stream Logistics, a drayage company serving LA/LB ports. The site focuses on building trust through clear communication, transparency, and straightforward processes—no flashy promises, just solid operations.

## Features

- **Hero Section** with clear value proposition and CTAs
- **Quote Request Form** - Simple form that sends emails via Resend API
- **Container Tracking** - Placeholder tracking page (V1)
- **Services Page** - Detailed information about Import Drayage, Pre-Pull, Local Delivery, and Problem Containers
- **Process Page** - Transparent explanation of how we work
- **Compliance Page** - Insurance, UIIA, ports, and safety information
- **About Page** - Company mission and values
- **Contact Page** - Contact form and company information

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **React**: 19.2.3
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Email**: Resend
- **Language**: TypeScript
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 20+ 
- pnpm (recommended) or npm/yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/abakymuk/nsl.git
cd nsl
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
RESEND_API_KEY=re_your_api_key_here
EMAIL_TO=dispatcher@newstreamlogistics.com
EMAIL_FROM=quotes@newstreamlogistics.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Get your Resend API key from [https://resend.com/api-keys](https://resend.com/api-keys)

4. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
app/
├── layout.tsx          # Root layout with navigation and footer
├── page.tsx            # Home page
├── quote/              # Quote request page and form
├── track/              # Container tracking page (V1 placeholder)
├── services/           # Services listing page
├── process/            # Our process explanation
├── compliance/         # Compliance and insurance information
├── about/              # About us page
├── contact/            # Contact form and information
└── api/                # API routes
    ├── quote/          # Quote form submission handler
    └── contact/        # Contact form submission handler

components/
├── ui/                 # shadcn UI components
├── nav.tsx             # Navigation component
└── footer.tsx          # Footer component

lib/
└── utils.ts            # Utility functions

types/
└── index.ts            # TypeScript type definitions
```

## Key Principles (V1)

- **Trust-First**: Build confidence through transparency and honesty
- **No False Promises**: Better an honest quote in 1-2 hours than a fake instant quote
- **Process Over Promises**: Show systems, not chaos
- **Minimal but Effective**: Focus on what matters, remove distractions

## License

Private project - All rights reserved
