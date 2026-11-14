'use client';

import React from 'react';

import type { TerceroEntity } from '@/types/contactsTypes';
import { ContactCard } from './ContactCard';

interface Props {
  terceros: TerceroEntity[];
  onView?: (t: TerceroEntity) => void;
  onEdit?: (t: TerceroEntity) => void;
  onDeactivate: (id: string) => void;
  readOnly?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onOpenContacts?: (target: HTMLElement, company: TerceroEntity) => void;
}

export const ContactsMobileList: React.FC<Props> = ({
  terceros,
  onView,
  onEdit,
  onDeactivate,
  readOnly,
  selectedIds = [],
  onToggleSelect,
  onOpenContacts
}) => {
  return (
    <div className="space-y-3 p-3">
      {terceros.map(t => (
        <ContactCard
          key={t.id}
          tercero={t}
          onView={onView}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          readOnly={readOnly}
          selected={selectedIds.includes(t.id)}
          onToggleSelect={onToggleSelect}
          onOpenContacts={onOpenContacts}
        />
      ))}
    </div>
  );
};
