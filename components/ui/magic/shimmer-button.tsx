"use client";

import React, { type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.1em",
      shimmerDuration = "2s",
      borderRadius = "100px",
      background = "oklch(0.45 0.15 240)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        style={
          {
            "--shimmer-color": shimmerColor,
            "--shimmer-size": shimmerSize,
            "--shimmer-duration": shimmerDuration,
            "--border-radius": borderRadius,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--border-radius)]",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          className
        )}
        {...props}
      >
        {/* Shimmer effect */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden [border-radius:var(--border-radius)]",
            "before:absolute before:inset-[-200%] before:animate-[shimmer_var(--shimmer-duration)_infinite_linear]",
            "before:bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--shimmer-color)_360deg)]",
            "before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-500"
          )}
        />

        {/* Inner background */}
        <div
          className={cn(
            "absolute inset-px z-[-1] [background:var(--bg)] [border-radius:calc(var(--border-radius)-1px)]"
          )}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2 font-semibold">
          {children}
        </span>
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";
