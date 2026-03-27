"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCredits, createStripeCheckoutSession } from "@/app/actions/actions";
import { useToast } from "@/hooks/use-toast";
import {
  IconCreditCard,
  IconSparkles,
  IconCheck,
  IconX,
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
      // Handle error without exposing internal details
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
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Credits & Plans
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Purchase credits to create amazing logos
        </p>
      </div>

      {/* Current Credits */}
      <Card className="border border-border/50 bg-card hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <IconSparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Current Credits</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {credits.remaining} Credits
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {credits.remaining > 3 ? (
                <>
                  <IconCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span className="text-xs sm:text-sm text-green-600 font-medium">Good</span>
                </>
              ) : credits.remaining > 0 ? (
                <>
                  <IconX className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  <span className="text-xs sm:text-sm text-orange-600 font-medium">Low</span>
                </>
              ) : (
                <>
                  <IconX className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  <span className="text-xs sm:text-sm text-red-600 font-medium">Empty</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Plans */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-4">Choose a Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creditPlans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular
                ? "border-primary border-2 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                : "border border-border/50 hover:shadow-xl transition-all duration-300"
              }
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-medium py-1 text-center">
                  Most Popular
                </div>
              )}
              <CardContent className={`p-4 sm:p-6 ${plan.popular ? "pt-8 sm:pt-10" : ""}`}>
                <div className="mb-4">
                  <h3 className="text-lg sm:text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold">{plan.price}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">one-time</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <IconCreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="text-base sm:text-lg font-semibold">
                      {plan.credits} Credits
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                        <IconCheck className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  className={plan.popular
                    ? "w-full bg-primary hover:bg-primary/90 text-sm"
                    : "w-full text-sm"
                  }
                  variant={plan.popular ? "default" : "outline"}
                  size="default"
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

