# Phoenix Placement Hub

Build a complete, functional Phase 1 MVP called "HirePhoenix".

HirePhoenix is a reusable, multi-college Placement Management Platform.

IMPORTANT:

This is not just a student job/opportunity listing website.

It is a centralized placement management system for a college Placement/T&P Cell.

The core workflow is:

Student Data

→ Company

→ Placement Drive

→ Eligibility Rules

→ Dynamic Application Form

→ Student Applications

→ Applicant Management

→ Shortlisting

→ Selection

The application must be FUNCTIONAL and database-backed, not just a visual prototype.

Use the platform's available backend/database/authentication/storage capabilities so that data persists between sessions.

Do not spend development effort on unnecessary branding assets, custom illustrations, marketing pages, or elaborate animations. Prioritize the working product, proper data relationships, authentication, role-based access, realistic demo data, and polished enterprise UI.

==================================================

1. PRODUCT GOAL

==================================================

HirePhoenix should allow a college Placement Cell to manage its placement process from one centralized platform instead of relying on disconnected spreadsheets, Google Forms, messaging groups, and manual eligibility checking.

The platform must be designed so that it is NOT hardcoded for any particular college.

Do not use IPS Academy, any specific real college name, or hardcoded college-specific data anywhere in the product.

The system should conceptually support multiple organizations/colleges even if full multi-tenant administration is kept simple in Phase 1.

Core organization hierarchy:

Organization / College

├── Admins

├── Students

├── Companies

└── Placement Drives

       ├── Eligibility Rules

       ├── Application Form

       └── Applications

==================================================

2. PHASE 1 SCOPE

==================================================

Implement these Phase 1 capabilities:

AUTHENTICATION & ACCESS

1. Student authentication

2. Admin authentication

3. Role-based access

4. Organization/college profile

STUDENT

5. Student profile

6. Academic information

7. Resume/document upload

8. Profile completion

9. Placement drive discovery

10. Eligibility checking

11. Dynamic application submission

12. Application tracking

13. Application withdrawal

14. Announcements

ADMIN

15. Admin dashboard

16. Student management

17. Student CSV import

18. Company management

19. Placement drive management

20. Eligibility rule builder

21. Automatic eligibility evaluation

22. Dynamic form builder

23. Applicant management

24. Application status management

25. Announcements

26. Basic placement statistics

CORE SYSTEM BEHAVIOR

27. Placement drive lifecycle

28. Application deadline enforcement

29. Duplicate application prevention

30. Search/filter/sort

31. Form validation

Do NOT implement the following in Phase 1:

- AI resume scanner

- AI resume scoring

- AI interview preparation

- Online coding test system

- Aptitude test engine

- Recruiter login

- Video interviews

- Email automation

- WhatsApp integration

- College ERP integration

- Alumni system

- ML recommendation engine

- Resume builder

- Payment system

These may be future Phase 2 features but should not complicate the current implementation.

==================================================

3. USERS AND ROLES

==================================================

There are two primary roles in Phase 1:

A. ADMIN / PLACEMENT CELL

The admin represents the college Placement/T&P Cell.

Admin can:

- Manage organization profile

- Manage students

- Import students

- Manage companies

- Create and manage placement drives

- Define eligibility rules

- Create dynamic application forms

- Publish/unpublish drives

- View eligible students

- View applicants

- Filter/search/sort applicants

- View student/application details

- Download resumes

- Update application statuses

- Create announcements

- View placement statistics

B. STUDENT

Students can:

- Register/login

- Complete and update their profile

- Enter academic information

- Upload resume

- View placement drives

- Check eligibility

- View eligibility reasons

- Fill dynamic application forms

- Submit applications

- Withdraw applications before the deadline

- Track application status

- View announcements

Students must never have access to admin functionality.

Admin-only routes and data must be protected.

==================================================

4. ORGANIZATION / COLLEGE

==================================================

Create an Organization/College concept.

Organization should contain information such as:

