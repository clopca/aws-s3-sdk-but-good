#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PACK_DIR="$(mktemp -d)"
trap 'rm -rf "$PACK_DIR"' EXIT

PACKAGES=(
  "@s3-good/shared"
  "@s3-good/core"
  "@s3-good/react"
  "@s3-good/browser"
)

echo "==> Packing publishable packages"
for package_dir in "${PACKAGES[@]}"; do
  echo " -> ${package_dir}"
  (cd "${ROOT_DIR}" && pnpm --filter "${package_dir}" pack --pack-destination "${PACK_DIR}" >/dev/null)
done

echo "==> Validating tarballs"
for tgz in "${PACK_DIR}"/*.tgz; do
  name="$(basename "${tgz}")"
  echo " -> ${name}"

  manifest="$(tar -xOf "${tgz}" package/package.json)"

  if echo "${manifest}" | grep -q "workspace:"; then
    echo "ERROR: ${name} contains unresolved workspace: dependency metadata"
    exit 1
  fi

  for required_file in "package/package.json" "package/README.md"; do
    if ! tar -tf "${tgz}" | grep -qx "${required_file}"; then
      echo "ERROR: ${name} is missing ${required_file}"
      exit 1
    fi
  done

  if ! tar -tf "${tgz}" | grep -q "^package/dist/"; then
    echo "ERROR: ${name} does not contain dist/ output"
    exit 1
  fi
done

echo "==> Running npm publish dry-run"
for package_dir in "${PACKAGES[@]}"; do
  echo " -> ${package_dir}"
  (cd "${ROOT_DIR}" && pnpm --filter "${package_dir}" publish --dry-run --no-git-checks >/dev/null)
done

echo "Release readiness checks passed."
