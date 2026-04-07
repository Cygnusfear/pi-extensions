# code-review-guard

Appends a code health prompt after every code-reading tool result — sits right after the code the LLM just saw.

Injects `prompts/codehealth.md` after results from: `read`, `hash_read`, `grep`, `find`, `ls`, `execute_code`.

This nudges the model toward better code review practices without requiring explicit instructions.
