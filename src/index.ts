import app from "./app";
import prisma from "./utils/prisma";

const PORT = parseInt(process.env.PORT || "4000", 10);

const start = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");

    app.listen(PORT, () => {
      console.log(`✅ API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
