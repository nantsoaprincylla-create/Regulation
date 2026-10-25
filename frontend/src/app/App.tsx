import { RouterProvider } from "react-router"
import { AuthProvider } from "../lib/AuthProvider"
import { ToastProvider } from "../components/ui"
import { router } from "./routes"

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}
