"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCredits, createStripeCheckoutSession } from "@/app/actions/actions";
import { useToast } from "@/hooks/use-toast";
import {
  IconCreditCard,
  IconSparkles,
  IconCheck,
  IconLoader2,
} from "@tabler/icons-react";

export default function CreditsPage() {
  const { toast } = useToast();
  const [credits, setCredits] = useState({ remaining: 10, limit: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredits = async () => {
      const result = await getCredits();
      setCredits(result);
      setIsLoading(false);
    };
    fetchCredits();
  }, []);

  const handlePurchase = async (planId: string) => {
    setProcessingPlan(planId);
    try {
      const result = await createStripeCheckoutSession(planId);

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create checkout session",
          variant: "destructive",
        });
        setProcessingPlan(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setProcessingPlan(null);
    }
  };

  const creditPlans = [
    {
      id: "basic",
      name: "Basic",
      credits: 50,
      price: "$9.99",
      features: [
        "50 AI logo generations",
        "HD quality outputs",
        "All style options",
        "Commercial license",
      ],
      popular: false,
    },
    {
      id: "pro",
      name: "Pro",
      credits: 150,
      price: "$24.99",
      features: [
        "150 AI logo generations",
        "HD quality outputs",
        "All style options",
        "Commercial license",
        "Priority support",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      credits: 500,
      price: "$79.99",
      features: [
        "500 AI logo generations",
        "HD quality outputs",
        "All style options",
        "Commercial license",
        "Priority support",
        "Custom branding",
      ],
      popular: false,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Credits & Plans
        </h1>
        <p className="text-muted-foreground mt-1">
          Purchase credits to create amazing logos
        </p>
      </div>

      {/* Current Credits */}
      <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <IconSparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Credits</p>
              <p className="text-2xl font-bold">{credits.remaining} Credits</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              credits.remaining > 3 ? "bg-emerald-500" : credits.remaining > 0 ? "bg-amber-500" : "bg-red-500"
            }`} />
            <span className={`text-sm font-medium ${
              credits.remaining > 3 ? "text-emerald-600" : credits.remaining > 0 ? "text-amber-600" : "text-red-600"
            }`}>
              {credits.remaining > 3 ? "Good" : credits.remaining > 0 ? "Low" : "Empty"}
            </span>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Choose a Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creditPlans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 relative ${
                plan.popular
                  ? "border-foreground"
                  : "border-border/60"
              } bg-card hover:shadow-md transition-shadow`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-foreground text-background text-xs font-medium rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">one-time</span>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <IconCreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-semibold">
                    {plan.credits} Credits
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm">
                      <IconCheck className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className={`w-full ${
                  plan.popular
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : ""
                }`}
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handlePurchase(plan.id)}
                disabled={processingPlan === plan.id}
              >
                {processingPlan === plan.id ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