- Organization name

- Logo placeholder

- Academic year

- Location

- Contact email

- Contact phone

- Website

- Description

Do not require a complicated multi-tenant onboarding system yet.

However, all major entities should conceptually belong to an organization so that the platform can later support multiple colleges without redesigning the entire product.

Do not hardcode a particular college.

Use a generic demo organization such as:

"Northstar Institute of Technology"

or another fictional institution.

==================================================

5. STUDENT PROFILE

==================================================

Create a comprehensive student profile.

PERSONAL INFORMATION:

- Full name

- Profile photo

- Date of birth

- Gender

- Email

- Phone

- Enrollment/Roll number

ACADEMIC INFORMATION:

- Course/program

- Branch/department

- Graduation year

- Academic year/batch

- 10th percentage

- 12th percentage

- Diploma percentage (optional)

- Current CGPA

- Active backlogs

- Total backlogs

PROFESSIONAL INFORMATION:

- Skills

- Certifications

- Projects

- GitHub URL

- LinkedIn URL

- Portfolio URL

DOCUMENTS:

- Resume

- Optional academic documents

Students should be able to edit their profile.

Display a profile completion percentage based on important fields.

The student profile should be the primary source of data used by the eligibility engine.

==================================================

6. COMPANY MANAGEMENT

==================================================

Admin can create, view, edit and delete companies.

Company information:

- Company name

- Logo

- Website

- Industry

- Description

- Location

- HR/recruiter contact name

- Contact email

- Contact phone

A company must be a separate entity from a placement drive.

One company can have multiple placement drives.

Example:

Company:

"NovaTech"

Drives:

- Software Engineer

- Data Analyst

- Backend Developer

Do not duplicate company information unnecessarily inside each drive.

==================================================

7. PLACEMENT DRIVE

==================================================

A placement drive is the central recruitment object.

Admin must be able to create a placement drive for an existing company.

DRIVE BASIC INFORMATION:

- Company

- Job/position title

- Job description

- Employment type

  - Full-time

  - Internship

  - Internship + Full-time

- Job location

- Work mode

  - On-site

  - Hybrid

  - Remote

COMPENSATION:

- CTC

- Stipend if applicable

- Benefits/other information

ELIGIBILITY:

- Eligible graduation year/batch

- Eligibility rules

TIMELINE:

- Application opening date/time

- Application deadline

- Pre-placement talk date/time (optional)

- Recruitment date

- Selection timeline

SELECTION PROCESS:

Allow the admin to define recruitment stages such as:

- Pre-Placement Talk

- Aptitude Test

- Technical Test

- Technical Interview

- HR Interview

- Final Selection

IMPORTANT:

Phase 1 only needs to RECORD/display recruitment stages.

Do not build actual online test or interview systems.

==================================================

8. PLACEMENT DRIVE LIFECYCLE

==================================================

Placement drives should have clear lifecycle states:

Draft

Published

Applications Open

Applications Closed

Selection In Progress

Completed

Admin can control the lifecycle.

Students should only be able to apply when:

- Drive is published

- Applications are open

- Current date is before the deadline

- Student satisfies eligibility rules

- Student has not already applied

Display the current status clearly using badges.

==================================================

9. ELIGIBILITY RULE BUILDER

==================================================

This is one of the most important features of HirePhoenix.

Do NOT hardcode eligibility as a single fixed form.

Create a flexible eligibility rule builder.

The admin should be able to define rules such as:

ACADEMIC:

- CGPA >= 7.5

- 10th percentage >= 70

- 12th percentage >= 70

- Diploma percentage >= 60

BACKGROUND:

- Branch = CSE OR IT

- Graduation year = 2027

- Course = B.Tech

BACKLOGS:

- Active backlogs = 0

- Total backlogs <= 1

SKILLS:

- Required skill = Java

- Required skill = SQL

The system should support combining rules logically.

At minimum, support:

- AND

- OR

Example:

CGPA >= 7.5

AND

