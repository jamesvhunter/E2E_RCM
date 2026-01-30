# Organization Setup Implementation

## Overview
Implemented a simple organization setup flow for the Practice Setup page, allowing users to create and edit organization information.

## Changes Made

### 1. New Component: OrganizationDialog.tsx
**Location:** `src/components/practice/OrganizationDialog.tsx`

**Features:**
- Modal dialog for creating/editing organization
- All fields are optional (no validation)
- Fields included:
  - Organization Name
  - Tax ID (EIN)
  - NPI (National Provider Identifier)
  - Address Line 1
  - Address Line 2
  - City
  - State (2 characters, auto-uppercase)
  - ZIP Code
  - Phone

**Behavior:**
- When creating: Empty form, saves new organization
- When editing: Pre-filled with existing data, updates organization
- Auto-closes on success
- Shows loading state during save
- Displays error messages if save fails

### 2. Updated Practice Page
**Location:** `src/app/dashboard/practice/page.tsx`

**Changes:**
- Added `OrganizationDialog` import
- Added state management for organization dialog (open/closed, create/edit mode)
- Connected "Create Organization" button to open dialog in create mode
- Connected "Edit Organization" button to open dialog in edit mode
- Added refetch callback to reload organization data after successful save
- Dialog auto-closes after successful create/edit

**User Flow:**
1. When no organization exists: Shows "Create Organization" button
2. When organization exists:
   - Displays organization details
   - Shows "Edit Organization" button
   - Hides "Create Organization" button (single-org system)

## Technical Details

### API Integration
Uses existing TRPC endpoints:
- `trpc.practice.getOrganization` - Fetch organization
- `trpc.practice.createOrganization` - Create new organization
- `trpc.practice.updateOrganization` - Update existing organization

### Form Management
- Uses `react-hook-form` for form state management
- `useEffect` hook resets form when switching between create/edit modes
- No validation (as per requirements)

### UI Components
Uses existing shadcn/ui components:
- Dialog
- Button
- Input
- Label
- Loader2 (loading spinner)

## Testing
To test the implementation:
1. Navigate to `/dashboard/practice`
2. Click on the "Organization" tab
3. If no organization exists, click "Create Organization"
4. Fill out the form and save
5. After creation, the "Edit Organization" button will appear
6. Click "Edit Organization" to modify existing data

## Notes
- Single organization assumption: System assumes only one organization per installation
- All fields are optional per requirements
- No field validation per requirements
- Success state: Dialog closes automatically (clean UX)
