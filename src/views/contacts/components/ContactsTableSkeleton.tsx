import React from 'react';

import Skeleton from '@mui/material/Skeleton';

export const ContactsTableSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-[#E6E4F0]">
        <Skeleton variant="text" width={180} height={32} />
        <Skeleton variant="rounded" width={140} height={38} sx={{ borderRadius: '9999px' }} />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-[#F4F3F8]">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="space-y-1">
              <Skeleton variant="text" width={160} height={20} />
              <Skeleton variant="text" width={110} height={16} />
            </div>
          </div>
          <Skeleton variant="text" width={100} height={20} />
          <Skeleton variant="text" width={130} height={20} />
          <Skeleton variant="rounded" width={90} height={26} sx={{ borderRadius: '9999px' }} />
          <Skeleton variant="circular" width={32} height={32} />
        </div>
      ))}
    </div>
  );
};
