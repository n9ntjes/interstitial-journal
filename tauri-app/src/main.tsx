import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import LiveFeed from "./LiveFeed";
import "./themes.css";

const label = getCurrentWindow().label;
const isLiveFeedWindow =
  label === "live-feed" || /^live-feed-\d+$/.test(label);
const Root = isLiveFeedWindow ? LiveFeed : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
