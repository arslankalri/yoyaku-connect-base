# NAGI AI Foundation

Build a production-quality SaaS web application called Yoyaku AI (予約AI).

Yoyaku AI is an AI receptionist platform for Japanese appointment-based businesses, initially targeting hair salons, beauty salons, nail salons, clinics, and similar businesses.

This is the FIRST development phase. Build only the application foundation. Do not build the AI receptionist or phone system yet.

LANGUAGE SYSTEM — IMPORTANT

The entire application must support English and Japanese.

Add a single global language toggle in the main navigation/header:

日本語 | English

The user can switch languages at any time.

Requirements:

Japanese and English must use the same UI and components.

Switching language must update the entire interface immediately.

Do not duplicate pages for each language.

Do not hard-code user-facing text directly into components.

Store UI translations in a centralized internationalization (i18n) system.

Use Japanese as the default language for new users.

Remember the user's selected language.

Business-entered content such as business names, service names, descriptions, staff names, and FAQ answers must NOT be automatically translated or overwritten when switching the UI language.

UI language and business/customer content language must remain separate.

Example:

Japanese:
「ダッシュボード」
「サービス」
「スタッフ」
「設定」

English:
"Dashboard"
"Services"
"Staff"
"Settings"

The language toggle should be available throughout the authenticated application.

1. AUTHENTICATION

Create:

Sign up

Login

Logout

Password reset

Protected dashboard

Use Supabase Authentication.

Support appropriate validation and error states.

2. BUSINESS SETUP

After signup, allow the business owner to enter:

店舗名 / Business name

電話番号 / Phone number

郵便番号 / Postal code

住所 / Address

Website

Timezone

Use Japanese and English labels according to the selected UI language.

Do not translate the actual business data when changing the UI language.

3. BUSINESS HOURS

Allow the business owner to configure:

Monday–Sunday

Open / Closed

Opening time

Closing time

Example Japanese UI:

月曜日
営業
09:00 – 18:00

Example English UI:

Monday
Open
09:00 – 18:00

4. SERVICES

Allow the owner to create, edit, and delete services.

Each service should contain:

Service name

Description

Price

Duration in minutes

Active / inactive

Important:

Business-entered service names and descriptions are stored exactly as entered.

Do not automatically translate them when the user switches between English and Japanese.

5. STAFF

Allow the owner to create, edit, and delete staff.

Each staff member should have:

Staff name

Services they provide

Working days

Working hours

Active / inactive

6. DASHBOARD

Create a clean professional SaaS dashboard showing:

Business name

Today's date

Business status

Today's business hours

Services

Staff

The dashboard should have proper:

Loading states

Empty states

Error states

Success states

Use realistic sample/demo data only where necessary.

Clearly distinguish demo data from real user-created data.

7. NAVIGATION

Create a persistent sidebar/navigation with:

ダッシュボード / Dashboard

AI受付 / AI Receptionist

予約 / Appointments

カレンダー / Calendar

顧客 / Customers

通話履歴 / Call History

サービス / Services

スタッフ / Staff

FAQ

分析 / Analytics

設定 / Settings

For features that are not implemented yet, display a simple:

「準備中」 / "Coming soon"

Do not create fake functionality for these sections.

8. DATABASE

Use Supabase PostgreSQL.

Create a proper multi-tenant database structure.

At minimum create:

users/authentication

businesses

business_hours

services

staff

staff_services

staff_working_hours

Every business must have isolated data.

Implement Row Level Security (RLS) so a business owner can only access their own business data.

Do not rely only on frontend filtering for security.

9. DESIGN

Create a premium Japanese B2B SaaS interface.

Visual style:

Modern

Minimal

Professional

High trust

Clean typography

Generous whitespace

Subtle borders

Subtle shadows

Consistent rounded components

Responsive

Desktop-first but fully usable on mobile

Avoid:

Excessive gradients

Cartoon graphics

Generic AI robot imagery

Cryptocurrency-style dashboards

Excessive glassmorphism

The product should look like a serious commercial SaaS product that could be sold to Japanese businesses.

10. RESPONSIVE DESIGN

The application must work properly on:

Desktop

Laptop

Tablet

Mobile

On smaller screens:

Convert the sidebar into an appropriate mobile navigation

Keep the language toggle accessible

Ensure forms and tables remain usable

Avoid horizontal overflow

11. DATA MODELING

Design the database so it can later support:

AI receptionist

Customers

Appointments

Google Calendar

Voice calls

Call history

LINE notifications

Multiple staff

Multiple businesses

Subscription plans

Do NOT implement those features yet.

The architecture should allow them to be added later without rebuilding the foundation.

IMPORTANT — DO NOT BUILD THESE YET

Do NOT implement:

AI chatbot

AI voice agent

Phone calling

Twilio

SIP

Google Calendar

LINE

SMS

Stripe

Call recording

AI knowledge base

Real appointment booking

External APIs

Do not add unnecessary features.

Do not redesign or expand the product beyond this specification.

FIRST PHASE SUCCESS CRITERIA

A business owner should be able to:

Sign up

Log in

Create their business profile

Set business hours

Add services

Add staff

Edit and delete their data

Switch between Japanese and English using one global toggle

Log out

Log back in and see their saved data

All of this must use real Supabase authentication and database storage.

After completing this phase, STOP and do not implement the next features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cf1080f6-f008-4520-bdf3-96e1829548a0).

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
