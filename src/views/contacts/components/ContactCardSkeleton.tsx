import React from 'react';

import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';

export const ContactCardSkeleton: React.FC = () => {
  return (
    <div className="p-3 space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card
          key={i}
          sx={{
            p: 2,
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="space-y-1">
              <Skeleton variant="text" width={150} height={24} />
              <Skeleton variant="text" width={100} height={18} />
            </div>
            <Skeleton variant="circular" width={28} height={28} />
          </div>
          <div className="space-y-2 mt-3">
            <Skeleton variant="text" width={120} height={18} />
            <Skeleton variant="text" width={160} height={18} />
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: '9999px' }} />
          </div>
        </Card>
      ))}
    </div>
  );
};