10th >= 70

AND

12th >= 70

AND

Branch = CSE OR IT

AND

Graduation Year = 2027

AND

Active Backlogs = 0

The system must evaluate a student's profile against the drive's eligibility rules.

==================================================

10. AUTOMATIC ELIGIBILITY EVALUATION

==================================================

When a student views a placement drive, calculate eligibility from their actual profile.

If eligible:

Display clearly:

"Eligible to Apply"

with a success indicator.

If not eligible:

Display:

"Not Eligible"

and show understandable reasons.

Example:

Minimum CGPA required: 7.5

Your CGPA: 6.9

Minimum 12th percentage: 70%

Your 12th percentage: 64%

This is important.

Do not simply hide ineligible drives.

Admins should also be able to see eligibility statistics.

Example:

Total students: 1,248

Eligible: 382

Not eligible: 866

==================================================

11. DYNAMIC APPLICATION FORM BUILDER

==================================================

This is another flagship feature.

The admin should be able to create a company/drive-specific application form without developers creating a new page.

Supported field types should include:

- Short text

- Long text

- Number

- Email

- Phone

- Dropdown

- Radio

- Checkbox

- Multi-select

- Date

- URL

- File upload

- Resume upload

Each field should support where appropriate:

- Field label

- Field type

- Required/optional

- Placeholder

- Help text

- Validation

- Options for dropdown/radio/multi-select

- Ordering

Admin actions:

- Add field

- Edit field

- Delete field

- Reorder fields

- Mark required/optional

- Configure validation

- Preview form

- Save form

- Publish form

Example:

GitHub Profile

Type: URL

Required: Yes

Validation: Valid URL

The form should be stored as data and rendered dynamically for students.

Do not hardcode individual company application forms.

==================================================

12. STUDENT APPLICATION WORKFLOW

==================================================

Student workflow:

Placement Drives

→ View Drive

→ Check Eligibility

→ View Job Details

→ Fill Dynamic Application Form

→ Validate

→ Submit

→ Application Created

After submission, show confirmation.

The application must store:

- Student

- Organization

- Placement drive

- Company

- Submitted form responses

- Submission date/time

- Current status

Prevent duplicate applications.

If a student already applied:

Display:

"Already Applied"

and the application date/status.

Do not allow a second application for the same drive.

==================================================

13. APPLICATION STATUS

==================================================

Keep Phase 1 application statuses simple:

- Applied

- Under Review

- Shortlisted

- Selected

- Rejected

- Withdrawn

Admin can update statuses.

Students can see their current status.

Display statuses with clear semantic visual badges.

Do not build an overly complicated workflow engine in Phase 1.

==================================================

14. WITHDRAW APPLICATION

==================================================

Students can withdraw an application before the application deadline.

After withdrawal:

Status:

"Withdrawn"

Do not allow withdrawal after the drive's application deadline.

Do not allow a withdrawn application to create a duplicate application for the same drive unless the business logic explicitly supports reapplication. For Phase 1, keep it simple and prevent reapplication.

==================================================

15. ADMIN APPLICANT MANAGEMENT

==================================================

For each placement drive, admin should be able to see an applicant management screen.

Display:

- Student name

- Enrollment number

- Branch

- Graduation year

- CGPA

- Backlogs

- Application date

- Eligibility

- Application status

- Resume/action

Provide:

- Search

- Sort

- Filter

- Status filtering

- Branch filtering

- Batch filtering

- Eligibility filtering

- Student/application detail view

- Resume download

- Status update

Example summary cards:

Total Applications

Eligible

Shortlisted

Selected

Rejected

==================================================

16. STUDENT IMPORT

==================================================

Admin should be able to import students in bulk using CSV.

Example columns:

Name

Enrollment Number

Email

Branch

Course

CGPA

10th Percentage

12th Percentage

Graduation Year

Active Backlogs

Total Backlogs

Provide:

- CSV upload

- Basic validation

- Preview before import

- Successful import count

