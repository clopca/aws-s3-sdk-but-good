export async function setup() {
  const required = [
    "S3_TEST_BUCKET",
    "S3_TEST_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.log(
      `\n⚠️  Skipping E2E tests: missing env vars: ${missing.join(", ")}`,
    );
    console.log(
      "   Set these environment variables to run E2E tests against real S3.\n",
    );
    process.exit(0); // Exit cleanly — not a failure
  }

  console.log(
    `\n🧪 E2E tests running against bucket: ${process.env.S3_TEST_BUCKET}\n`,
  );
}

export async function teardown() {
  // Global cleanup if needed
}
