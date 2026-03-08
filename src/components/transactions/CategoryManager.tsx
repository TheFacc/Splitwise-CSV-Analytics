import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  TextField,
  Button,
  Tooltip,
  useTheme,
  useMediaQuery,
  InputAdornment,
  Badge,
  alpha,
} from '@mui/material';
import {
  Plus,
  Trash2,
  X,
  GripVertical,
  RotateCcw,
  Search,
  Pencil,
  FolderOpen,
  Tag,
} from 'lucide-react';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import type { CategoryGroup } from '../../types';

export const CategoryManager = () => {
  const {
    parsedData,
    language,
    categoryGroups,
    categoryRenames,
    setCategoryGroups,
    setCategoryRenames,
    clearCategoryMappings,
  } = useStore();

  const t = useMemo(() => getTranslation(language), [language]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Local state
  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRename, setEditingRename] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editingGroupNameValue, setEditingGroupNameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Get original categories from parsed data
  const originalCategories = useMemo(() => {
    if (!parsedData) return [];
    const catCounts = new Map<string, number>();
    parsedData.transactions.forEach(tx => {
      if (!tx.isTransfer) {
        catCounts.set(tx.category, (catCounts.get(tx.category) || 0) + 1);
      }
    });
    return Array.from(catCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [parsedData]);

  // Categories that are already assigned to a group
  const assignedCategories = useMemo(() => {
    const assigned = new Set<string>();
    categoryGroups.forEach(g => g.children.forEach(c => assigned.add(c)));
    return assigned;
  }, [categoryGroups]);

  // Unassigned categories (not in any group)
  const unassignedCategories = useMemo(() => {
    return originalCategories.filter(c => !assignedCategories.has(c.name));
  }, [originalCategories, assignedCategories]);

  // Filtered unassigned categories
  const filteredUnassigned = useMemo(() => {
    if (!searchQuery) return unassignedCategories;
    const q = searchQuery.toLowerCase();
    return unassignedCategories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (categoryRenames[c.name] && categoryRenames[c.name].toLowerCase().includes(q))
    );
  }, [unassignedCategories, searchQuery, categoryRenames]);

  // Get transaction count for a category
  const getCategoryCount = useCallback((catName: string) => {
    return originalCategories.find(c => c.name === catName)?.count || 0;
  }, [originalCategories]);

  // Get total count for a group
  const getGroupCount = useCallback((group: CategoryGroup) => {
    return group.children.reduce((sum, child) => sum + getCategoryCount(child), 0);
  }, [getCategoryCount]);

  // Get display name for a category (returns rename if exists)
  const getDisplayName = useCallback((catName: string) => {
    return categoryRenames[catName] || catName;
  }, [categoryRenames]);

  // --- Actions ---
  const handleCreateGroup = () => {
    const name = newGroupName.trim();
    if (!name || categoryGroups.some(g => g.name === name)) return;
    setCategoryGroups([...categoryGroups, { name, children: [] }]);
    setNewGroupName('');
  };

  const handleDeleteGroup = (groupName: string) => {
    setCategoryGroups(categoryGroups.filter(g => g.name !== groupName));
  };

  const handleAddToGroup = (categoryName: string, groupName: string) => {
    // Remove from any existing group
    const updated = categoryGroups.map(g => ({
      ...g,
      children: g.children.filter(c => c !== categoryName),
    }));
    // Add to target group
    setCategoryGroups(
      updated.map(g =>
        g.name === groupName
          ? { ...g, children: [...g.children, categoryName] }
          : g
      )
    );
    setSelectedCategory(null);
  };

  const handleRemoveFromGroup = (categoryName: string) => {
    setCategoryGroups(
      categoryGroups.map(g => ({
        ...g,
        children: g.children.filter(c => c !== categoryName),
      }))
    );
  };

  const handleStartRename = (catName: string) => {
    setEditingRename(catName);
    setRenameValue(categoryRenames[catName] || catName);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const handleConfirmRename = () => {
    if (!editingRename) return;
    const newName = renameValue.trim();
    if (newName && newName !== editingRename) {
      setCategoryRenames({ ...categoryRenames, [editingRename]: newName });
    } else if (newName === editingRename) {
      // Remove rename if it's back to original
      const updated = { ...categoryRenames };
      delete updated[editingRename];
      setCategoryRenames(updated);
    }
    setEditingRename(null);
  };

  const handleStartGroupRename = (groupName: string) => {
    setEditingGroupName(groupName);
    setEditingGroupNameValue(groupName);
  };

  const handleConfirmGroupRename = () => {
    if (!editingGroupName) return;
    const newName = editingGroupNameValue.trim();
    if (newName && newName !== editingGroupName && !categoryGroups.some(g => g.name === newName)) {
      setCategoryGroups(
        categoryGroups.map(g =>
          g.name === editingGroupName ? { ...g, name: newName } : g
        )
      );
    }
    setEditingGroupName(null);
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, categoryName: string) => {
    e.dataTransfer.setData('text/plain', categoryName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, groupName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroup(groupName);
  };

  const handleDragLeave = () => {
    setDragOverGroup(null);
  };

  const handleDrop = (e: React.DragEvent, groupName: string) => {
    e.preventDefault();
    const categoryName = e.dataTransfer.getData('text/plain');
    if (categoryName) {
      handleAddToGroup(categoryName, groupName);
    }
    setDragOverGroup(null);
  };

  // --- Mobile tap to assign ---
  const handleCategoryTap = (catName: string) => {
    if (isMobile) {
      setSelectedCategory(selectedCategory === catName ? null : catName);
    }
  };

  const handleGroupTap = (groupName: string) => {
    if (isMobile && selectedCategory) {
      handleAddToGroup(selectedCategory, groupName);
    }
  };

  if (!parsedData) {
    return (
      <Box className="animate-fade-in">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t.categories.title}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {t.categories.noData}
        </Typography>
      </Box>
    );
  }

  const hasAnyMappings = categoryGroups.length > 0 || Object.keys(categoryRenames).length > 0;

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {t.categories.title}
          </Typography>
          <Typography color="text.secondary">
            {t.categories.subtitle}
          </Typography>
        </Box>
        {hasAnyMappings && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<RotateCcw size={16} />}
            onClick={clearCategoryMappings}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {t.categories.resetAll}
          </Button>
        )}
      </Box>

      {/* Mobile hint */}
      {isMobile && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="caption" color="primary.main" fontWeight={500}>
            💡 {t.categories.tapToAssign}
          </Typography>
        </Paper>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* Left Panel: Original Categories */}
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Tag size={18} color={theme.palette.primary.main} />
            <Typography variant="h6" fontWeight={600}>
              {t.categories.originalCategories}
            </Typography>
            <Chip
              label={filteredUnassigned.length}
              size="small"
              sx={{ ml: 'auto', fontSize: '0.75rem' }}
            />
          </Box>

          {/* Search */}
          <TextField
            size="small"
            placeholder={t.categories.searchCategories}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <X size={14} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }
            }}
          />

          {/* Category chips */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '60vh', overflowY: 'auto', pr: 0.5 }}>
            {filteredUnassigned.map(({ name, count }) => (
              <Box
                key={name}
                draggable={!isMobile}
                onDragStart={(e) => handleDragStart(e, name)}
                onClick={() => handleCategoryTap(name)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  px: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${
                    selectedCategory === name
                      ? theme.palette.primary.main
                      : theme.palette.divider
                  }`,
                  bgcolor: selectedCategory === name
                    ? alpha(theme.palette.primary.main, 0.08)
                    : 'transparent',
                  cursor: isMobile ? 'pointer' : 'grab',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  },
                  '&:active': {
                    cursor: isMobile ? 'pointer' : 'grabbing',
                  },
                }}
              >
                {!isMobile && (
                  <GripVertical size={14} color={theme.palette.text.disabled} />
                )}

                {editingRename === name ? (
                  <TextField
                    inputRef={renameInputRef}
                    size="small"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleConfirmRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename();
                      if (e.key === 'Escape') setEditingRename(null);
                    }}
                    sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem' } }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight={500}>
                      {getDisplayName(name)}
                    </Typography>
                    {categoryRenames[name] && (
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                        ← {name}
                      </Typography>
                    )}
                  </Box>
                )}

                <Chip
                  label={`${count} ${t.categories.transactions}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 22 }}
                />

                {editingRename !== name && (
                  <Tooltip title={t.categories.rename}>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleStartRename(name); }}
                      sx={{ p: 0.5 }}
                    >
                      <Pencil size={13} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ))}
            {filteredUnassigned.length === 0 && unassignedCategories.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                {t.categories.searchCategories}
              </Typography>
            )}
            {unassignedCategories.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center', fontStyle: 'italic' }}>
                ✓ {t.categories.ungrouped}: 0
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Right Panel: Category Groups */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Create Group */}
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FolderOpen size={18} color={theme.palette.primary.main} />
              <Typography variant="h6" fontWeight={600}>
                {t.categories.yourGroups}
              </Typography>
              {categoryGroups.length > 0 && (
                <Chip
                  label={categoryGroups.length}
                  size="small"
                  color="primary"
                  sx={{ ml: 'auto', fontSize: '0.75rem' }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder={t.categories.groupName}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup(); }}
                fullWidth
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                sx={{
                  borderRadius: 2,
                  minWidth: 'auto',
                  px: 2,
                  textTransform: 'none',
                }}
                startIcon={<Plus size={16} />}
              >
                {t.categories.createGroup}
              </Button>
            </Box>
          </Paper>

          {/* Existing Groups */}
          {categoryGroups.map((group) => (
            <Paper
              key={group.name}
              onDragOver={(e) => handleDragOver(e, group.name)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group.name)}
              onClick={() => handleGroupTap(group.name)}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `2px ${
                  dragOverGroup === group.name ? 'dashed' : 'solid'
                } ${
                  dragOverGroup === group.name
                    ? theme.palette.primary.main
                    : (isMobile && selectedCategory)
                      ? alpha(theme.palette.primary.main, 0.4)
                      : theme.palette.divider
                }`,
                bgcolor: dragOverGroup === group.name
                  ? alpha(theme.palette.primary.main, 0.06)
                  : theme.palette.background.paper,
                transition: 'all 0.2s ease',
                cursor: isMobile && selectedCategory ? 'pointer' : 'default',
              }}
            >
              {/* Group header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: group.children.length > 0 ? 1.5 : 0 }}>
                {editingGroupName === group.name ? (
                  <TextField
                    size="small"
                    value={editingGroupNameValue}
                    onChange={(e) => setEditingGroupNameValue(e.target.value)}
                    onBlur={handleConfirmGroupRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmGroupRename();
                      if (e.key === 'Escape') setEditingGroupName(null);
                    }}
                    autoFocus
                    sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.5, fontWeight: 600 } }}
                  />
                ) : (
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{
                      flex: 1,
                      cursor: 'text',
                      '&:hover': { color: 'primary.main' },
                    }}
                    onClick={(e) => { e.stopPropagation(); handleStartGroupRename(group.name); }}
                  >
                    {group.name}
                  </Typography>
                )}

                <Badge
                  badgeContent={getGroupCount(group)}
                  color="primary"
                  max={9999}
                  sx={{
                    '& .MuiBadge-badge': { fontSize: '0.65rem', height: 18, minWidth: 18 },
                  }}
                >
                  <Chip
                    label={`${group.children.length} ${group.children.length === 1 ? t.categories.category : t.categories.categoriesCount}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 22 }}
                  />
                </Badge>

                {editingGroupName !== group.name && (
                  <Tooltip title={t.categories.rename}>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleStartGroupRename(group.name); }}
                      sx={{ p: 0.5 }}
                    >
                      <Pencil size={13} />
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title={t.categories.deleteGroup}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.name); }}
                    sx={{ p: 0.5 }}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Children */}
              {group.children.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {group.children.map((child) => (
                    <Chip
                      key={child}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{getDisplayName(child)}</span>
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{
                              fontSize: '0.6rem',
                              opacity: 0.7,
                              ml: 0.25,
                            }}
                          >
                            ({getCategoryCount(child)})
                          </Typography>
                        </Box>
                      }
                      size="small"
                      onDelete={() => handleRemoveFromGroup(child)}
                      deleteIcon={<X size={12} />}
                      sx={{
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '& .MuiChip-deleteIcon': {
                          color: theme.palette.text.secondary,
                          '&:hover': { color: theme.palette.error.main },
                        },
                      }}
                    />
                  ))}
                </Box>
              ) : (
                // <Typography
                //   variant="body2"
                //   color="text.disabled"
                //   sx={{ fontStyle: 'italic', textAlign: 'center', py: 1 }}
                // >
                //   {isMobile ? t.categories.tapToAssign : t.categories.emptyGroup}
                // </Typography>


                <Paper
                  sx={{
                    p: 4,
                    borderRadius: 2,
                    border: `2px dashed ${theme.palette.divider}`,
                    bgcolor: 'transparent',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {!isMobile ? t.categories.dragHint : t.categories.tapToAssign}
                  </Typography>
                </Paper>
          


          
              )}
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
};
