import { createBrowserRouter, Navigate, type RouteObject } from "react-router"
import PublicLayout from "../components/PublicLayout"
import AppLayout from "../components/AppLayout"
import { RequireSpace } from "../lib/RequireSpace"
import type { Space } from "../lib/auth-context"

import HomePage from "../pages/public/Home"
import LoginPage from "../pages/public/LoginPage"
import { PublicationDetailPage, PublicationsPage } from "../pages/public/Publications"
import { SurveyFormPage, SurveysPage } from "../pages/public/Surveys"
import QualityPage from "../pages/public/Quality"
import ComplaintPage from "../pages/public/Complaint"
import { AboutPage, AccessibilityPage, NotFoundPage, PrivacyPage } from "../pages/public/Static"

import Dashboard from "../pages/shared/Dashboard"
import { NotificationsPage } from "../pages/shared/Notifications"
import { AuditPage } from "../pages/shared/Audit"
import { SettingsPage } from "../pages/shared/Settings"
import { SurveysManage } from "../pages/shared/SurveysManage"
import { PublicationsManage } from "../pages/shared/PublicationsManage"
import { CommentsModeration } from "../pages/shared/CommentsModeration"
import { DatasetsPage } from "../pages/shared/Datasets"
import { SubmissionsPage } from "../pages/shared/Submissions"
import { ScrapingPage } from "../pages/shared/Scraping"
import { CaseDetail, CasesList } from "../pages/shared/Cases"
import { ComplaintsPage } from "../pages/shared/Complaints"
import { PredictionsPage } from "../pages/regulation/Predictions"
import { RatingsPage } from "../pages/regulation/Ratings"
import { QosPage } from "../pages/regulation/Qos"
import { UsersPage } from "../pages/admin/Users"

const common: RouteObject[] = [
  { path: "notifications", Component: NotificationsPage },
  { path: "historique", Component: AuditPage },
  { path: "parametres", Component: SettingsPage },
]

function space(path: string, key: Space, children: RouteObject[]): RouteObject {
  return {
    path,
    element: (
      <RequireSpace spaces={[key]}>
        <AppLayout space={key} />
      </RequireSpace>
    ),
    children: [...children, ...common, { path: "*", element: <Navigate to={path} replace /> }],
  }
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: PublicLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "publications", Component: PublicationsPage },
      { path: "publications/:slug", Component: PublicationDetailPage },
      { path: "sondages", Component: SurveysPage },
      { path: "sondages/:id", Component: SurveyFormPage },
      { path: "qualite", Component: QualityPage },
      { path: "reclamation", Component: ComplaintPage },
      { path: "a-propos", Component: AboutPage },
      { path: "confidentialite", Component: PrivacyPage },
      { path: "accessibilite", Component: AccessibilityPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
  { path: "/connexion", Component: LoginPage },
  space("/regulation", "regulation", [
    { index: true, Component: Dashboard },
    { path: "operateurs", Component: RatingsPage },
    { path: "indicateurs", Component: QosPage },
    { path: "soumissions", Component: SubmissionsPage },
    { path: "datasets", Component: DatasetsPage },
    { path: "scraping", Component: ScrapingPage },
    { path: "predictions", element: <PredictionsPage /> },
    { path: "modeles", element: <PredictionsPage initial="models" /> },
    { path: "dossiers", element: <CasesList base="/regulation" /> },
    { path: "dossiers/:id", element: <CaseDetail base="/regulation" /> },
    { path: "reclamations", Component: ComplaintsPage },
  ]),
  space("/operateur", "operator", [
    { index: true, Component: Dashboard },
    { path: "sondages", Component: SurveysManage },
    { path: "publications", Component: PublicationsManage },
    { path: "commentaires", Component: CommentsModeration },
    { path: "datasets", Component: DatasetsPage },
    { path: "soumissions", Component: SubmissionsPage },
    { path: "scraping", Component: ScrapingPage },
    { path: "dossiers", element: <CasesList base="/operateur" /> },
    { path: "dossiers/:id", element: <CaseDetail base="/operateur" /> },
    { path: "reclamations", Component: ComplaintsPage },
  ]),
  space("/publications-admin", "publications", [
    { index: true, Component: Dashboard },
    { path: "contenus", Component: PublicationsManage },
    { path: "sondages", Component: SurveysManage },
    { path: "commentaires", Component: CommentsModeration },
  ]),
  space("/administration", "admin", [{ index: true, Component: UsersPage }]),
])
