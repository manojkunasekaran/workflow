import { BrowserRouter, Routes, Route } from "react-router-dom"
import AppLayout from "@/layouts/AppLayout"
import LandingPage from "@/features/landing/LandingPage"
import WorkflowJsonEditor from "@/features/workflow/WorkflowJsonEditor"
import ExecutionsList from "@/features/executions/ExecutionsList"
import ExecutionDetail from "@/features/executions/ExecutionDetail"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="workflows" element={<WorkflowJsonEditor />} />
          <Route path="executions" element={<ExecutionsList />} />
          <Route path="executions/:id" element={<ExecutionDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

