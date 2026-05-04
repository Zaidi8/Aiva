# Aiva - Healthcare Appointment Management System
## Complete Wireframes & Features Documentation

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Complete Feature List](#complete-feature-list)
3. [Design System](#design-system)
4. [Page Wireframes](#page-wireframes)

---

## Project Overview

**Aiva** is an AI-powered healthcare appointment management system that streamlines clinic operations through:
- Intelligent appointment scheduling
- AI-driven phone receptionist
- Patient record management
- Real-time analytics and reporting
- Comprehensive settings and customization

**Tech Stack:**
- Next.js 16 (React 19)
- TypeScript
- Tailwind CSS v4
- Radix UI Components
- Motion (Framer Motion)
- Recharts for data visualization

---

## Complete Feature List

### 🔐 Authentication System
- **Login/Register Toggle**
  - Animated flip transition between login and register forms
  - Email and password authentication
  - "Remember me" functionality
  - Forgot password option
  - Gradient animated background
  - Mobile-responsive design

### 📊 Dashboard
- **Overview Statistics**
  - Today's appointments count with change indicator
  - Pending approvals
  - Cancellations tracking
  - Patient satisfaction score (4.6/5)

- **AI Receptionist Status Card**
  - Real-time online status indicator
  - Daily call statistics (47 calls handled)
  - Bookings made counter (32)
  - Success rate display (94%)
  - Animated pulsing indicators

- **Today's Appointments Preview**
  - List of 4 most recent appointments
  - Patient avatars with initials
  - Doctor and time information
  - Status badges (confirmed, pending, completed, cancelled)
  - Empty state with "Add Appointment" CTA

- **Quick Actions**
  - New Appointment button
  - View Calendar shortcut
  - AI Settings access

- **Development Controls**
  - Toggle empty states for testing
  - Test notification system
  - Page indicators

### 📅 Appointments Management
- **Calendar Integration**
  - Interactive monthly calendar
  - Date selection
  - Visual highlighting of selected date

- **Daily Summary Panel**
  - Total appointments for selected date
  - Confirmed count
  - Pending count
  - Color-coded statistics

- **Search & Filter**
  - Search by patient name or doctor
  - Filter by status (all, confirmed, pending, completed, cancelled)
  - Real-time filtering

- **Appointments List**
  - Paginated appointment cards (6 per page)
  - Patient avatar with initials
  - Doctor name and specialty
  - Time and appointment type
  - Phone number
  - Status badges
  - "View Details" action button

- **New Appointment Modal**
  - Form to create appointments
  - Patient selection
  - Doctor selection
  - Date and time picker
  - Appointment type selection

- **Pagination**
  - Navigate through multiple pages
  - Page indicators
  - Large dataset support (50+ items)

### 👥 Patient Records
- **Search Functionality**
  - Search by patient name
  - Search by phone number
  - Real-time search results

- **Date Range Filter**
  - Filter by last visit date
  - Custom date range picker

- **Patient Statistics**
  - Total patients count
  - Active today (8)
  - Upcoming visits (12)
  - New patients this month (24)

- **Patient Cards**
  - Large avatar with initials
  - Full name and basic info (age, gender)
  - Phone number
  - Last visit date
  - Upcoming appointment highlight
  - Medical history tags (up to 3 visible)
  - "View Full Record" button

- **Patient Record Modal**
  - Complete patient information
  - Full medical history
  - Appointment history
  - Contact details

- **Add Patient Modal**
  - New patient registration form
  - Name, age, gender fields
  - Contact information
  - Medical history input

- **Pagination**
  - Items per page selector (10, 20, 50)
  - Total items counter
  - Page navigation

### 🤖 AI Receptionist
- **Performance Statistics**
  - Calls handled today (47) with change indicator
  - Successful bookings (32)
  - Success rate (94%)
  - Average call duration (3:15)

- **Call List Panel**
  - Scrollable list of recent calls
  - Call type icons (booking, inquiry, reschedule, cancellation)
  - Patient name and phone
  - Call summary preview
  - Duration and timestamp
  - Status badges (Completed, Assisted, Transferred)
  - Active call highlighting
  - Total call count

- **Call Detail Panel**
  - Patient information header
  - Call metadata (start/end time, duration)
  - Call type and sentiment badges
  - 5-star quality rating

- **Transcript Tab**
  - Chat-style conversation view
  - AI messages (left-aligned, gray bubble)
  - Patient messages (right-aligned, gradient bubble)
  - Timestamp for each message
  - Speaker identification (Aiva AI / Patient name)

- **Summary Tab**
  - Call outcome summary
  - Detailed call information grid:
    - Caller name
    - Phone number
    - Duration
    - Call type
    - Start time
    - Quality rating
  - Conversation flow timeline
  - Condensed transcript view

- **Call Recording Features**
  - Play recording button
  - Export conversation button
  - Recording availability indicator

- **Search & Filters**
  - Search by caller name or phone
  - Filter by outcome (all, completed, assisted)
  - Date range filter

- **Notifications Dialog**
  - Recent AI notifications
  - Notification type indicators
  - Delivery status
  - Timestamp
  - Color-coded by priority

### 📈 Analytics & Reports
- **Time Range Selector**
  - Week view
  - Month view
  - Quarter view
  - Year view

- **Appointment Type Filter**
  - All types
  - General checkup
  - Consultation
  - Follow-up
  - Emergency

- **Key Metrics Cards**
  - Total patients (1,284) with +8.2% growth
  - Appointments this month (75) with +15.3% growth
  - Completed appointments (72) with +12.5% growth
  - Growth rate (18.7%) with +3.1% change

- **Monthly Appointment Trends**
  - Line chart (6 months)
  - Total appointments line
  - Completed appointments line
  - Interactive tooltips
  - Export functionality

- **Weekly Appointments Breakdown**
  - Stacked bar chart
  - Booked (blue)
  - Confirmed (green)
  - Canceled (orange)
  - Daily breakdown

- **Performance Metrics**
  - Patient satisfaction score (96%)
  - Appointment show-up rate (92%)
  - AI receptionist efficiency (94%)
  - Average wait time (15 mins)
  - Animated progress bars

- **Export Functionality**
  - Export full reports
  - Export individual charts
  - PDF/CSV download options

### ⚙️ Settings
- **Tab Navigation**
  - Profile
  - Notifications
  - Security
  - AI Settings
  - Appearance

- **Profile Settings**
  - Full name input
  - Email address
  - Phone number
  - Role display (disabled)
  - Clinic name
  - Clinic address (textarea)
  - Save changes button

- **Notification Preferences**
  - New appointments toggle
  - Appointment cancellations toggle
  - AI call notifications toggle
  - Daily summary email toggle
  - System updates toggle
  - Individual descriptions for each setting

- **Security Settings**
  - Change password form:
    - Current password
    - New password
    - Confirm password
  - Two-factor authentication toggle
  - Security description text

- **AI Receptionist Configuration**
  - AI assistant name customization
  - Greeting message editor (textarea)
  - Auto-book appointments toggle
  - Send confirmations toggle
  - Handle rescheduling toggle
  - Emergency transfers toggle

- **Appearance Settings**
  - Dark mode toggle
  - Compact view toggle
  - Animations toggle
  - Theme customization options

### 🎨 UI Kit (Design System Showcase)
- **Brand Identity**
  - Aiva logo display
  - Animated rotation effect
  - Logo variations

- **Component Library**
  - Buttons (primary, secondary, outline, variants)
  - Cards with headers
  - Input fields
  - Labels
  - Badges (success, warning, error, info)
  - Alerts
  - Stats bars
  - Call records
  - Pagination bars
  - Toast notifications

- **Interactive Demos**
  - Toast notification demo
  - Sound notification demo
  - Component variations
  - State examples

### 🔔 Notification System
- **Toast Notifications**
  - New appointment alerts
  - Custom appointment toast component
  - Patient name, time, and doctor info
  - Auto-dismiss (4 seconds)
  - Sound notification support
  - Top-right positioning

- **In-App Notifications**
  - Notification count badge
  - Notification panel
  - AI receptionist alerts
  - System notifications

### 🎯 Common Features (All Pages)
- **Top Bar**
  - Page title
  - Page description
  - Action buttons (context-specific)
  - Notification bell with count
  - Consistent across all pages

- **Sidebar Navigation**
  - Collapsible/expandable
  - Active page highlighting
  - Navigation items:
    - Dashboard
    - Appointments
    - Patient Records
    - AI Receptionist
    - Analytics
    - UI Kit
    - Settings (bottom)
  - User profile dropdown:
    - Avatar with initials
    - Name and role
    - Email address
    - Logout option
  - Mobile hamburger menu
  - Gradient active indicators

- **Animations**
  - Page transitions
  - Card hover effects
  - Button hover/tap animations
  - Smooth scroll
  - Loading states
  - Fade-in effects
  - Scale animations on hover

- **Responsive Design**
  - Mobile-first approach
  - Tablet breakpoints
  - Desktop optimization
  - Grid layout adjustments
  - Collapsible sidebar on mobile

### 🛠️ Developer Features
- **Dev Controls Panel**
  - Toggle empty states
  - Toggle large datasets (50+ items)
  - Test notifications
  - Page navigation helpers
  - Bottom-fixed position

- **Mock Data System**
  - Appointments data
  - Patient records
  - Call recordings with transcripts
  - Analytics data
  - Notifications
  - Comprehensive data structures

---

## Design System

### Color Palette
```
Primary Blue:     #2F80ED
Light Blue:       #56CCF2
Success Green:    #27AE60
Warning Orange:   #F2994A
Error Red:        #EB5757
Dark Text:        #333333
Background:       #F7F9FB
```

### Typography
- **Font Family:** Geist Sans (primary), Geist Mono (monospace)
- **Heading Sizes:**
  - H1: 3xl-6xl
  - H2: 2xl-3xl
  - H3: xl-2xl
- **Body:** text-sm to text-base
- **Small:** text-xs to text-sm

### Spacing
- **Padding:** p-3 to p-12
- **Gaps:** gap-2 to gap-8
- **Margins:** m-2 to m-8

### Components
- **Cards:** Rounded corners (rounded-xl), shadow on hover
- **Buttons:** Gradient backgrounds, rounded corners, shadow effects
- **Badges:** Small, rounded-full, color-coded by status
- **Inputs:** Height h-12, rounded corners, icon support

---

## Page Wireframes

### 1. Login/Register Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Animated Gradient Background - Blue/Green]                   │
│                                                                 │
│  ┌─────────────────┐          ┌──────────────────────┐         │
│  │                 │          │  ┌────────┬────────┐ │         │
│  │                 │          │  │Register│ Login  │ │  (Tabs) │
│  │   [Aiva Logo]   │          │  └────────┴────────┘ │         │
│  │                 │          │                      │         │
│  │      Aiva       │          │  Welcome Back        │         │
│  │                 │          │  Login to access...  │         │
│  └─────────────────┘          │                      │         │
│   (Large Logo)                │  📧 Email Address    │         │
│                               │  ┌────────────────┐  │         │
│   (Left side when Login)      │  │                │  │         │
│                               │  └────────────────┘  │         │
│                               │                      │         │
│   [Form appears here          │  🔒 Password         │         │
│    when Register]             │  ┌────────────────┐  │         │
│                               │  │            👁️  │  │         │
│                               │  └────────────────┘  │         │
│                               │                      │         │
│                               │  ☑️ Remember me      │         │
│                               │      Forgot password?│         │
│                               │                      │         │
│                               │  ┌────────────────┐  │         │
│                               │  │     Login      │  │         │
│                               │  └────────────────┘  │         │
│                               │                      │         │
│                               └──────────────────────┘         │
│                               (Animated card)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Animated background with rotating gradient orbs
- Flip animation between login and register
- Email and password inputs with icons
- Password visibility toggle
- Gradient buttons
- Responsive layout (logo left, form right on desktop)

---

### 2. Dashboard Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌───────┐ Dashboard                        🔔(3)  [+ New Appt]     │
│ │ MENU  │                                                           │
│ └───────┘                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ 📅 Today │  │ ⏰ Pend. │  │ ❌ Canc. │  │ 👍 Satis.│          │
│  │    24    │  │    7     │  │    3     │  │   4.6    │          │
│  │   +3     │  │          │  │          │  │          │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ 🤖 AI Receptionist              [View Details →]       │        │
│  │ ● Online & Active                                      │        │
│  │                                                         │        │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │        │
│  │ │📞 Calls:47  │ │📅 Booked:32 │ │✅ Rate:94%  │      │        │
│  │ └─────────────┘ └─────────────┘ └─────────────┘      │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  Today's Appointments                        [View All →]          │
│  ┌────────────────────────────────────────────────────┐            │
│  │ [JD] John Doe               3:00 PM   [confirmed]  │            │
│  │      Dr. Williams           Checkup                 │            │
│  ├────────────────────────────────────────────────────┤            │
│  │ [SM] Sarah Miller           3:30 PM   [pending]    │            │
│  │      Dr. Johnson            Follow-up               │            │
│  ├────────────────────────────────────────────────────┤            │
│  │ [MB] Michael Brown          4:00 PM   [confirmed]  │            │
│  │      Dr. Davis              Consultation            │            │
│  └────────────────────────────────────────────────────┘            │
│                                                                     │
│  Quick Actions                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │ ➕         │  │ 📅         │  │ 🤖         │                  │
│  │    New     │  │   View     │  │    AI      │                  │
│  │ Appointment│  │  Calendar  │  │  Settings  │                  │
│  └────────────┘  └────────────┘  └────────────┘                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- 4 stat cards with icons and values
- AI Receptionist status card (gradient background)
- Recent appointments list (4 items)
- Patient avatars with initials
- Status badges (color-coded)
- Quick action buttons
- Empty state option

---

### 3. Appointments Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌───────┐ Appointments                                              │
│ │ MENU  │ Manage and schedule patient appointments                  │
│ └───────┘                                                           │
├────┬────────────────────────────────────────────────────────────────┤
│    │                                                                 │
│ S  │  🔍 [Search patients or doctors...]  [Status ▾] [+ New Appt]  │
│ I  │                                                                 │
│ D  │  ┌──────────────────────────────────────────────────────────┐ │
│ E  │  │ [Avatar] John Doe              👤 Dr. Williams          │ │
│ B  │  │          +1-555-0123           ⏰ 3:00 PM               │ │
│ A  │  │          Checkup               [confirmed]              │ │
│ R  │  │                                          [View Details]  │ │
│    │  ├──────────────────────────────────────────────────────────┤ │
│ 📅 │  │ [Avatar] Sarah Miller          👤 Dr. Johnson          │ │
│ Cal│  │          +1-555-0124           ⏰ 3:30 PM               │ │
│    │  │          Follow-up             [pending]                │ │
│ Sum│  │                                          [View Details]  │ │
│mar │  ├──────────────────────────────────────────────────────────┤ │
│y   │  │ [Avatar] Michael Brown         👤 Dr. Davis            │ │
│    │  │          +1-555-0125           ⏰ 4:00 PM               │ │
│Tot │  │          Consultation           [confirmed]              │ │
│:24 │  │                                          [View Details]  │ │
│    │  ├──────────────────────────────────────────────────────────┤ │
│Con │  │ [Avatar] Emily White           👤 Dr. Martinez         │ │
│:20 │  │          +1-555-0126           ⏰ 4:30 PM               │ │
│    │  │          Checkup               [completed]              │ │
│Pen │  │                                          [View Details]  │ │
│:4  │  └──────────────────────────────────────────────────────────┘ │
│    │                                                                 │
│[+] │             [← 1 2 3 4 5 →]  Page 1 of 5                      │
│New │                                                                 │
└────┴─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Left sidebar with calendar and daily summary
- Search bar and status filter
- Appointment cards (6 per page)
- Patient info, doctor, time, type, phone
- Status badges
- Pagination controls
- New appointment modal

---

### 4. Patient Records Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌───────┐ Patient Records                          [+ Add Patient] │
│ │ MENU  │ Manage patient information and medical history           │
│ └───────┘                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🔍 [Search by name or phone...]        [Date Range ▾]            │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │👥 Total  │  │✅ Active │  │📅 Visits │  │🆕 New    │          │
│  │   142    │  │    8     │  │   12     │  │   24     │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  [Large Avatar]  John Doe                              │        │
│  │     JD           32 years • Male                       │        │
│  │                                                         │        │
│  │                  📞 +1-555-0123                        │        │
│  │                  📅 Last visit: Jan 15, 2025           │        │
│  │                                           [View Record]│        │
│  │                  🟢 Upcoming: Jan 20, 2025 - 3:00 PM  │        │
│  │                                                         │        │
│  │                  [Hypertension] [Diabetes] [Asthma]    │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  [Large Avatar]  Sarah Miller                          │        │
│  │     SM           28 years • Female                     │        │
│  │                                                         │        │
│  │                  📞 +1-555-0124                        │        │
│  │                  📅 Last visit: Jan 10, 2025           │        │
│  │                                           [View Record]│        │
│  │                                                         │        │
│  │                  [Allergies] [Migraine]                │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│              Showing 1-10 of 142  [10 ▾]  [← 1 2 3 →]             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Search and date range filters
- 4 statistics cards
- Large patient cards with detailed info
- Medical history tags
- Upcoming appointments highlighted
- Items per page selector
- Pagination
- Patient record modal
- Add patient modal

---

### 5. AI Receptionist Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌───────┐ AI Receptionist                                  🔔(5)       │
│ │ MENU  │                                                              │
│ └───────┘                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │📞 Calls  │  │✅ Success│  │📈 Rate   │  │⏱️ Avg.   │              │
│  │   47     │  │   32     │  │  94%     │  │  3:15    │              │
│  │   +5     │  │          │  │          │  │          │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                         │
│  🔍 [Search caller...]  [Status ▾]  [Date Range ▾]                    │
│                                                                         │
│  ┌─────────────────────┬─────────────────────────────────────────────┐ │
│  │ Recent Calls (47)   │ [Selected Call Details]                     │ │
│  ├─────────────────────┤                                             │ │
│  │ ● 📅 John Doe      │ [JD] John Doe        +1-555-0123  [✅]      │ │
│  │   Booking appt...   │ 9:15 AM - 9:18 AM (3:15)                    │ │
│  │   3:15 • 9:15 AM    │ 📅 Booking • 😊 Positive • ⭐⭐⭐⭐⭐       │ │
│  │   [Success]         │                                             │ │
│  ├─────────────────────┤ ┌─────────────────────────────────────────┐ │ │
│  │   📞 Sarah Miller   │ │ [Transcript] [Summary]                 │ │ │
│  │   Inquiry about...  │ ├─────────────────────────────────────────┤ │ │
│  │   2:45 • 9:30 AM    │ │                                         │ │ │
│  │   [Success]         │ │ 🤖 Hello! How can I help...            │ │ │
│  ├─────────────────────┤ │                                         │ │ │
│  │   🔄 Michael Brown  │ │ 👤 I need to book an appointment       │ │ │
│  │   Reschedule req... │ │                                         │ │ │
│  │   4:20 • 10:00 AM   │ │ 🤖 I'd be happy to help you...         │ │ │
│  │   [Success]         │ │                                         │ │ │
│  ├─────────────────────┤ │ 👤 Great, thank you!                   │ │ │
│  │   ❌ Emily White    │ │                                         │ │ │
│  │   Cancellation...   │ │ 🤖 You're welcome!                     │ │ │
│  │   2:10 • 10:30 AM   │ │    (Scrollable transcript)             │ │ │
│  │   [Success]         │ │                                         │ │ │
│  │   (Scrollable)      │ └─────────────────────────────────────────┘ │ │
│  └─────────────────────┤ 🎤 Recording available  [▶️ Play][⬇️ Export]│ │
│                        └─────────────────────────────────────────────┘ │
│                                                                         │
│         Showing 1-10 of 47  [10 ▾]  [← 1 2 3 4 5 →]                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- 4 performance statistics
- Search, status filter, date range
- Two-panel layout (equal height, both scrollable)
- Call list with type icons
- Call detail panel with tabs
- Transcript view (chat-style)
- Summary view (timeline + details)
- Recording controls
- Quality ratings and sentiment
- Notifications dialog

---

### 6. Analytics Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌───────┐ Analytics & Reports                                       │
│ │ MENU  │ Comprehensive insights into clinic performance            │
│ └───────┘                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Time Range: This Month ▾] [Type: All ▾]  [⬇️ Export Report]     │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │👥 Patients│  │📅 Appts  │  │✅ Complet│  │📈 Growth │          │
│  │  1,284   │  │   75     │  │   72     │  │  18.7%   │          │
│  │  +8.2%   │  │  +15.3%  │  │  +12.5%  │  │  +3.1%   │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                     │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐ │
│  │ Monthly Appointment Trends  │  │ Weekly Breakdown            │ │
│  │ [⬇️ Export]                 │  │ [⬇️ Export]                 │ │
│  │                             │  │                             │ │
│  │      📈                     │  │    ████                     │ │
│  │     /  \   /\               │  │    ████  ████               │ │
│  │    /    \ /  \  /\          │  │    ████  ████  ████         │ │
│  │   /      X    \/  \         │  │ ████████████████████         │ │
│  │  /      / \        \        │  │ Mon Tue Wed Thu Fri Sat Sun │ │
│  │ /      /   \        \       │  │ ■ Booked ■ Confirmed ■ X    │ │
│  │ Jan Feb Mar Apr May Jun     │  │                             │ │
│  │ ─ Total ─ Completed         │  │                             │ │
│  └─────────────────────────────┘  └─────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ Performance Metrics                                   │          │
│  ├──────────────────────────────────────────────────────┤          │
│  │ Patient Satisfaction Score              96%          │          │
│  │ ████████████████████████████████████▒▒▒▒             │          │
│  │                                                       │          │
│  │ Appointment Show-up Rate                92%          │          │
│  │ ██████████████████████████████████▒▒▒▒▒▒             │          │
│  │                                                       │          │
│  │ AI Receptionist Efficiency              94%          │          │
│  │ ███████████████████████████████████▒▒▒▒▒             │          │
│  │                                                       │          │
│  │ Average Wait Time                    15 mins          │          │
│  │ █████████████████████████████████▒▒▒▒▒▒▒             │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Time range and appointment type filters
- 4 key metrics with growth indicators
- Line chart (monthly trends)
- Bar chart (weekly breakdown)
- Performance metrics with progress bars
- Export functionality for reports
- Interactive tooltips on charts

---

### 7. Settings Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌───────┐ Settings                                                  │
│ │ MENU  │ Manage your account and application preferences           │
│ └───────┘                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────┬──────────┬─────────┬──────────┬──────────┐             │
│  │ 👤     │ 🔔       │ 🔒      │ 🤖       │ 🎨       │             │
│  │Profile │Notificat.│Security │AI Settings│Appearance│             │
│  └────────┴──────────┴─────────┴──────────┴──────────┘             │
│                                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ Profile Information                                     │        │
│  │ Update your personal and clinic information             │        │
│  ├────────────────────────────────────────────────────────┤        │
│  │                                                         │        │
│  │  Full Name                    Email                    │        │
│  │  ┌──────────────────┐         ┌──────────────────┐     │        │
│  │  │Dr. Sarah Wilson  │         │sarah@clinic.com  │     │        │
│  │  └──────────────────┘         └──────────────────┘     │        │
│  │                                                         │        │
│  │  Phone                        Role                     │        │
│  │  ┌──────────────────┐         ┌──────────────────┐     │        │
│  │  │+1 (555) 123-4567│         │Admin (disabled)  │     │        │
│  │  └──────────────────┘         └──────────────────┘     │        │
│  │                                                         │        │
│  │  Clinic Name                                            │        │
│  │  ┌──────────────────────────────────────────────┐      │        │
│  │  │City Medical Center                           │      │        │
│  │  └──────────────────────────────────────────────┘      │        │
│  │                                                         │        │
│  │  Clinic Address                                         │        │
│  │  ┌──────────────────────────────────────────────┐      │        │
│  │  │123 Healthcare Boulevard...                   │      │        │
│  │  │Suite 200, Medical District...                │      │        │
│  │  └──────────────────────────────────────────────┘      │        │
│  │                                                         │        │
│  │  [💾 Save Changes]                                      │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

NOTIFICATION TAB:
  ┌────────────────────────────────────────────────────────┐
  │ Notification Preferences                                │
  ├────────────────────────────────────────────────────────┤
  │ ☑️ New Appointments                            [ON]    │
  │    Get notified when new appointments are booked       │
  │                                                         │
  │ ☑️ Appointment Cancellations                   [ON]    │
  │    Receive alerts for cancelled appointments           │
  │                                                         │
  │ ☑️ AI Call Notifications                       [ON]    │
  │    Notifications for AI receptionist activity          │
  │                                                         │
  │ ☐ Daily Summary                                [OFF]   │
  │    Receive daily summary emails                        │
  │                                                         │
  │ [💾 Save Preferences]                                   │
  └────────────────────────────────────────────────────────┘

AI SETTINGS TAB:
  ┌────────────────────────────────────────────────────────┐
  │ AI Receptionist Configuration                          │
  ├────────────────────────────────────────────────────────┤
  │ AI Assistant Name                                       │
  │ ┌────────────────────────────────────────────────┐     │
  │ │Aiva                                            │     │
  │ └────────────────────────────────────────────────┘     │
  │                                                         │
  │ Greeting Message                                        │
  │ ┌────────────────────────────────────────────────┐     │
  │ │Hello! Welcome to City Medical Center...       │     │
  │ │I'm Aiva, your AI virtual assistant...         │     │
  │ └────────────────────────────────────────────────┘     │
  │                                                         │
  │ ☑️ Auto-Book Appointments                      [ON]    │
  │    Allow AI to automatically book appointments         │
  │                                                         │
  │ ☑️ Send Confirmations                          [ON]    │
  │    Automatically send appointment confirmations        │
  │                                                         │
  │ [💾 Save AI Settings]                                   │
  └────────────────────────────────────────────────────────┘
```

**Key Elements:**
- 5-tab navigation (Profile, Notifications, Security, AI Settings, Appearance)
- Profile tab: personal and clinic info forms
- Notifications tab: toggle switches for each notification type
- Security tab: password change form, 2FA toggle
- AI Settings tab: AI name, greeting, behavior toggles
- Appearance tab: theme and display preferences
- Save buttons per section

---

### 8. UI Kit Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌───────┐ UI Kit                                          🔔(5)     │
│ │ MENU  │ Design system components and style guide for Aiva        │
│ └───────┘                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Brand Identity                                                     │
│  ┌────────────────────────────┐  ┌────────────────────────────┐   │
│  │ Logo                        │  │ Color Palette              │   │
│  │ Aiva - AI Virtual Assistant │  │                            │   │
│  │                             │  │ ■ Primary Blue  #2F80ED    │   │
│  │      [Rotating Logo]        │  │ ■ Light Blue    #56CCF2    │   │
│  │         ⚛️                  │  │ ■ Success Green #27AE60    │   │
│  │        Aiva                 │  │ ■ Warning       #F2994A    │   │
│  └────────────────────────────┘  │ ■ Error Red     #EB5757    │   │
│                                   └────────────────────────────┘   │
│                                                                     │
│  Components                                                         │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ Buttons                                                 │        │
│  │                                                         │        │
│  │ [Primary]  [Secondary]  [Outline]  [Gradient]          │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ Badges                                                  │        │
│  │                                                         │        │
│  │ [Success] [Warning] [Error] [Info] [Neutral]           │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ Stats Bar                                               │        │
│  │                                                         │        │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │        │
│  │ │📅 24 │ │⏰ 7  │ │❌ 3  │ │👍4.6│                   │        │
│  │ └──────┘ └──────┘ └──────┘ └──────┘                   │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ Toast Notification Demo                                 │        │
│  │                                                         │        │
│  │ [Test Appointment Toast] [Test Success Toast]          │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ Pagination                                              │        │
│  │                                                         │        │
│  │           [← 1 2 3 4 5 →]  Page 1 of 5                │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Brand identity section (logo, colors)
- Component showcase:
  - Buttons (all variants)
  - Badges (all states)
  - Stats bars
  - Cards
  - Inputs and labels
  - Alerts
  - Call records
  - Pagination
  - Toasts
- Interactive demos
- Live component examples

---

## Modal Components

### New Appointment Modal
```
┌────────────────────────────────────┐
│ New Appointment              [×]   │
├────────────────────────────────────┤
│                                    │
│ Patient Name                       │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│ Doctor                             │
│ ┌────────────────────────────────┐ │
│ │ Select doctor...           ▾   │ │
│ └────────────────────────────────┘ │
│                                    │
│ Date                    Time       │
│ ┌──────────────┐  ┌──────────────┐│
│ │📅 01/20/2025 │  │⏰ 3:00 PM   ││
│ └──────────────┘  └──────────────┘│
│                                    │
│ Appointment Type                   │
│ ┌────────────────────────────────┐ │
│ │ Select type...             ▾   │ │
│ └────────────────────────────────┘ │
│                                    │
│ Notes (optional)                   │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│      [Cancel]  [Create Appointment]│
│                                    │
└────────────────────────────────────┘
```

### Patient Record Modal
```
┌─────────────────────────────────────────┐
│ Patient Record - John Doe          [×] │
├─────────────────────────────────────────┤
│ [Personal] [Medical] [Appointments]     │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ [Large Avatar]                    │   │
│ │     JD                            │   │
│ │                                   │   │
│ │ Name: John Doe                    │   │
│ │ Age: 32 years                     │   │
│ │ Gender: Male                      │   │
│ │ Phone: +1-555-0123                │   │
│ │ Email: john.doe@email.com         │   │
│ │ Address: 123 Main St...           │   │
│ │                                   │   │
│ │ Medical History:                  │   │
│ │ • Hypertension                    │   │
│ │ • Type 2 Diabetes                 │   │
│ │ • Asthma                          │   │
│ │                                   │   │
│ │ Last Visit: January 15, 2025      │   │
│ │ Next Appointment: Jan 20, 3:00 PM │   │
│ └───────────────────────────────────┘   │
│                                         │
│            [Close]  [Edit Patient]      │
│                                         │
└─────────────────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (>1024px)
- Full sidebar visible
- Multi-column layouts
- Large stat cards
- Expanded tables

### Tablet (768px - 1024px)
- Collapsible sidebar
- 2-column layouts reduce to single
- Maintained card layouts
- Responsive tables

### Mobile (<768px)
- Hamburger menu
- Single column layouts
- Stacked components
- Bottom navigation option
- Simplified tables
- Touch-optimized controls

---

## Animation & Interaction Patterns

### Page Load
- Stats cards: stagger fade-in with scale
- Lists: sequential fade-in
- Charts: animated drawing

### Hover States
- Cards: lift with shadow increase
- Buttons: slight scale + opacity change
- List items: background color transition + slide right

### Click/Tap
- Buttons: scale down (0.98)
- Cards: ripple effect
- Modals: scale in from center

### Transitions
- Page navigation: fade
- Tab switching: slide with fade
- Modal open/close: scale with fade
- Sidebar: slide with easing

---

## Development Notes

### Mock Data
All data is currently stored in `/data/mockData.ts`:
- Appointments (12 items)
- Patients (10 items)
- Call recordings with transcripts (8 items)
- Notifications (6 items)
- Analytics data (monthly/weekly)

### Large Dataset Support
- Toggle in DevControls expands data to 50+ items
- Tests pagination
- Tests search/filter performance

### Empty States
- Toggle in DevControls shows empty state UIs
- Demonstrates zero-data scenarios
- Includes helpful CTAs

---

**Last Updated:** January 2025
**Version:** 0.1.0
