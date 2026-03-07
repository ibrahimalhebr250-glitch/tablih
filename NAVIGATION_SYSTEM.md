# Navigation System Documentation

## Overview
Seamless navigation system allowing users to move between different sections of the platform without re-authentication.

## Key Features

### 1. Top Navigation Bar
A fixed navigation bar displayed for authenticated users containing:
- **Marketplace** - Browse available inventory and requests
- **My Orders** - View and manage purchase orders
- **My Inventory** - Manage supplier inventory
- **Deals** - View and manage active deals
- **My Account** - Access user profile and settings
- **Logout** - Sign out from the platform

### 2. Session Persistence
- Session tokens are maintained across all navigation
- No re-authentication required when switching views
- Automatic session validation on each page

### 3. Navigation Flow

#### From Marketplace to Account
```
Marketplace → Click "My Account" → Account Page
```

#### From Account to Marketplace
```
Account Page → Click "Go to Marketplace" → Marketplace
```

#### Between Any Sections
```
Any Section → Click Navigation Item → Target Section
```

## Implementation Details

### Components

#### TopNavigation Component
Location: `src/components/shared/TopNavigation.tsx`

Props:
- `session` - Current user session
- `currentView` - Active navigation item
- `onNavigate` - Navigation handler
- `onLogout` - Logout handler

#### App Component Updates
Location: `src/App.tsx`

New State:
- `mainView` - Tracks current main view (marketplace | dashboard | account)

New Functions:
- `handleNavigation()` - Handles view switching
- `getCurrentNavView()` - Returns current active nav item
- `handleLogout()` - Handles logout and resets views

### Navigation States

#### Main Views
1. **marketplace** - Market section with supply/demand
2. **dashboard** - Operational dashboard with orders
3. **account** - User profile and settings

#### Modal Views
- Orders, Inventory, Deals open as modals over dashboard
- Maintains seamless navigation experience

### Session Management

#### Session Verification
- Session token validated on each navigation
- Automatic redirect to login if session expired
- Session state preserved in memory

#### Role Management
- Buyer and Supplier roles maintained
- Role-specific content displayed
- No re-activation required on navigation

## User Experience

### Before Login
- See marketplace as visitor
- Can browse but not interact
- Login prompts when needed

### After Login
- Full access to all sections
- Navigation bar always visible
- One-click access to any section

### Navigation Flow
```
Login → Marketplace (with nav bar)
     ↓
     ├→ My Account ←→ Marketplace
     ├→ My Orders ←→ Marketplace
     ├→ My Inventory ←→ Marketplace
     └→ Deals ←→ Marketplace
```

## Technical Notes

### Desktop Layout
- TopNavigation appears above main content area
- Sidebars remain visible
- Smooth transitions between views

### Mobile Layout
- TopNavigation replaces Header when logged in
- Full-screen views
- Bottom navigation hidden when logged in

### State Management
- View state managed in App component
- Modal state separate from main view
- Clean state transitions

## Benefits

1. **Seamless Experience** - No interruptions when navigating
2. **Session Persistence** - Stay logged in across views
3. **Quick Access** - One-click to any section
4. **Clear Context** - Always know current location
5. **Efficient Workflow** - Move between tasks easily

## Future Enhancements

- Add breadcrumb navigation
- Implement navigation history
- Add keyboard shortcuts
- Mobile gesture navigation
- Remember last visited view
