# Setlist Page ([id].tsx) - Memoization & Flickering Analysis

## Issues Found

### 1. Loading State Flickering

#### Problem: Early Return Causes Flicker
```typescript:src/pages/setlist/[id].tsx
// Line 360-362
if (!setlist) {
  return null; // Or a loading spinner
}
```
**Issue**: When `setlist` transitions from `undefined` → `Setlist`, the component unmounts/remounts, causing flicker.

**Fix**: Use `isLoading` from `useGetSetlist` to show loading state instead of returning null.

#### Problem: `useUpdateSetlist` Missing ID Parameter
```typescript:src/pages/setlist/[id].tsx
// Line 87
const updateSetlistMutation = useUpdateSetlist();
```
**Issue**: The hook doesn't receive the `id` parameter, but the mutation is called with `id` in the payload. This is fine, but the mutation object reference changes on every render.

**Fix**: Ensure the mutation hook is stable, or memoize its usage.

#### Problem: Conditional Boolean Flickers
- Line 465: `disabled={flattenedSlides.length === 0}` - flickers during `useFileSlides` loading
- Line 368: `showCarousel &&` - conditional rendering could flicker
- `useFileSlides` `isLoading` state changes can cause flickers
- `useSongs` `isLoading` state changes can cause flickers

### 2. Missing Memoization

#### Problem: Callbacks Passed to Child Components
```typescript:src/pages/setlist/[id].tsx
// Line 372: onOpenChange callback
onOpenChange={setShowCarousel}  // Should be memoized

// Line 388: onOpenChange callback
onOpenChange={(isOpen) => !isOpen && setEditingSong(null)}  // Should be memoized

// Line 444: onAdd callback
onAdd={() => setShowAddSongModal(true)}  // Should be memoized
```

#### Problem: Props Passed to Child Components
```typescript:src/pages/setlist/[id].tsx
// Line 439: songs array reference changes
songs={setlist.songs}  // Array reference changes on every render

// Line 434: items array created inline
items={[
  ...setlist.songs.map((song) => song.id),
  "end-drop-zone",
]}  // New array on every render

// Line 472: flattenedSlides could change reference frequently
flattenedSlides={flattenedSlides}  // Depends on useFileSlides

// Line 383: setlists array created inline
setlists={setlist ? [setlist] : []}  // New array on every render
```

#### Problem: `useFileSlides` Dependencies
```typescript:src/pages/setlist/[id].tsx
// Line 148-153
const { flattenedSlides } = useFileSlides({
  songs,
  songFilter: setlist ? songFilter : undefined,  // Could flicker
  keyResolver,
  songOrderer,
});
```
**Issue**: `songFilter` conditionally passed as `undefined` could cause `useFileSlides` to recalculate unnecessarily.

### 3. Hook Analysis

#### `useGetSetlist`
- Returns: `{ data, isLoading, error, ... }`
- Loading state: `isLoading` can flicker between true/false
- Data can be `undefined` initially, then `Setlist` → causes early return flicker

#### `useUpdateSetlist`
- Returns: Mutation object (reference changes on every render)
- Loading state: `isPending` available but not used
- Could cause flickers if components check `isPending`

#### `useSongs`
- Returns: `{ songs, isLoading, error, ... }`
- Loading state: `isLoading` available but not checked
- `songs` array reference changes on every render (memoized in context, but context value changes)

#### `useFileSlides`
- Returns: `{ flattenedSlides, isLoading, numPages, setNumPages }`
- Loading state: `isLoading` calculated but not used
- `flattenedSlides` array reference changes frequently during loading
- `queries.map((q) => q.data).join(",")` dependency hack in useMemo (line 99)

### 4. Component Analysis

#### `SetlistSongList`
- Already memoized with `React.memo` ✓
- Receives `songs` array - could cause re-renders if reference changes
- Receives callbacks - should be stable

#### `AddSongDialog`
- Receives `songsNotInSetlist` - already memoized ✓
- Receives `setlists={setlist ? [setlist] : []}` - new array every render ✗
- Uses `useSongs()` hook internally - could cause duplicate loading states

#### `EditSongDialog`
- Receives `editingSong` - already state managed ✓
- Uses `useSongs()` hook internally - could cause duplicate loading states

#### `OneTouchSongs`
- Uses `useSongs()` hook internally - could cause duplicate loading states
- Uses `useFileSlides()` hook internally - could cause loading flickers

#### `FileViewer`
- Receives `slides={flattenedSlides}` - array reference changes frequently
- Could cause re-renders during loading

#### `SetlistInfoCard`
- Receives `setlist` - object reference changes when songs update
- Not memoized - re-renders on every parent render

## Recommended Fixes

### Priority 1: Fix Loading State Flickering

1. **Show loading state instead of returning null:**
```typescript
if (isLoading) {
  return <LoadingSpinner />;
}

if (!setlist) {
  return null;
}
```

2. **Memoize `flattenedSlides.length` check:**
```typescript
const hasSlides = useMemo(() => flattenedSlides.length > 0, [flattenedSlides.length]);
```

3. **Use `isLoading` from `useFileSlides` to prevent flicker:**
```typescript
disabled={flattenedSlides.length === 0 || isLoading}
```

### Priority 2: Memoize Callbacks

1. **Memoize all callbacks passed to children:**
```typescript
const handleShowCarousel = useCallback((open: boolean) => {
  setShowCarousel(open);
}, []);

const handleCloseEditDialog = useCallback((isOpen: boolean) => {
  if (!isOpen) setEditingSong(null);
}, []);

const handleShowAddModal = useCallback(() => {
  setShowAddSongModal(true);
}, []);
```

### Priority 3: Memoize Props

1. **Memoize arrays passed as props:**
```typescript
const sortableItems = useMemo(() => [
  ...setlist.songs.map((song) => song.id),
  "end-drop-zone",
], [setlist.songs]);

const setlistArray = useMemo(() => 
  setlist ? [setlist] : [], 
  [setlist]
);
```

2. **Memoize `SetlistInfoCard` component:**
```typescript
export const SetlistInfoCard = React.memo(function SetlistInfoCard({ ... }) {
  // ...
});
```

### Priority 4: Stabilize Hook Dependencies

1. **Always pass `songFilter` or use a stable default:**
```typescript
const { flattenedSlides } = useFileSlides({
  songs,
  songFilter: songFilter ?? (() => false), // Stable default
  keyResolver,
  songOrderer,
});
```

2. **Check loading states to prevent flicker:**
```typescript
const isFileSlidesLoading = useFileSlides({ ... }).isLoading;
const isSongsLoading = useSongs().isLoading;
const isSetlistLoading = useGetSetlist({ setlistId: id }).isLoading;
```

## Summary

### Critical Issues:
1. Early return `if (!setlist)` causes unmount/remount flicker
2. `flattenedSlides.length === 0` check flickers during loading
3. Callbacks not memoized → child components re-render unnecessarily
4. Arrays created inline → reference changes → unnecessary re-renders

### Medium Priority:
1. `SetlistInfoCard` not memoized
2. `useFileSlides` `songFilter` conditionally undefined
3. Loading states not checked/used

### Low Priority:
1. `useSongs` hook used in multiple child components (could consolidate)
2. Mutation loading states not utilized

