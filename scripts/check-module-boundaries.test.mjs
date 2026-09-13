import assert from "node:assert/strict";
import test from "node:test";
import { findBoundaryViolations } from "./check-module-boundaries.mjs";

test("reports backend imports of another module outside its application interface", () => {
  const violations = findBoundaryViolations([
    {
      path: "backend/app/Modules/Dashboard/Application/BuildDashboard.php",
      contents: "use App\\Modules\\Finance\\Infrastructure\\AccountRepository;",
    },
  ]);

  assert.deepEqual(violations, [
    "backend/app/Modules/Dashboard/Application/BuildDashboard.php imports internal code from Finance",
  ]);
});

test("allows backend imports through another module application interface", () => {
  const violations = findBoundaryViolations([
    {
      path: "backend/app/Modules/Dashboard/Application/BuildDashboard.php",
      contents:
        "use App\\Modules\\Finance\\Application\\Queries\\MonthlyCashflow;",
    },
  ]);

  assert.deepEqual(violations, []);
});

test("reports frontend imports of another module internal file", () => {
  const violations = findBoundaryViolations([
    {
      path: "frontend/src/modules/dashboard/Today.tsx",
      contents: "import { amount } from '@/modules/finance/internal/amount'",
    },
  ]);

  assert.deepEqual(violations, [
    "frontend/src/modules/dashboard/Today.tsx imports internal code from finance",
  ]);
});
