"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import './PillNav.css';

export interface LogoPillProps {
  logoText: string;
  href?: string;
  baseColor?: string;
  pillColor?: string;
  pillTextColor?: string;
  ease?: string;
}

const LogoPill: React.FC<LogoPillProps> = ({
  logoText,
  href = '/',
  baseColor = 'hsl(var(--background))',
  pillColor = 'hsl(var(--primary))',
  pillTextColor = 'hsl(var(--foreground))',
  ease = 'power2.easeOut'
}) => {
  const logoRef = useRef<HTMLAnchorElement | null>(null);
  const logoImgRef = useRef<HTMLSpanElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const logo = logoRef.current;
    if (logo) {
      gsap.set(logo, { scale: 0 });
      gsap.to(logo, {
        scale: 1,
        duration: 0.6,
        ease
      });
    }
  }, [ease]);

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;

    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.2,
      ease,
      overwrite: 'auto'
    });
  };

  const cssVars = {
    ['--base']: baseColor,
    ['--pill-bg']: pillColor,
    ['--pill-text']: pillTextColor
  } as React.CSSProperties;

  return (
    <Link
      className="pill-logo"
      href={href}
      aria-label="Home"
      onMouseEnter={handleLogoEnter}
      ref={logoRef}
      style={cssVars}
    >
      <span className="pill-logo-text" ref={logoImgRef}>
        {logoText}
      </span>
    </Link>
  );
};

export default LogoPill;

