# Unused Files and Components

This document lists all unused files and components that can be safely removed from the project.

## 🗑️ Completely Unused Files (Safe to Delete)

### Components
1. **`components/auth/Statistics.tsx`**
   - Status: Commented out in router
   - Only imports: AdaptiveLearningProgress, SpacedRepetitionProgress
   - Not imported anywhere else

2. **`components/StudyGroups.tsx`**
   - Status: Commented out in router
   - Only imports: studyGroup service
   - Not imported anywhere else

3. **`components/Logo.tsx`**
   - Status: Commented out in router
   - Not imported anywhere

4. **`components/common/LanguageSwitcher.tsx`**
   - Not imported anywhere in the codebase

5. **`components/common/Form/FormField.tsx`**
   - Not imported anywhere in the codebase

6. **`components/ui/command.tsx`**
   - Only used by `StudyGroups.tsx` (commented out)
   - Can be deleted if removing StudyGroups feature

7. **`components/ui/popover.tsx`**
   - Only used by `StudyGroups.tsx` (commented out)
   - Can be deleted if removing StudyGroups feature

8. **`components/ui/dialog.tsx`**
   - Only used by `command.tsx` (which is only used by StudyGroups)
   - Can be deleted if removing StudyGroups feature

### Services
1. **`services/profile.ts`**
   - Not imported anywhere
   - Functionality exists in `services/supabase.ts`

2. **`services/search.ts`**
   - Not imported anywhere

3. **`services/learningPath.ts`**
   - Only imported by `services/adaptiveLearning.ts`
   - But `adaptiveLearning.ts` is only used by `Statistics.tsx` (commented out)

### Stores
1. **`store/taskStore.ts`**
   - Not imported anywhere
   - `examStore.ts` is used instead (handles both exam and task state)

### Utilities
1. **`utils/errorHandling.ts`**
   - Not imported anywhere
   - Contains AppError class and handleApiError function that are unused

### Other Files
1. **`routes.tsx`**
   - Empty file (routes moved to `router/index.tsx`)

## ⚠️ Conditionally Unused (Used by Commented Features)

These files are only used by features that are currently commented out:

1. **`components/AdaptiveLearningProgress.tsx`**
   - Only used by `Statistics.tsx` (commented out)

2. **`components/SpacedRepetitionProgress.tsx`**
   - Only used by `Statistics.tsx` (commented out)

3. **`services/adaptiveLearning.ts`**
   - Only used by `Statistics.tsx` (commented out)
   - Also imports `learningPath.ts`

4. **`services/spacedRepetition.ts`**
   - Only used by `SpacedRepetitionProgress.tsx` (which is only used by Statistics)

5. **`services/studyGroup.ts`**
   - Only used by `StudyGroups.tsx` (commented out)

6. **`services/userStatistics.ts`**
   - Used by `TaskCompletion.tsx` (active feature)
   - **KEEP THIS ONE** - Actually used!

## ✅ Files That Are Used (Keep These)

- `components/common/LoadingSpinner.tsx` - Used by PageLoader and SheetView
- `components/StrictModeDroppable.tsx` - Used by SheetEdit and TaskPreview
- `types/analytics.ts` - Used by multiple services and components
- All feature components in `features/*/components/` - Used by their respective pages

## 📋 Summary

### Safe to Delete Immediately:
- `components/auth/Statistics.tsx` ✅
- `components/StudyGroups.tsx` ✅
- `components/Logo.tsx` ✅
- `components/common/LanguageSwitcher.tsx` ✅
- `components/common/Form/FormField.tsx` ✅
- `services/profile.ts` ✅
- `services/search.ts` ✅
- `store/taskStore.ts` ✅
- `utils/errorHandling.ts` ✅
- `routes.tsx` ✅

### Can Delete if Removing Commented Features:
- `components/AdaptiveLearningProgress.tsx` (used by Statistics)
- `components/SpacedRepetitionProgress.tsx` (used by Statistics)
- `components/ui/command.tsx` (used by StudyGroups)
- `components/ui/popover.tsx` (used by StudyGroups)
- `components/ui/dialog.tsx` (used by command.tsx)
- `services/adaptiveLearning.ts` (used by Statistics)
- `services/learningPath.ts` (used by adaptiveLearning)
- `services/spacedRepetition.ts` (used by SpacedRepetitionProgress)
- `services/studyGroup.ts` (used by StudyGroups)

### Total Files to Delete: 19 files

## 📊 Breakdown by Category

**Components:** 8 files
**Services:** 5 files  
**Stores:** 1 file
**Utils:** 1 file
**Other:** 1 file (routes.tsx)
**UI Components (shadcn):** 3 files (only if removing StudyGroups)

