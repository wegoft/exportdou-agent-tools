#!/usr/bin/env bash
set -euo pipefail

tool_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

diff -u "$tool_root/skills/exportdou/SKILL.md" "$tool_root/SKILL.md"

public_skill_path="${EXPORTDOU_PUBLIC_SKILL_PATH:-}"
if [[ -z "$public_skill_path" && -f "$tool_root/../exportdou/packages/web/public/SKILL.md" ]]; then
  public_skill_path="$tool_root/../exportdou/packages/web/public/SKILL.md"
fi

if [[ -n "$public_skill_path" ]]; then
  diff -u "$tool_root/skills/exportdou/SKILL.md" "$public_skill_path"
fi
