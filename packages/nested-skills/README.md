# nested-skills

Pi's skill scanner stops recursing when it finds a `SKILL.md` in a directory. Tree-structured skill collections (like `playbook/`) only get their root discovered — all children are invisible.

This extension rescans skill directories for nested `SKILL.md` files that pi missed, and contributes them back through `resources_discover` so pi loads them as real skills instead of prompt-only ghosts.
