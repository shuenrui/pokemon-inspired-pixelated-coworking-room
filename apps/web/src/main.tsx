import React from "react";
import ReactDOM from "react-dom/client";
import { CoworkingApp } from "./coworking/CoworkingApp";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CoworkingApp />
  </React.StrictMode>
);
