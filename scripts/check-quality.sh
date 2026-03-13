#!/usr/bin/env bash
set -e

echo "Running quality checks..."
echo ""

echo "1/3 Checking formatting..."
pnpm run fmt:check

echo ""
echo "2/3 Running linter..."
pnpm run lint

echo ""
echo "3/3 Running type checker..."
pnpm run typecheck

echo ""
echo "✅ All quality checks passed!"
