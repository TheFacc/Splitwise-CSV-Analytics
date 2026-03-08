import React from 'react';
import { Box, Paper, Typography, Stack } from '@mui/material';

interface SectionCardProps {
  title: string;
  description?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Reusable card wrapper for Analytics sections.
 * Provides consistent styling with title, optional description, and toolbar slot.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  toolbar,
  children,
}) => {
  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      {/* Header with title and toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
          mb: description ? 1 : 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        {toolbar && (
          <Stack direction="row" spacing={1} alignItems="center">
            {toolbar}
          </Stack>
        )}
      </Box>

      {/* Optional description */}
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          {description}
        </Typography>
      )}

      {/* Content */}
      <Box>{children}</Box>
    </Paper>
  );
};
