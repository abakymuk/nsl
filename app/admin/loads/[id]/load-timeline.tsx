"use client";

import { MapPin, Clock } from "lucide-react";

interface Event {
  id: string;
  status: string;
  description: string;
  location?: string;
  created_at: string;
}

interface LoadTimelineProps {
  events: Event[];
}

export function LoadTimeline({ events }: LoadTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No tracking events yet</p>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full ${
                index === 0 ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
            {index < events.length - 1 && (
              <div className="w-0.5 flex-1 bg-muted-foreground/20 my-1" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <p className={`font-medium text-sm ${index === 0 ? "" : "text-muted-foreground"}`}>
              {event.description}
            </p>
            <div className="flex items-center gap-4 mt-1">
              {event.location && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {event.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(event.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
