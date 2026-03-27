import React from "react";

export default function LogoShowcase() {
  return (
    <div className="bg-background py-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-8">
          <p className="text-sm md:text-base text-muted-foreground mb-2">
            No design skills required
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Easy to use, beautiful results.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Powered by AI, LogoAIpro helps business owners create beautiful logos.
          </p>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-8"></div>
        </div>
      </div>

      {/* Full Width Image */}
      <div className="w-full">
        <img
          src="/Group 1597883118 (1).png"
          alt="Logo showcase"
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>
    </div>
  );
}
