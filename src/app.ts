import express from "express";
import { redisClient } from "./redis";

const app = express();
const cacheKeyPrefix = "lab-backend:cache:";

app.use(express.json());

app.get("/health", (_req, res) => {
  if (!redisClient.isReady) {
    res.status(503).json({ status: "error", cache: "unavailable" });
    return;
  }

  res.status(200).json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.json({ message: "CI/CD Lab API" });
});

app.get("/cache/:key", async (req, res) => {
  try {
    const serializedValue = await redisClient.get(`${cacheKeyPrefix}${req.params.key}`);

    if (serializedValue === null) {
      res.status(404).json({ error: "cache_key_not_found" });
      return;
    }

    res.json({ key: req.params.key, value: JSON.parse(serializedValue) });
  } catch (error) {
    console.error("Redis cache read failed:", error);
    res.status(503).json({ error: "cache_unavailable" });
  }
});

app.put("/cache/:key", async (req, res) => {
  const body = req.body as { value?: unknown; ttlSeconds?: unknown } | null;
  if (!body || typeof body !== "object" || !Object.hasOwn(body, "value")) {
    res.status(400).json({ error: "value_required" });
    return;
  }

  const ttlSeconds = body.ttlSeconds;
  if (ttlSeconds !== undefined && (!Number.isInteger(ttlSeconds) || Number(ttlSeconds) <= 0)) {
    res.status(400).json({ error: "ttlSeconds_must_be_a_positive_integer" });
    return;
  }

  try {
    const serializedValue = JSON.stringify(body.value);
    if (serializedValue === undefined) {
      res.status(400).json({ error: "value_must_be_json_serializable" });
      return;
    }

    if (ttlSeconds === undefined) {
      await redisClient.set(`${cacheKeyPrefix}${req.params.key}`, serializedValue);
    } else {
      await redisClient.set(`${cacheKeyPrefix}${req.params.key}`, serializedValue, {
        EX: Number(ttlSeconds),
      });
    }

    res.status(201).json({ key: req.params.key, value: body.value });
  } catch (error) {
    console.error("Redis cache write failed:", error);
    res.status(503).json({ error: "cache_unavailable" });
  }
});

app.delete("/cache/:key", async (req, res) => {
  try {
    const deleted = await redisClient.del(`${cacheKeyPrefix}${req.params.key}`);

    if (deleted === 0) {
      res.status(404).json({ error: "cache_key_not_found" });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error("Redis cache delete failed:", error);
    res.status(503).json({ error: "cache_unavailable" });
  }
});

export default app;
