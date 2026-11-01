import express from "express";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(500).json({ status: "error" });
});

app.get("/", (_req, res) => {
  res.json({ message: "CI/CD Lab API" });
});

export default app;
