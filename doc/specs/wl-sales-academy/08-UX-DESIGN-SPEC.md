# UX, UI, and Design Implementation Spec

Version: 1.0  
Date: 2026-04-29

## 1. Design Goal

The product should feel like a premium AI sales coaching app, not a course catalog. The experience must be mobile-first, high-contrast, and designed for daily use by sales reps.

## 2. Visual Identity

Brand:

- WL logo in premium gold.
- Sales Academy wordmark.
- Smart Agent eye as signature AI motif.

Mood:

- Luxury.
- Futuristic.
- Professional.
- Structured.
- Performance-driven.

## 3. Color System

Core:

- Background: `#020506`
- Deep navy: `#061016`
- Card: `#071014`
- Elevated glass: `#0B171D`
- Primary gold: `#FFC21A`
- Gold highlight: `#FFE58A`
- Text: `#F8FAFC`
- Secondary: `#B9C0C8`
- Muted: `#7C8791`

Status:

- Success/live/completed: `#29E35F`
- Error/down/end: `#FF4141`
- Manager/T.O. optional: `#38BDF8`
- Locked/upcoming: `#5D6670`

## 4. Typography

Use platform-native premium sans-serif:

- iOS: SF Pro where available.
- Web/React Native fallback: Inter/system.

Rules:

- Screen titles: 28-42px mobile equivalent, weight 800-900.
- Card titles: 18-24px, weight 700-900.
- Body: 14-17px.
- Small labels: 11-13px, uppercase only when useful.
- Do not use negative letter spacing in implementation.
- Keep button text readable on small screens.

## 5. Components

### App Shell

- Safe area aware.
- Dark radial background.
- Optional gold particles/circuit accents.
- Bottom navigation for primary rep routes.

### Header

Required elements by screen:

- WL logo.
- Sales Academy title.
- Notification icon where relevant.
- User initials/avatar.
- Back chevron when in nested flow.

### Smart Agent Eye

Used on:

- Welcome.
- Smart Agent intro.
- Home Smart Agent card.
- GoalSheet hero/insight.

Visual:

- Gold glowing eye.
- Circular rings.
- Circuit lines.
- Subtle particles.

### Glass Card

Style:

- Dark translucent background.
- 1px white or gold border.
- 14-20px radius.
- Soft gold glow for active/important cards.

### CTA Button

Primary:

- Gold background.
- Black text.
- Icon when useful.
- Large touch target.

Secondary:

- Transparent/glass.
- Gold or white text.
- Thin border.

### Status Badge

States:

- Completed: green.
- Current/In Progress: gold.
- Locked/Upcoming: gray.
- Live/Speaking: green.
- Negative/down: red.

## 6. Required Mobile Screens

### Welcome / Onboarding

Content:

- WL Sales Academy logo.
- Headline.
- Subheadline.
- Smart Agent eye.
- Smart Agent pill.
- Feature cards.
- Enter Sales Academy CTA.
- Existing account link.

### Smart Agent Introduction

Content:

- Branding.
- AI coach visual.
- Four floating benefit cards.
- SMART AGENT headline.
- Subheadline.
- Three feature cards.
- Get Started CTA.

### Home Dashboard

Content:

- Header.
- Greeting.
- Smart Agent card.
- Ask input and prompt chips.
- Today's Progress.
- Quick Access.
- Bottom navigation.

### Top Producer Roadmap

Content:

- Progress ring.
- Current stage.
- 11-step Blueprint.
- Status badges.
- Action buttons.
- Today's Focus.

### Blueprint Step Detail

Content:

- Back link.
- Step label/title.
- Impact badge.
- Watch card.
- Script card.
- Audio card.
- Context/compliance note.
- Run Step CTA.

### Roleplay Live

Content:

- Live header.
- Scenario card.
- Coach/rep tiles.
- Audio indicators.
- Controls.
- Tip card.

### Smart GoalSheet

Content:

- Header.
- Date selector.
- Tour choices.
- Sales choices.
- Inputs/stepper.
- No-sale dropdown.
- Metrics.
- Follow-ups.
- Notes.
- Smart Agent Insight.
- Save CTA.

## 7. Navigation

Rep bottom nav:

- Home.
- Roadmap.
- GoalSheet.
- Roleplay Live.
- Resources.
- Support.

Rules:

- Active item uses gold.
- Inactive item uses light gray.
- Bottom nav should not obscure critical CTAs.

## 8. Empty, Loading, Error States

Every data-driven screen needs:

- Loading skeleton or spinner.
- Empty state with next action.
- Error state with retry.
- Unauthorized state for restricted content.

## 9. Accessibility

Requirements:

- Minimum contrast on dark backgrounds.
- Buttons have accessible names.
- Inputs have labels.
- Do not rely on color alone.
- Touch targets should be at least 44x44 points.
- Long text should wrap, not truncate critical content.

## 10. Design Source

Designs were also generated in Stitch project:

- Project ID: `7650035529271313866`
- Design direction: Aurelian Elite black-and-gold premium mobile style.

