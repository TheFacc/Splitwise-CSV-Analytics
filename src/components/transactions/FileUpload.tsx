import { useState, useCallback, useRef, useMemo } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Alert, Divider } from '@mui/material';
import { Upload, FileSpreadsheet, X, Database } from 'lucide-react';
import { useCsvParser } from '../../hooks/useCsvParser';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';

export const FileUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { parseCsv } = useCsvParser();
  const { isLoading, error, parsedData, clearData, setError, language } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);

  const loadSampleData = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      const response = await fetch('/sample-data.csv');
      if (!response.ok) throw new Error('Failed to load sample data');
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const file = new File([blob], 'sample-data.csv', { type: 'text/csv' });
      await parseCsv(file);
    } catch (err) {
      setError('Failed to load sample data');
    } finally {
      setIsLoadingSample(false);
    }
  }, [parseCsv, setError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.csv')) {
          parseCsv(file);
        } else {
          setError('Please upload a CSV file');
        }
      }
    },
    [parseCsv, setError]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.csv')) {
          parseCsv(file);
        } else {
          setError('Please upload a CSV file');
        }
      }
    },
    [parseCsv, setError]
  );

  const handleClear = useCallback(() => {
    clearData();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [clearData]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // If data is already loaded, show summary
  if (parsedData && !isLoading) {
    return (
      <Paper
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, rgba(72, 190, 157, 0.1) 0%, rgba(72, 190, 157, 0.05) 100%)',
          border: '1px solid',
          borderColor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <FileSpreadsheet size={24} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {parsedData.fileName || t.upload.loaded}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {parsedData.transactions.length} {t.upload.transactionsFound} • {parsedData.members.length} {t.upload.membersFound}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<X size={18} />}
          onClick={handleClear}
          size="small"
        >
          {t.upload.remove}
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <Paper
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        className={`drop-zone ${isDragging ? 'active' : ''}`}
        sx={{
          p: 6,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            transform: 'translateY(-2px)',
          },
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={48} />
            <Typography color="text.secondary">{t.upload.loading}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 3,
                bgcolor: isDragging ? 'primary.light' : 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              <Upload size={36} color={isDragging ? '#ffffff' : '#48be9d'} />
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                {t.upload.dragDrop}
              </Typography>
              <Typography color="text.secondary">
                {t.upload.orClick}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {t.upload.supported}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Load Sample Data section */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Divider sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t.upload.loadSampleHint}
          </Typography>
        </Divider>
        <Button
          variant="outlined"
          color="primary"
          startIcon={isLoadingSample ? <CircularProgress size={18} /> : <Database size={18} />}
          onClick={loadSampleData}
          disabled={isLoading || isLoadingSample}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {t.upload.loadSample}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