- Failed row count

- Error information for invalid rows

Example:

"1,248 students imported successfully"

This feature is important because a real Placement Cell may already have student data and should not manually create every student.

If full automated account creation is complex, keep the imported student records separate from authentication accounts and allow students to activate/complete their account later. Do not block the core product because of this.

==================================================

17. ANNOUNCEMENTS

==================================================

Admin can create announcements.

Fields:

- Title

- Content

- Type/category

- Publish date

- Optional expiry date

- Audience

Audience options:

- All students

- Specific placement drive applicants

- Specific branch

- Specific graduation year/batch

Example:

"Google PPT has been postponed to 10:00 AM tomorrow."

Audience:

Google Drive Applicants

Students should see relevant announcements on their dashboard and announcements page.

==================================================

18. SEARCH, FILTERING AND SORTING

==================================================

Implement useful search/filter controls.

STUDENTS:

- Name

- Enrollment number

- Branch

- Batch/graduation year

- CGPA

COMPANIES:

- Company name

- Industry

PLACEMENT DRIVES:

- Company

- Status

- Job type

- Graduation batch

- Deadline

APPLICATIONS:

- Student

- Company

- Drive

- Status

- Branch

- Batch

Use debounced search where appropriate.

Keep filters easy to use and visually clean.

==================================================

19. ADMIN DASHBOARD

==================================================

Create a professional admin dashboard.

Prioritize useful placement management information.

Top summary metrics:

- Total Students

- Active Placement Drives

- Total Applications

- Selected Students

Also include:

ACTIVE PLACEMENT DRIVES

Show:

- Company

- Position

- Applications

- Deadline

- Status

UPCOMING DEADLINES

RECENT APPLICATIONS

PLACEMENT OVERVIEW

Basic statistics/charts are welcome, but do not create meaningless analytics.

The dashboard should feel like an actual Placement Cell control center.

==================================================

20. STUDENT DASHBOARD

==================================================

Create a student-focused dashboard.

Top metrics:

- Profile Completion

- Eligible Drives

- Applications

- Shortlisted

- Selected

Sections:

ELIGIBLE OPPORTUNITIES

Show relevant placement drives.

MY APPLICATIONS

Show current application status.

ANNOUNCEMENTS

Show relevant announcements.

The student dashboard should prioritize actionable information rather than analytics.

==================================================

21. PAGES / INFORMATION ARCHITECTURE

==================================================

Create the following page structure.

Do not treat this as a strict pixel-level UI specification. Use professional UX judgment to design each page.

PUBLIC / AUTH:

- Login

- Student Registration

- Admin Login / appropriate admin authentication flow

There is NO marketing landing page in Phase 1.

The login page itself should act as the visual entry point for HirePhoenix and should look polished and professional.

STUDENT:

- Student Dashboard

- My Profile

- Placement Drives

- Placement Drive Details

- Application Form

- My Applications

- Application Details

- Announcements

- Settings

ADMIN:

- Admin Dashboard

- Students

- Student Details

- Import Students

- Companies

- Company Details

- Placement Drives

- Create Placement Drive

- Placement Drive Details

- Eligibility Builder

- Dynamic Application Form Builder

- Applicants

- Application Details

- Announcements

- Reports / Basic Statistics

- Organization Settings

- Admin Settings

Use appropriate nested routes and dialogs/drawers where they improve UX.

For complex creation workflows such as creating a placement drive, use a clear multi-step or tabbed workflow rather than an overwhelming single form.

==================================================

22. NAVIGATION

==================================================

ADMIN SIDEBAR:

Dashboard

Students

Companies

Placement Drives

Applications

Announcements

Reports

Settings

STUDENT SIDEBAR:

Dashboard

My Profile

Placement Drives

My Applications

Announcements

Settings

Use role-specific navigation.

Do not expose admin links to students.

Include:

- Active navigation state

- User profile menu

- Logout

- Notification indicator where appropriate

- Responsive/mobile navigation

