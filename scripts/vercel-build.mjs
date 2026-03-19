import { execSync } from "node:child_process";

const isProductionDeployment = process.env.VERCEL_ENV === "production";

if (isProductionDeployment) {
  console.log("Running tests before production build...");
  execSync("npm run test:ci", { stdio: "inherit" });
} else {
  console.log("Skipping tests on non-production deployment to reduce Vercel free-tier usage.");
}

execSync("next build", { stdio: "inherit" });
