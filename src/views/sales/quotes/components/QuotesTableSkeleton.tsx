'use client';

import React from 'react';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

export const QuotesTableSkeleton: React.FC = () => {
  return (
    <TableContainer
      sx={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E6E4F0',
        boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
        overflow: 'hidden'
      }}
    >
      <Table sx={{ minWidth: 800 }}>
        <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
          <TableRow>
            <TableCell sx={{ py: 1.8 }}><Skeleton width={80} height={20} /></TableCell>
            <TableCell sx={{ py: 1.8 }}><Skeleton width={160} height={20} /></TableCell>
            <TableCell sx={{ py: 1.8 }}><Skeleton width={80} height={20} /></TableCell>
            <TableCell sx={{ py: 1.8 }}><Skeleton width={80} height={20} /></TableCell>
            <TableCell align="right" sx={{ py: 1.8 }}><Skeleton width={90} height={20} className="ml-auto" /></TableCell>
            <TableCell align="right" sx={{ py: 1.8 }}><Skeleton width={100} height={20} className="ml-auto" /></TableCell>
            <TableCell align="center" sx={{ py: 1.8 }}><Skeleton width={70} height={20} className="mx-auto" /></TableCell>
            <TableCell align="center" sx={{ py: 1.8 }}><Skeleton width={60} height={20} className="mx-auto" /></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[1, 2, 3, 4, 5].map(i => (
            <TableRow key={i} sx={{ height: '64px' }}>
              <TableCell><Skeleton width={90} height={22} /></TableCell>
              <TableCell>
                <Skeleton width={180} height={20} />
                <Skeleton width={110} height={16} />
              </TableCell>
              <TableCell><Skeleton width={75} height={18} /></TableCell>
              <TableCell><Skeleton width={75} height={18} /></TableCell>
              <TableCell align="right"><Skeleton width={80} height={20} className="ml-auto" /></TableCell>
              <TableCell align="right"><Skeleton width={95} height={18} className="ml-auto" /></TableCell>
              <TableCell align="center"><Skeleton width={80} height={28} sx={{ borderRadius: '9999px' }} className="mx-auto" /></TableCell>
              <TableCell align="center"><Skeleton width={64} height={32} sx={{ borderRadius: '9999px' }} className="mx-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