==================================================

23. DATA MODEL / CORE ENTITIES

==================================================

Create a coherent persistent data model around these entities.

CORE:

- Organization

- User

- Student

- Admin

- Company

- Placement Drive

- Eligibility Rule

- Application Form

- Application Form Field

- Application

- Application Response

- Announcement

- Recruitment Stage

- Document/Resume

Relationships:

Organization

→ has many Users

→ has many Students

→ has many Admins

→ has many Companies

→ has many Placement Drives

→ has many Announcements

Company

→ belongs to Organization

→ has many Placement Drives

Placement Drive

→ belongs to Organization

→ belongs to Company

→ has many Eligibility Rules

→ has one Application Form

→ has many Recruitment Stages

→ has many Applications

Student

→ belongs to Organization

→ has one profile

→ has many Applications

→ has documents

Application

→ belongs to Student

→ belongs to Placement Drive

→ contains dynamic form responses

→ has status

Announcement

→ belongs to Organization

→ has an audience/scope

Design the underlying data relationships cleanly so that the system is not dependent on hardcoded demo objects.

Use real persisted data for CRUD operations.

==================================================

24. AUTHENTICATION AND AUTHORIZATION

==================================================

Implement actual authentication.

Users should be able to log in securely.

Support at least:

- Email/password authentication

- Logout

- Session persistence

- Protected routes

Use role-based authorization.

ADMIN:

Can access admin resources belonging to their organization.

STUDENT:

Can access only their own profile, applications, relevant announcements, and public placement-drive information within their organization.

Students must never be able to:

- Modify companies

- Modify drives

- Modify eligibility rules

- Modify other students

- Modify applications belonging to other students

- Access admin dashboards

Enforce authorization on the backend/data layer, not only by hiding UI buttons.

==================================================

25. VALIDATION AND BUSINESS RULES

==================================================

Implement important validation.

Student:

- Required profile fields

- Valid email

- Valid phone where appropriate

- Valid URLs

- Valid academic numbers/ranges

- Valid graduation year

Company:

- Required company name

- Valid website/email where applicable

Placement Drive:

- Required company

- Required position

- Valid dates

- Deadline cannot be before opening date

- Valid compensation values

- At least one eligibility rule where appropriate

- Applications cannot open after deadline

Application:

- Required dynamic fields

- Field-level validation

- Duplicate application prevention

- Eligibility check before submission

- Deadline enforcement

General:

- Confirmation before destructive actions

- Useful error messages

- Loading states

- Empty states

- Success feedback

- Failure feedback

==================================================

26. FILE / RESUME HANDLING

==================================================

Students should be able to upload resumes.

Provide:

- File picker

- File validation

- Upload progress/loading state

- Resume preview/download where supported

- Replace existing resume

Admin should be able to access the resume of applicants they are authorized to view.

Do not build an AI resume parser yet.

==================================================

27. DEMO DATA + REAL FUNCTIONALITY

==================================================

This is extremely important.

The application must NOT be a static mockup.

All important CRUD operations should work against persistent data.

At the same time, seed the application with realistic fictional demo data so the dashboard is populated immediately.

Create fictional demo data such as:

ORGANIZATION:

"Northstar Institute of Technology"

STUDENTS:

Around 100 realistic fictional students.

Use varied:

- Branches

- CGPAs

- 10th/12th percentages

- Graduation years

- Backlogs

- Skills

- Profile completion levels

COMPANIES:

At least 8 fictional companies.

Examples:

- NovaTech

- Vertex Labs

- CloudForge

- DataSphere

- Nexora Systems

- BlueOrbit

- QuantumWorks

- Elevate Digital

PLACEMENT DRIVES:

Create 5–6 realistic drives with different:

- Companies

- Job roles

- Compensation

- Locations

- Eligibility rules

- Deadlines

- Recruitment stages

- Statuses

APPLICATIONS:

Create realistic applications with different statuses:

- Applied

- Under Review

