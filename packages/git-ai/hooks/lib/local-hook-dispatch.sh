# Shared local-hook dispatcher for git-ai's core.hooksPath hooks.
#
# Git supports exactly one core.hooksPath. When pi points that at this
# package, Git stops looking in the repository's own .git/hooks directory.
# These helpers make the git-ai hook directory act as a dispatcher so existing
# repo-local hooks (lefthook, husky, custom scripts, etc.) still run.

_git_ai_abs_path() {
	if command -v realpath >/dev/null 2>&1; then
		realpath "$1" 2>/dev/null && return 0
	fi

	local dir
	local base
	dir=$(dirname "$1")
	base=$(basename "$1")
	(
		cd "$dir" 2>/dev/null && printf '%s/%s\n' "$(pwd -P)" "$base"
	)
}

_git_ai_print_git_hooks_dir() {
	local git_dir="$1"
	case "$git_dir" in
		/*) printf '%s/hooks\n' "$git_dir" ;;
		*) printf '%s/hooks\n' "$(_git_ai_abs_path "$git_dir")" ;;
	esac
}

_git_ai_git_hooks_dir() {
	if [ -n "${PI_REAL_HOOKS_DIR:-}" ]; then
		_git_ai_abs_path "$PI_REAL_HOOKS_DIR"
		return $?
	fi

	local git_dir
	if git_dir=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null); then
		printf '%s/hooks\n' "$git_dir"
		return 0
	fi

	if git_dir=$(git rev-parse --git-common-dir 2>/dev/null); then
		_git_ai_print_git_hooks_dir "$git_dir"
		return 0
	fi

	if git_dir=$(git rev-parse --path-format=absolute --git-dir 2>/dev/null); then
		printf '%s/hooks\n' "$git_dir"
		return 0
	fi

	if git_dir=$(git rev-parse --git-dir 2>/dev/null); then
		_git_ai_print_git_hooks_dir "$git_dir"
		return 0
	fi

	return 1
}

git_ai_run_local_hook() {
	local hook_name="$1"
	shift

	local hooks_dir
	if ! hooks_dir=$(_git_ai_git_hooks_dir); then
		return 0
	fi

	local hook_path="${hooks_dir}/${hook_name}"
	if [ ! -x "$hook_path" ]; then
		return 0
	fi

	local self_path="${GIT_AI_HOOK_SELF:-$0}"
	local resolved_hook
	local resolved_self
	resolved_hook=$(_git_ai_abs_path "$hook_path" 2>/dev/null || printf '%s\n' "$hook_path")
	resolved_self=$(_git_ai_abs_path "$self_path" 2>/dev/null || printf '%s\n' "$self_path")

	# If a caller explicitly points PI_REAL_HOOKS_DIR back at this package's
	# hooks directory, do not recurse into ourselves.
	if [ "$resolved_hook" = "$resolved_self" ]; then
		return 0
	fi

	"$hook_path" "$@"
}
