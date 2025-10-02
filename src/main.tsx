import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ClerkProvider } from "@clerk/clerk-react";
  import { BrowserRouter } from "react-router-dom";
import React from "react";

const PUBLISHABLE_KEY = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY as string;

  createRoot(document.getElementById("root")!).render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={{
      elements: {
        footer: "hidden"
      }
    }}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  );