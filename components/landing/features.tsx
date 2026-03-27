import React from "react";
import { features } from "@/constants/data";
import ScrollStack, { ScrollStackItem } from "../ui/ScrollStack";

export default function Features() {
  return (
    <>
      <div id="features" className="bg-background py-10 mt-20">
        <div className="flex flex-col max-w-6xl mx-auto px-4 mb-2">
          <div className="text-5xl md:text-7xl font-bold text-center mb-4">
            Why Choose
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
              LogoAIpro?
            </span>
          </div>
          <p className="text-lg md:text-xl text-center text-muted-foreground max-w-2xl mx-auto">
            Experience the future of logo design with AI-powered creativity
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <ScrollStack
            useWindowScroll={true}
            itemDistance={150}
            itemScale={0.03}
            itemStackDistance={40}
            stackPosition="20%"
            scaleEndPosition="10%"
            baseScale={0.85}
            rotationAmount={2}
            blurAmount={3}
          >
            {features.map((feature, index) => (
              <ScrollStackItem
                key={index}
                itemClassName="bg-background border border-border/60 rounded-3xl overflow-hidden relative group hover:border-accent transition-all"
              >
                <div className="h-full relative flex flex-col md:flex-row items-center p-8 md:p-12 gap-8">
                  {/* Left Side - Content */}
                  <div className="flex-1 z-20">
                    <div className="text-sm md:text-base font-semibold text-primary mb-2 uppercase tracking-wider">
                      {feature.smallHeading}
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-base md:text-lg text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Right Side - Image */}
                  <div className="flex-shrink-0 w-full md:w-80 h-64 md:h-80 rounded-2xl overflow-hidden relative z-20">
                    <img
                      src={feature.imageUrl}
                      alt={feature.title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                      onError={(e) => {
                        // Fallback if image doesn't exist
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </div>
      </div>
    </>
  );
}
