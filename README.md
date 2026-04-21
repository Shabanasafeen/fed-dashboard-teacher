# FED Program Dashboard

A web-based dashboard for managing the **Front End Development (FED)** program — tracking intakes, courses, teachers, student counts, timelines, and workload distribution.

**GitHub**: [safeens/fed-dashboard](https://github.com/safeens/fed-dashboard) (private)

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + TypeScript | 19.2 / 5.9 |
| Build Tool | Vite | 8.0 |
| Styling | Tailwind CSS | 4.2 |
| Charts | Recharts | 3.8 |
| Date Utilities | date-fns | 4.1 |
| Linting | ESLint | 9.39 |
| Data Extraction | Python + openpyxl | 3.x |
| Data | Static JSON (extracted from Excel) | — |

**No backend required** — all data is embedded as JSON files, parsed at build time from the two source Excel spreadsheets.

## Architecture

```
fed-dashboard/
├── extract_data.py          # Python script: Excel → JSON extraction
├── src/
│   ├── data/                # Generated JSON data files
│   │   ├── courses.json     # 19 courses (Year 1 + Year 2 curriculum)
│   │   ├── teachers.json    # 7 teachers with role counts
│   │   ├── intakes.json     # 29 active cohort intakes
│   │   ├── schedule.json    # 3143 weekly schedule entries
│   │   └── abbreviations.json  # Course abbreviation → name map
│   ├── types.ts             # TypeScript interfaces
│   ├── store.ts             # Data access layer (imports + helpers)
│   ├── App.tsx              # Root: role switcher + page routing
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx  # Navigation sidebar with role toggle
│   │   ├── pm/              # Program Manager views
│   │   │   ├── PmOverview.tsx      # KPI cards + filters
│   │   │   ├── IntakeTimeline.tsx  # Gantt-style course timeline
│   │   │   └── WorkloadChart.tsx   # Teacher workload comparison
│   │   └── teacher/         # Teacher views
│   │       ├── TeacherDashboard.tsx # Current courses + substitutes
│   │       └── GradingDeadlines.tsx # Upcoming assignment deadlines
│   └── utils/
│       └── schedule.ts      # Business logic (workload calc, course blocks)
```

## Data Sources

1. **Teacher Course Responsibility-2025-revised.xlsx** — Curriculum definition:
   - 19 courses across 2 years (4 semesters)
   - Each course: code, name, weeks, hours, credits
   - Teacher assignments: Responsible (owner), 2nd (substitute), 3rd (substitute)
   - Only the Responsible teacher owns the course; 2nd and 3rd are substitutes

2. **FED Access List.xlsx** — Schedule and intake data:
   - 29 active intakes (cohorts): e.g., AUG24FT, OCT24PT, JAN25FT
   - FT = Full-time, PT = Part-time (PT duration = 2x FT duration)
   - Student counts per intake (240 total students)
   - Study plan versions: S19, S21, S23, S24, S25
   - Weekly course progression grid with color coding:
     - **Blue cells** = Assignment/submission weeks
     - **Orange cells** = Course start weeks

## Functional Features

### Role: Program Manager

#### PM-01: Program Overview
- KPI cards: active intakes, total students, courses in curriculum, active teachers
- Filterable by study plan (S19/S21/S23/S24/S25) and type (FT/PT)
- Study plan distribution with progress bars
- Full intake list with student counts and metadata

#### PM-02: Intake Progression Timeline
- Horizontal Gantt chart showing the full timeline for any selected intake
- Each course displayed as a colored block spanning its duration
- Blue circle markers for assignment/submission weeks
- Orange markers for course start weeks
- Hover tooltips with course name, date, and status
- Week numbers and month headers for navigation

#### PM-03: Teacher Workload Comparison
- Bar chart comparing peak weekly student load across all teachers
- Teachers exceeding 50-student threshold flagged in red
- Weekly stacked bar chart breakdown over date range
- Expandable weekly detail table with course-level info per teacher
- Overall summary table: courses, peak students, overloaded weeks, assignment grading counts
- Course breakdown grid showing students and intakes per teacher

#### PM-04: Scenario Simulation (What-If Tool)
- Interactive simulation for course reassignments
- Add new virtual teachers to simulate hiring decisions
- Reassign courses to different teachers via dropdown
- Side-by-side comparison bar chart: original vs simulated workload
- Detailed impact summary table showing before/after metrics
- Real-time workload recalculation with course override support
- Reset all changes button to return to current state

### Role: Teacher

#### T-01: Teacher Dashboard
- Dropdown to select any teacher
- Current course(s) for this week with role badge (Owner/2nd/3rd)
- For each course: which intakes are running it, who are the substitutes
- Next upcoming course start date
- "Open Moodle" button (links to google.com as placeholder)
- Full list of all courses the teacher is assigned to

#### T-02: Grading Deadlines
- Table of all upcoming assignment submissions sorted by nearest due date
- Columns: course name, intake, due date, days until due, students to grade
- Urgency indicators: Urgent (<=7 days), Soon (<=14 days), Upcoming
- Summary footer with total assignments and total students to grade

#### T-03: Course Access (Moodle Links)
- Every course card includes a "Moodle" link
- Opens google.com in a new tab (placeholder for actual Moodle URL)

## Workflow

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Excel Files  │────>│  extract_data.py │────>│  src/data/*.json  │
│  (Downloads)  │     │  (Python/openpyxl)│    │  (static data)    │
└──────────────┘     └─────────────────┘     └──────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │   React App       │
                                              │   (Vite + TS)     │
                                              │                   │
                                              │ store.ts ─> utils │
                                              │     ↓             │
                                              │ App.tsx (router)  │
                                              │   ├─ PM pages     │
                                              │   └─ Teacher pages│
                                              └──────────────────┘
```

1. **Data extraction**: `python3 extract_data.py` parses both Excel files using openpyxl, detects blue (assignment) and orange (course start) cell colors, and outputs 5 JSON files.
2. **Data store**: `store.ts` imports all JSON and exposes typed accessor functions.
3. **Business logic**: `utils/schedule.ts` contains course block aggregation, workload calculation, teacher current courses, and upcoming assignment computation.
4. **UI**: Role-based navigation (PM / Teacher) via sidebar toggle. Each page consumes data through the store and utils.

## Sequence Diagram

```
┌───────────┐     ┌────────────┐     ┌───────────┐     ┌──────────┐     ┌───────────┐
│  Excel    │     │ extract_   │     │   JSON    │     │  store   │     │  React    │
│  Files    │     │ data.py    │     │  Files    │     │  + utils │     │  UI       │
└─────┬─────┘     └─────┬──────┘     └─────┬─────┘     └────┬─────┘     └─────┬─────┘
      │                 │                   │                │                 │
      │  Read XLSX      │                   │                │                 │
      ├────────────────►│                   │                │                 │
      │                 │                   │                │                 │
      │                 │ Parse courses,    │                │                 │
      │                 │ teachers, intakes │                │                 │
      │                 │ Detect colors     │                │                 │
      │                 │ (blue=assignment  │                │                 │
      │                 │  orange=start)    │                │                 │
      │                 │                   │                │                 │
      │                 │ Write JSON        │                │                 │
      │                 ├──────────────────►│                │                 │
      │                 │                   │                │                 │
      │                 │                   │  Import at     │                 │
      │                 │                   │  build time    │                 │
      │                 │                   ├───────────────►│                 │
      │                 │                   │                │                 │
      │                 │                   │                │ Calculate       │
      │                 │                   │                │ workloads,      │
      │                 │                   │                │ course blocks,  │
      │                 │                   │                │ assignments     │
      │                 │                   │                │                 │
      │                 │                   │                │  Render pages   │
      │                 │                   │                ├────────────────►│
      │                 │                   │                │                 │
      │                 │                   │                │                 │ User selects
      │                 │                   │                │                 │ role (PM/Teacher)
      │                 │                   │                │                 │
      │                 │                   │                │  Query data     │
      │                 │                   │                │◄────────────────┤
      │                 │                   │                │                 │
      │                 │                   │                │  Return results │
      │                 │                   │                ├────────────────►│
      │                 │                   │                │                 │
      │                 │                   │                │                 │ Display
      │                 │                   │                │                 │ dashboard
      └─────────────────┴───────────────────┴────────────────┴─────────────────┘
```

## Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+ (comes with Node.js)
- **Python** 3.x (only needed if regenerating data from Excel)
- **Git**

### Clone and Run

```bash
# Clone the repository
git clone https://github.com/safeens/fed-dashboard.git
cd fed-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:5173**

### Re-extract Data from Excel

If the source Excel files are updated:

```bash
# Install Python dependency
pip3 install openpyxl

# Run extraction (expects Excel files in project root)
python3 extract_data.py
```

### Build for Production

```bash
# Type-check and build
npm run build

# Preview production build
npm run preview
```

### Lint

```bash
npm run lint
```

## Key Domain Concepts

- **Intake**: A cohort/class of students, e.g., AUG24FT = August 2024 Full-time
- **Study Plan**: Curriculum version (S19, S21, S23, S24, S25) — older plans have different courses
- **FT vs PT**: Full-time courses run in N weeks; Part-time runs the same course in 2N weeks
- **Responsible Teacher**: The sole owner of a course — handles delivery, content, and grading
- **2nd/3rd Teacher**: Substitutes only, step in when the responsible teacher is unavailable
- **Assignment Week**: Blue-highlighted week when students submit work for grading
- **Course Start**: Orange-highlighted week marking the beginning of a new course
