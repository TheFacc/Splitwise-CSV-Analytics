import React from 'react';
import { Stack, Chip } from '@mui/material';

interface MemberSelectorProps {
  members: string[];
  selectedMember: string | null;
  onSelect: (member: string) => void;
}

/**
 * Pill-style single-select member selector using Chips.
 */
export const MemberSelector: React.FC<MemberSelectorProps> = ({
  members,
  selectedMember,
  onSelect,
}) => {
  if (members.length === 0) {
    return null;
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      {members.map((member) => (
        <Chip
          key={member}
          label={member}
          onClick={() => onSelect(member)}
          variant={selectedMember === member ? 'filled' : 'outlined'}
          color={selectedMember === member ? 'primary' : 'default'}
          sx={{
            fontWeight: selectedMember === member ? 600 : 400,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          }}
        />
      ))}
    </Stack>
  );
};
