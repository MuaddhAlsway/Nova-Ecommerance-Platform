import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { type ReactNode } from "react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

export function StripeProvider({ children, clientSecret }: { children: ReactNode; clientSecret?: string }) {
  if (!clientSecret) return <>{children}</>;
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#ffffff",
            colorBackground: "#0d0d0d",
            colorText: "rgba(255,255,255,0.8)",
            colorTextSecondary: "rgba(255,255,255,0.4)",
            colorTextPlaceholder: "rgba(255,255,255,0.2)",
            fontFamily: "system-ui, sans-serif",
            borderRadius: "12px",
            spacingUnit: "4px",
            spacingGridRowGap: "16px",
          },
          rules: {
            ".Input": {
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.05)",
            },
            ".Input:focus": {
              border: "1px solid rgba(255,255,255,0.2)",
            },
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}
