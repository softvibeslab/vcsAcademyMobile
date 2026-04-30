# Smart Agent Journey Wireframes

## Convenciones

- Mobile-first
- 1 CTA principal por pantalla
- Progreso visible siempre que sea posible
- Avatar solo en momentos clave
- Bottom nav minima cuando aplique

## 1. Welcome

### Objetivo

Presentar la promesa de la experiencia.

### Wireframe textual

- top:
  logo pequeño
- center:
  headline
  subheadline corto
  ilustracion o avatar
- bottom:
  primary CTA: Start journey
  secondary CTA: Sign in

## 2. Onboarding

### Objetivo

Explicar en 3 pasos maximos:

- progreso
- mision diaria
- streak

### Wireframe textual

- top:
  step indicator 1/3
  skip
- center:
  imagen o mini demo
  titulo
  copy corto
- bottom:
  next CTA

## 3. Goal Selection

### Objetivo

Hacer que el usuario elija para que entra.

### Wireframe textual

- header:
  "What do you want to improve first?"
- body:
  cards grandes
  - objection handling
  - confidence
  - closing
  - consistency
  - roadmap mastery
- bottom:
  continue CTA

## 4. Daily Goal Setup

### Objetivo

Definir meta diaria simple.

### Wireframe textual

- header:
  "Set your daily target"
- body:
  selector de tiempo o tareas
  - 1 quick mission
  - 2 focused missions
  - 5 minute minimum
- helper text:
  "You can change this later"
- bottom:
  save goal CTA

## 5. Avatar Selection

### Objetivo

Crear vinculo emocional rapido.

### Wireframe textual

- header:
  "Choose your guide"
- body:
  avatar carousel
  nombre temporal
  1 linea de personalidad
- controls:
  tone selector
  - calm
  - energetic
  - coach
- bottom:
  choose avatar CTA

## 6. Home

### Objetivo

Ser la pantalla mas clara y adictiva.

### Wireframe textual

- top bar:
  streak icon + number
  level badge
  profile avatar
- hero card:
  avatar bubble
  "Today's mission"
  mission title
  estimated time
  main CTA: Start now
- progress strip:
  XP today
  daily goal progress
  next unlock preview
- secondary modules:
  continue journey
  quick practice
  view rewards
- bottom nav:
  home
  journey
  progress
  profile

## 7. Journey Map

### Objetivo

Mostrar avance y desbloqueos.

### Wireframe textual

- top:
  current stage title
  progress percentage
- body:
  vertical map
  nodes:
  - completed
  - current
  - locked
  each node shows:
  title
  type
  small reward indicator
- sticky bottom:
  CTA for current node

## 8. Activity Screen

### Objetivo

Ejecutar la tarea corta con cero confusion.

### Wireframe textual

- top:
  progress bar
  close
- prompt card:
  mission title
  context
- action area:
  scenario / chat prompt / quick challenge
- feedback area:
  immediate response after action
- bottom:
  primary CTA: Continue

## 9. Result Screen

### Objetivo

Cerrar con claridad emocional.

### Wireframe textual

- top:
  result icon
- center:
  large title
  avatar reaction
  summary of what happened
- reward strip:
  XP earned
  streak impact
  progress to next level
- bottom:
  CTA 1: Claim reward
  CTA 2: Do one more

## 10. Reward Screen

### Objetivo

Celebrar y reforzar retorno.

### Wireframe textual

- hero:
  unlocked badge or item
  small confetti / celebration
- text:
  why user earned it
- preview:
  next milestone
- bottom:
  continue CTA

## 11. Profile

### Objetivo

Dar identidad y control basico.

### Wireframe textual

- top:
  avatar
  name
  level
- stats summary:
  current streak
  total XP
  missions completed
- modules:
  badges
  preferences
  settings

## 12. Progress and Stats

### Objetivo

Convertir progreso en orgullo.

### Wireframe textual

- tabs:
  week
  month
  all time
- cards:
  consistency
  missions completed
  average completion
  strongest category
  next milestone
- chart:
  streak or activity history

## 13. Streaks and Badges

### Objetivo

Hacer visible la consistencia.

### Wireframe textual

- header:
  current streak
  longest streak
- streak calendar:
  recent days
- badges grid:
  earned
  locked
- bottom:
  CTA to protect streak or continue today

## 14. Store / Personalization

### Objetivo

Ser opcional y ligera.

### Wireframe textual

- currency header
- avatar customization cards
- theme accents or cosmetic unlocks
- simple shop sections

Note:
This screen can be hidden in V1 if scope is tight.

## 15. Notifications and Reminders

### Objetivo

Configurar nudges sin ser invasivos.

### Wireframe textual

- reminder time
- habit goal
- streak reminder toggle
- comeback nudge toggle
- coaching event alerts toggle

## 16. Settings

### Objetivo

Control basico del sistema.

### Wireframe textual

- account
- preferences
- sound / haptics
- reminder settings
- avatar tone
- sign out

## 17. Habit Recovery

### Objetivo

Recuperar al usuario sin culpa excesiva.

### Wireframe textual

- top:
  soft alert
- center:
  avatar comeback message
  "Let's get back on track"
  simple explanation of what was missed
- offer:
  quick comeback mission
  estimated time under 2 minutes
- bottom:
  CTA: Recover today

## 18. Global components

## A. Avatar bubble

- small speech bubble
- max 1 short sentence
- contextual only

## B. Progress strip

- level
- XP
- next milestone

## C. Reward chip

- XP amount
- streak icon
- unlock icon

## D. CTA hierarchy

- one gold primary button
- one subtle secondary link
- avoid more than two competing actions

## 19. Motion suggestions

- subtle node unlock pulse
- quick XP counter animation
- streak flame pulse
- avatar bounce on celebration
- confetti only on major milestones

## 20. UX notes

- Home must answer "what do I do now?" in under 2 seconds
- Result screen must answer "did I win?" in under 1 second
- Map must answer "what is next?" immediately
- Recovery flow must reduce shame and increase restart probability
