import type { Metadata } from "next";
import TrackForm from "./track-form";

export const metadata: Metadata = {
  title: "Track a Container | New Stream Logistics",
  description:
    "Track your container status in real-time. Enter container number to check current status and location.",
  openGraph: {
    title: "Track a Container | New Stream Logistics",
    description:
      "Track your container status in real-time. Enter container number to check current status and location.",
    type: "website",
  },
};

export default function TrackPage() {
  return <TrackForm />;
}
