# VCSA Web Redeploy + Modulos y Links

Fecha: 2026-04-06

Este documento cubre unicamente el proyecto web/API. La app mobile en `apps/mobile` queda fuera de este redeploy.

## Estado del redeploy

Redeploy ejecutado con Docker Compose:

```bash
docker compose up -d --build
docker compose ps
curl -s http://localhost:8001/api/health
curl -I http://localhost
```

Resultado validado:

- Frontend: `http://localhost` -> `200 OK`
- Backend: `http://localhost:8001/api/health` -> `healthy`
- API Docs: `http://localhost:8001/docs`
- MongoDB: contenedor `vcsa-mongodb` en estado `healthy`

## Base URLs

- Web: [http://localhost](http://localhost)
- API: [http://localhost:8001](http://localhost:8001)
- API Docs: [http://localhost:8001/docs](http://localhost:8001/docs)
- Dashboard visual de flujos: [http://localhost/flows-dashboard.html](http://localhost/flows-dashboard.html)
- Archivo fuente del dashboard visual: [flows-dashboard.html](/Users/newproject/Documents/GitHub/vcsAcademy/frontend/public/flows-dashboard.html)

## Modulos frontend

| Modulo | Estatus | Carpeta principal | Link |
|---|---|---|---|
| Landing | Funcional | `frontend/src/pages/LandingPage.jsx` | `http://localhost/` |
| Login | Funcional | `frontend/src/pages/LoginPage.jsx` | `http://localhost/login` |
| Registro | Funcional | `frontend/src/pages/RegisterPage.jsx` | `http://localhost/register` |
| Proposal | Funcional | `frontend/src/pages/ProposalPage.jsx` | `http://localhost/proposal` |
| Dashboard principal | Funcional | `frontend/src/pages/DashboardPage.jsx` | `http://localhost/dashboard` |
| Top Producer Path | Funcional | `frontend/src/pages/TopProducerPath.jsx` | `http://localhost/path` |
| Track detail | Funcional con ruta dinamica | `frontend/src/pages/TrackDetailPage.jsx` | `http://localhost/path/track/:trackId` |
| Deal Breakdowns | Funcional | `frontend/src/pages/DealBreakdownsPage.jsx` | `http://localhost/path/breakdowns` |
| Quick Wins | Funcional | `frontend/src/pages/QuickWinsPage.jsx` | `http://localhost/path/quickwins` |
| Courses legacy | Funcional | `frontend/src/pages/CoursesPage.jsx` | `http://localhost/courses` |
| Course detail | Funcional parcial | `frontend/src/pages/CourseDetailPage.jsx` | `http://localhost/courses/:courseId` |
| Training Library | Parcial | `frontend/src/pages/TrainingLibraryPage.jsx` | `http://localhost/training-library` |
| Community | Funcional | `frontend/src/pages/CommunityPage.jsx` | `http://localhost/community` |
| Community Feed | Parcial con mock data | `frontend/src/pages/CommunityFeedPage.jsx` | `http://localhost/community/feed` |
| Events | Funcional parcial | `frontend/src/pages/EventsPage.jsx` | `http://localhost/events` |
| Coaching | Parcial con fallback mock | `frontend/src/pages/CoachingPage.jsx` | `http://localhost/coaching` |
| Masterclasses | Parcial | `frontend/src/pages/MasterclassesPage.jsx` | `http://localhost/masterclasses` |
| Resources | Funcional | `frontend/src/pages/ResourcesPage.jsx` | `http://localhost/resources` |
| Membership | Funcional | `frontend/src/pages/MembershipPage.jsx` | `http://localhost/membership` |
| Payment Success | Funcional | `frontend/src/pages/PaymentSuccessPage.jsx` | `http://localhost/payment/success` |
| Profile | Funcional | `frontend/src/pages/ProfilePage.jsx` | `http://localhost/profile` |
| Goal Sheet | Parcial funcional | `frontend/src/pages/GoalSheetPage.jsx` | `http://localhost/goals` |
| Financial Planning | Parcial | `frontend/src/pages/FinancialPlanningPage.jsx` | `http://localhost/financial` |
| Daily Performance | Parcial | `frontend/src/pages/DailyPerformancePage.jsx` | `http://localhost/daily-performance` |
| Analytics | Parcial | `frontend/src/pages/AnalyticsPage.jsx` | `http://localhost/analytics` |
| Strategy Planning | Parcial | `frontend/src/pages/StrategyPlanningPage.jsx` | `http://localhost/strategy` |
| Admin simple | Funcional parcial | `frontend/src/pages/AdminSimplePage.jsx` | `http://localhost/admin` |
| Admin branding | Parcial | `frontend/src/pages/BrandingConfigPage.jsx` | `http://localhost/admin/branding` |
| Manager Dashboard | Parcial funcional | `frontend/src/pages/ManagerDashboardPage.jsx` | `http://localhost/manager` |
| Director Dashboard | Parcial/prototipo | `frontend/src/pages/DirectorDashboardPage.jsx` | `http://localhost/director/dashboard` |
| Onboarding wizard | Parcial | `frontend/src/pages/OnboardingWizard.jsx` | `http://localhost/onboarding` |
| Onboarding por organizacion | Parcial | `frontend/src/pages/OnboardingWizard.jsx` | `http://localhost/onboarding/:orgId` |
| Student onboarding | Parcial | `frontend/src/pages/StudentOnboardingPage.jsx` | `http://localhost/onboarding/student` |
| Create School | Prototipo funcional con mock mode | `frontend/src/pages/CreateSchoolPage.jsx` | `http://localhost/onboarding/create-school` |
| Interview builder | Prototipo funcional | `frontend/src/pages/InterviewPage.jsx` | `http://localhost/onboarding/interview` |
| Generate school | Prototipo funcional | `frontend/src/pages/GeneratePage.jsx` | `http://localhost/onboarding/generate` |
| Review school | Prototipo funcional | `frontend/src/pages/ReviewPage.jsx` | `http://localhost/onboarding/review` |
| Branding customization | Prototipo funcional | `frontend/src/pages/BrandingCustomizationPage.jsx` | `http://localhost/onboarding/branding` |
| School dashboard | Prototipo con mock data | `frontend/src/pages/SchoolDashboardPage.jsx` | `http://localhost/dashboard/:schoolId` |
| Courses manage | Prototipo con mock data | `frontend/src/pages/CoursesManagePage.jsx` | `http://localhost/courses/manage` |
| Lesson editor | Parcial con mock lesson | `frontend/src/pages/LessonEditorPage.jsx` | `http://localhost/lessons/:lessonId/edit` |
| New lesson editor | Parcial | `frontend/src/pages/LessonEditorPage.jsx` | `http://localhost/lessons/new/edit` |
| Video creator | Prototipo | `frontend/src/pages/VideoCreatorPage.jsx` | `http://localhost/lessons/:lessonId/video-creator` |
| Content upload | Prototipo con AI mock | `frontend/src/pages/ContentUploadPage.jsx` | `http://localhost/content/upload` |

## Submodulos internos sin ruta propia

Estos modulos viven dentro de una pantalla ya enlazada:

| Submodulo | Estatus | Carpeta principal | Link de acceso |
|---|---|---|---|
| Team Statistics | Parcial funcional | `frontend/src/components/admin/TeamStatsDashboard.jsx` | `http://localhost/admin` |
| Knowledge Base | Parcial funcional | `frontend/src/components/admin/KnowledgeManagement.jsx` | `http://localhost/admin` |
| File Management | Parcial funcional | `frontend/src/components/admin/FileManagement.jsx` | `http://localhost/admin` |
| AI Configuration | Parcial | `frontend/src/components/ai` | `http://localhost/admin` |
| AI Assistant Button | Experimental | `frontend/src/components/ai/AIAssistantButton.jsx` | `http://localhost/admin` |
| Onboarding steps | Parcial | `frontend/src/components/onboarding` | `http://localhost/onboarding` |
| Branding settings | Parcial | `frontend/src/components/settings` | `http://localhost/admin/branding` |
| Goal Sheet widgets | Parcial | `frontend/src/components/goalsheet` | `http://localhost/goals` |
| Financial widgets | Parcial | `frontend/src/components/financial` | `http://localhost/financial` |

## Modulos backend

| Modulo API | Estatus | Carpeta principal | Link / prefijo |
|---|---|---|---|
| Health check | Funcional | `backend/server.py` | `http://localhost:8001/api/health` |
| OpenAPI docs | Funcional | `backend/server.py` | `http://localhost:8001/docs` |
| Auth | Funcional | `backend/server.py` | `http://localhost:8001/api/auth/*` |
| Users | Funcional | `backend/server.py` | `http://localhost:8001/api/users/*` |
| Teams | Parcial funcional | `backend/server.py` | `http://localhost:8001/api/teams/*` |
| Courses / Lessons | Funcional | `backend/server.py` | `http://localhost:8001/api/courses/*` y `http://localhost:8001/api/lessons/*` |
| Community | Funcional | `backend/server.py` | `http://localhost:8001/api/community/*` |
| Events | Funcional | `backend/server.py` | `http://localhost:8001/api/events/*` |
| Resources | Funcional | `backend/server.py` | `http://localhost:8001/api/resources/*` |
| Admin | Funcional parcial | `backend/server.py` | `http://localhost:8001/api/admin/*` |
| Phase 1 Development | Funcional | `backend/phase1_routes.py` | `http://localhost:8001/api/development/*` |
| Organizations | Parcial | `backend/organization_routes.py` | `http://localhost:8001/api/organizations/*` |
| Branding | Parcial | `backend/branding_routes.py` | `http://localhost:8001/api/branding/*` |
| Goal Sheet | Parcial funcional | `backend/goal_sheet_routes.py` | `http://localhost:8001/api/goalsheet/*` |
| Financial Planning | Parcial | `backend/financial_routes.py` | `http://localhost:8001/api/financial/*` |
| AI Assistant Enhanced | Experimental | `backend/ai_assistant_enhanced.py` | `http://localhost:8001/api/ai-assistant/*` |
| Assistant routes | Experimental | `backend/claude_routes.py` | `http://localhost:8001/api/assistant/*` |
| Mobile API | Implementado pero fuera de este redeploy | `backend/mobile_routes.py` | `http://localhost:8001/mobile/*` |

## Carpetas clave del proyecto web

| Carpeta | Uso |
|---|---|
| `frontend/` | Aplicacion web React |
| `frontend/public/` | HTML, manifest y assets publicos |
| `frontend/src/pages/` | Pantallas del producto web |
| `frontend/src/components/` | Componentes reutilizables y modulos internos |
| `frontend/src/contexts/` | Contextos globales como auth, branding y organizacion |
| `backend/` | API FastAPI principal |
| `backend/models/` | Modelos de dominio |
| `backend/services/` | Servicios auxiliares |
| `backend/migrations/` | Scripts de migracion |
| `backend/tests/` | Tests backend |
| `docs/` | Documentacion operativa y de proyecto |

## Notas importantes

- `apps/mobile` no fue redeployado.
- Varias pantallas de `school builder`, `branding`, `content upload`, `courses manage` y partes de `AI` siguen en estado parcial o con mocks.
- El flujo principal web que hoy luce mas estable es: landing, auth, dashboard, `path`, cursos, resources, community, events y admin basico.
- El `docker-compose` actual no incluye un servicio mobile, por lo que el redeploy web no afecta la app Expo.
- Durante el redeploy aparecio una advertencia porque `STRIPE_API_KEY` no esta definida en el compose raiz.
- `docker-compose.yml` sigue usando la clave `version`, que Docker Compose actual ya ignora por obsoleta.
