import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import SubmitPraxis from "./pages/SubmitPraxis";
import SubmissionDetail from "./pages/SubmissionDetail";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
        Loading...
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/tasks/:id" element={<TaskDetail />} />
      <Route path="/tasks/:id/submit" element={<SubmitPraxis />} />
      <Route path="/submissions/:id" element={<SubmissionDetail />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
