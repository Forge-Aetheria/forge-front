import React from 'react';

import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

interface Props {
  message: string;
  onRetry: () => void;
}

export const ContactsErrorFallback: React.FC<Props> = ({ message, onRetry }) => {
  return (
    <Card
      sx={{
        p: 4,
        textAlign: 'center',
        borderRadius: '20px',
        border: '1px solid #E6E4F0',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
      }}
    >
      <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center bg-[#FEE2E2]">
        <i className="tabler-alert-triangle text-2xl text-[#EF4444]" />
      </div>
      <Typography variant="h6" sx={{ color: '#1E1B2E', fontWeight: 600, mb: 1 }}>
        No se pudo cargar la lista de contactos
      </Typography>
      <Typography variant="body2" sx={{ color: '#6B7280', mb: 3, maxWidth: 400, mx: 'auto' }}>
        {message || 'Ocurrió una interrupción temporal de comunicación con el servidor.'}
      </Typography>
      <Button
        variant="contained"
        onClick={onRetry}
        startIcon={<i className="tabler-refresh" />}
        sx={{
          borderRadius: '9999px',
          backgroundColor: '#6C5CE7',
          px: 3,
          '&:hover': { backgroundColor: '#5A4AD1' }
        }}
      >
        Reintentar cargar
      </Button>
    </Card>
  );
};
