'use client';

import { useState } from 'react';
import Image from 'next/image';

export const Logo = ({ className }: { className?: string }) => {
  const [imageError, setImageError] = useState(false);
  
  // Logo should be placed in /public/logo.png
  // In Next.js, files in public folder are served from root
  const logoPath = '/logo.png';
  
  if (imageError) {
    // Fallback: Show "PV" text if logo doesn't exist
    return (
      <div className={`${className || 'h-10'} flex items-center justify-center font-bold text-ink text-xl`}>
        PV
      </div>
    );
  }
  
  return (
    <div className={className || 'h-10 w-auto relative'}>
      <Image
        src={logoPath}
        alt="PropVestor"
        width={120}
        height={40}
        className="h-full w-auto object-contain"
        priority
        onError={() => {
          console.error('Logo image failed to load:', logoPath);
          setImageError(true);
        }}
      />
    </div>
  );
};

