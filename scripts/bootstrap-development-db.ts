import { spawnSync } from "node:child_process";

const localDatabaseUrl = "postgresql://mapo_readmate:mapo_readmate@localhost:5432/mapo_readmate";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runScript(script: string, environment: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(npmCommand, ["run", script], {
    cwd: process.cwd(),
    env: { ...process.env, ...environment, DATABASE_URL: localDatabaseUrl },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runScript("db:migrate");
runScript("db:seed-features");
runScript("db:seed-demo", { ALLOW_DEVELOPMENT_SEED: "true" });