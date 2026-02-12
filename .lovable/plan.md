

# Elite Contest Tracker — Full Build Plan

## Overview
A web app for college students to track weekly LeetCode contest performance, with admin oversight, leaderboards, badges, and analytics. Built with React + Supabase (Lovable Cloud).

---

## 1. Authentication & User Management
- **Registration**: Name, Register Number, Email, Password
- **Login**: Email + Password (Supabase Auth)
- **Roles**: Separate `user_roles` table with roles: `student`, `admin`
- All new users register as students by default
- Students can **request admin access**; existing admins see pending requests and can approve/deny

## 2. Database Structure (Supabase)
- **profiles** — name, register_number, email, avatar
- **user_roles** — user_id, role (student/admin)
- **admin_requests** — user_id, status (pending/approved/denied)
- **weekly_entries** — user_id, week_number, contest_name, problems_in_contest (default 4), problems_solved_contest (0–4), practice_problems_solved, created_at
- RLS policies on all tables for security

## 3. Student Dashboard
- **Summary cards**: Total problems solved, contest average, best week, current streak
- **Weekly progress chart** (line/bar chart using Recharts)
- **Performance trend indicator**: improving / stable / declining (based on recent weeks)
- **Motivational message** that changes based on performance level
- **Badges section**: Earned badges displayed (e.g., "Contest Star" for 4/4, "Consistent Coder" for 4-week streak)
- **Weekly entries table**: Scrollable list of all submitted weeks

## 4. Weekly Entry Form
- Fields: Week Number, Contest Name (optional), Problems Solved in Contest (0–4), Practice Problems Solved
- Auto-calculates total weekly solved and running cumulative total
- Edit/update past entries
- Validation to prevent duplicate week entries

## 5. Admin Dashboard
- **Student list** with search and filtering by register number/name
- **Click into any student** to see their full weekly data and charts
- **Export to CSV**: Download all students' data or filtered data as spreadsheet
- **Admin request management**: Approve or deny pending admin access requests

## 6. Leaderboard
- **Ranking by total problems solved** (all-time)
- **Ranking by contest average** (problems solved per contest)
- Top 3 highlighted with special styling
- **Student comparison**: Select 2+ students to compare their weekly performance side-by-side on a chart
- Search/filter by name or register number

## 7. Badge System
- 🌟 **Contest Star** — Solved 4/4 in a contest
- 🔥 **On Fire** — 3+ weeks in a row with 3+ solved
- 💎 **Consistency King** — Submitted every week for 4+ consecutive weeks
- 🏆 **Top Performer** — Ranked #1 on leaderboard
- Badges displayed on student dashboard and leaderboard

## 8. In-App Notifications
- Reminder banner when a student hasn't submitted this week's entry
- Notification when admin approves/denies access request
- Congratulatory notification when earning a new badge

## 9. UI & Design
- Clean, modern design with card-based layout
- **Dark / Light mode** toggle
- Fully **mobile responsive**
- Sidebar navigation: Dashboard, Submit Entry, Leaderboard, (Admin panel for admins)
- Charts via Recharts (already installed)

## 10. Pages Summary
| Page | Access |
|------|--------|
| Login / Register | Public |
| Student Dashboard | Student |
| Submit Weekly Entry | Student |
| Leaderboard | All authenticated |
| Student Comparison | All authenticated |
| Admin Dashboard | Admin |
| Student Detail (admin view) | Admin |
| Admin Requests | Admin |