- Shortlisted

- Selected

- Rejected

- Withdrawn

ANNOUNCEMENTS:

Create several realistic announcements.

IMPORTANT:

Demo data should be stored using the same data model used by the real application.

Do not create fake frontend-only arrays as the primary source of dashboard data.

The application must still work when demo data is modified, created, or deleted.

==================================================

28. UX STATES

==================================================

Every major page should account for:

- Loading

- Empty

- Error

- Success

- No search results

- No eligible drives

- No applications

- No applicants

- No announcements

Use polished empty-state messaging.

Example:

"No eligible placement drives yet"

"Complete your profile to improve eligibility matching."

==================================================

29. RESPONSIVE DESIGN

==================================================

The application must be responsive.

Prioritize:

- Desktop admin experience

- Tablet

- Mobile student experience

Admin tables should remain usable on smaller screens through responsive layouts, horizontal scrolling, or appropriate mobile presentation.

Do not simply shrink desktop layouts.

==================================================

30. VISUAL DESIGN SYSTEM

==================================================

Use a modern enterprise SaaS visual language.

Brand:

HirePhoenix

Theme:

Midnight Indigo + Electric Blue

Color direction:

Primary:

Deep Indigo / Violet

approximately #4F46E5

Primary hover:

approximately #4338CA

Secondary accent:

Blue

approximately #2563EB

Background:

Very light cool gray / off-white

approximately #F8FAFC

Cards:

White

#FFFFFF

Main text:

Dark slate

approximately #0F172A

Secondary text:

Slate

approximately #64748B

Borders:

approximately #E2E8F0

Semantic:

Success: Green

Warning: Amber

Danger: Red

Typography:

Use a clean professional sans-serif such as Inter.

DESIGN PRINCIPLES:

- Premium enterprise SaaS

- Modern HR/recruitment platform

- Clean

- Professional

- Spacious

- Strong visual hierarchy

- Accessible contrast

- Subtle borders

- Restrained shadows

- Consistent rounded corners

- Clear status badges

- Professional tables

- Clear forms

- Strong but restrained primary actions

AVOID:

- Excessive gradients

- Neon colors

- Heavy glassmorphism

- Giant animations

- Cartoon illustrations

- Generic AI visual patterns

- Purple blobs

- Excessive decorative elements

- Excessive shadows

- Overly rounded childish UI

The evaluator should feel:

"This could actually be deployed by a university."

==================================================

31. BRANDING / LOGO

==================================================

Do NOT spend significant effort generating a custom logo.

For now:

- Use a simple HirePhoenix wordmark

- Use a minimal placeholder/icon

- Keep the icon consistent in the sidebar and login screen

- Do not generate elaborate phoenix artwork

The visual identity should come primarily from the UI system and typography.

We can replace the placeholder logo later.

==================================================

32. LOGIN PAGE

==================================================

There is no separate marketing landing page in Phase 1.

Make the login experience visually polished enough to serve as the entry point.

Create a professional HirePhoenix login page with:

- HirePhoenix wordmark/placeholder icon

- Short product tagline

- Email

- Password

- Remember/session behavior where appropriate

- Login

- Registration option for students

- Admin authentication path where appropriate

- Forgot password if supported

The page should communicate the product without becoming a marketing landing page.

Suggested tagline:

"One platform for smarter campus placements."

Do not overdesign this page.

==================================================

33. REPORTS

==================================================

Phase 1 reports should remain basic.

Provide useful statistics such as:

- Total students

- Active drives

- Applications

- Selected students

- Applications by drive

- Applications by status

- Basic branch-wise placement statistics

Use charts only when they provide useful information.

Do not build an advanced analytics system.

==================================================

34. SECURITY / DATA ISOLATION

==================================================

Treat security as a functional requirement.

Data access must respect:

- Authentication

- User role

- Organization

A student must not be able to query or modify another student's private application/profile data.

An admin should only manage data belonging to their organization.

Do not rely solely on client-side route protection.

