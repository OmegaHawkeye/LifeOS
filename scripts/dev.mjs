import { spawn } from "node:child_process";
import process from "node:process";

const processes = [
  spawn("php", ["artisan", "serve"], {
    cwd: new URL("../backend", import.meta.url),
    stdio: "inherit",
  }),
  spawn("pnpm", ["dev"], {
    cwd: new URL("../frontend", import.meta.url),
    stdio: "inherit",
  }),
];

function stop() {
  for (const child of processes) {
    child.kill("SIGTERM");
  }
}

for (const child of processes) {
  child.on("error", (error) => {
    console.error(error.message);
    stop();
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      console.error(`Development process exited with code ${code}`);
      process.exitCode = code;
    } else if (signal && signal !== "SIGTERM") {
      console.error(`Development process exited after ${signal}`);
      process.exitCode = 1;
    }

    stop();
  });
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
