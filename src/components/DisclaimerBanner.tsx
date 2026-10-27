import React from 'react';
import { Info } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <aside 
      aria-label="Legal disclaimer"
      className="w-full bg-amber-50/80 border-b border-amber-200/70 px-4 py-2 text-xs sm:text-sm text-amber-900 flex items-center justify-center gap-2"
    >
      <Info className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
      <span className="text-center font-medium">
        NyayaPacket AI helps you organize your case. It is not legal advice. A lawyer will review your packet.
      </span>
    </aside>
  );
};