==================================================

35. CODE / ARCHITECTURE QUALITY

==================================================

Even though this is being generated quickly, keep the application maintainable.

Use:

- Reusable UI components

- Reusable form components

- Reusable table components

- Clear domain separation

- Consistent naming

- Centralized validation where appropriate

- No unnecessary duplicated code

The dynamic application form should be genuinely reusable across different placement drives.

The eligibility system should be reusable across different drives.

Do not hardcode logic specifically for individual companies.

==================================================

36. IMPORTANT PRODUCT PRINCIPLE

==================================================

HirePhoenix must feel like a real product, not a collection of pages.

Everything should connect.

Example:

Admin creates Company

↓

Admin creates Placement Drive for Company

↓

Admin defines Eligibility Rules

↓

Admin creates Dynamic Application Form

↓

Admin publishes Drive

↓

Student sees Drive

↓

System evaluates Student Eligibility

↓

Eligible Student applies

↓

Application is stored

↓

Admin sees Applicant

↓

Admin changes Application Status

↓

Student sees updated status

This end-to-end flow must work.

==================================================

37. IMPLEMENTATION PRIORITY

==================================================

Prioritize in this order:

PRIORITY 1:

- Authentication

- Role-based access

- Organization

- Student profile

- Persistent database

PRIORITY 2:

- Company management

- Placement drive management

- Drive lifecycle

PRIORITY 3:

- Eligibility rule builder

- Automatic eligibility evaluation

PRIORITY 4:

- Dynamic application form builder

- Student application workflow

PRIORITY 5:

- Applicant management

- Status workflow

- Announcements

PRIORITY 6:

- Dashboard statistics

- Reports

- CSV import

- UX polish

If any feature is too complex to complete immediately, do not replace it with a fake/static implementation. Build the underlying foundation correctly and keep the UI functional.

==================================================

38. DO NOT OVERBUILD

==================================================

This is Phase 1.

Do not introduce:

- Microservices

- Complex enterprise architecture

- Unnecessary integrations

- AI features

- Recruiter portals

- Test engines

- External messaging integrations

Keep the architecture appropriate for a college project MVP while maintaining good structure.

==================================================

39. FINAL ACCEPTANCE CRITERIA

==================================================

The Phase 1 application should allow us to demonstrate this scenario end-to-end:

1. Login as an admin.

2. View the admin dashboard.

3. View/manage students.

4. Import students through CSV.

5. Create a company.

6. Create a placement drive.

7. Define eligibility rules.

8. Create a dynamic application form.

9. Publish the drive.

10. Login as a student.

11. Complete/view the student profile.

12. See available placement drives.

13. Open the placement drive.

14. See whether the student is eligible.

15. See eligibility reasons if not eligible.

16. Complete the dynamic application form.

17. Submit the application.

18. Prevent duplicate application.

19. Login/view as admin.

20. See the new applicant.

21. Filter/search applicants.

22. View the student's application.

23. Update application status to Shortlisted/Selected/Rejected.

24. Login/view as student.

25. See the updated application status.

26. View relevant announcements.

This complete workflow is more important than decorative features.

==================================================

40. FINAL INSTRUCTION

==================================================

Build HirePhoenix as a polished, functional Phase 1 product based on this specification.

Do not reinterpret the product as a generic job board.

Do not create a marketing website.

Do not hardcode a specific college.

Do not make the application only a frontend mockup.

Prioritize:

1. Working authentication

2. Persistent data

3. Role-based access

4. Correct relationships between entities

5. Eligibility logic

6. Dynamic forms

7. Application workflow

8. Real CRUD operations

9. Realistic demo data

10. Professional enterprise UI

Use your design judgment for the exact layout and component composition while respecting all required pages, workflows, entities, and business rules above.

Start by establishing the complete Phase 1 foundation and then implement the highest-priority workflows end-to-end.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b89f78ed-b9d8-4e7b-9473-9862aebd7e8d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
