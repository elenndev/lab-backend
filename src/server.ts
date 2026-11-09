import app from "./app";
import { redisClient } from "./redis";

const port = Number(process.env.PORT ?? 3000);

async function startServer() {
  await redisClient.connect();

  app.listen(port, "0.0.0.0", () => {
    console.log(`API listening on port ${port}`);
  });
}

void startServer().catch((error: unknown) => {
  console.error("Failed to connect to Redis:", error);
  process.exit(1);
});
