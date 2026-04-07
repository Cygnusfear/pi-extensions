# lipgloss-theme

A dark, vibrant color theme for pi's terminal UI inspired by [Charm's Lip Gloss](https://github.com/charmbracelet/lipgloss) styling.

Deep purple highlights, hot pink errors, teal code, and a warm cream/muted green palette on a near-black background.

## Installation

```bash
pi install npm:@pi-extensions/lipgloss-theme
```

Activate in your pi config:

```json
{
  "theme": "lipgloss"
}
```

Restart pi to activate.

## Color Palette

### Base

| Variable | Hex | Usage |
|----------|-----|-------|
| `bg` | `#1A1A1A` | Page background |
| `panel` | `#313340` | Panels, tool results |
| `normal` | `#EEEEEE` | Primary text |
| `muted` | `#C1C6B2` | Secondary text |
| `subtle` | `#383838` | Borders, dividers |
| `subtle2` | `#696969` | Dimmed text |
| `bright` | `#FAFAFA` | High-emphasis text |

### Accents

| Variable | Hex | Usage |
|----------|-----|-------|
| `highlight` | `#7D56F4` | Primary accent, headings, keywords |
| `highlightBright` | `#874BFD` | Bright accent, types |
| `special` | `#73F59F` | Success, links, strings |
| `pink` | `#F25D94` | List bullets, syntax numbers |
| `hotPink` | `#FF5F87` | Errors, diff removed |
| `yellow` | `#EDFF82` | Warnings, syntax variables |
| `teal` | `#14F9D5` | Code, syntax functions |
| `deepPurple` | `#6124DF` | User message background |
| `violet` | `#A550DF` | Decorative |
| `cream` | `#FFF7DB` | Warm highlights |

### Thinking Levels

| Variable | Hex | Level |
|----------|-----|-------|
| `thinkingOff` | `#383838` | off |
| `thinkingMinimal` | `#7D56F4` | minimal |
| `thinkingLow` | `#874BFD` | low |
| `thinkingMedium` | `#14F9D5` | medium |
| `thinkingHigh` | `#F25D94` | high |
| `thinkingXhigh` | `#FF5F87` | xhigh |

## Theme Features

- **Syntax highlighting** — full coverage: keywords, functions, variables, strings, numbers, types, operators, punctuation, comments
- **Diff colors** — green for added, hot pink for removed, muted for context
- **Thinking gradient** — off through xhigh with escalating color intensity
- **Markdown styling** — headings, links, code blocks, quotes, lists, and horizontal rules
- **Export colors** — `pageBg`, `cardBg`, and `infoBg` for rendered exports

## File Structure

```
lipgloss-theme/
├── package.json
└── themes/
    └── lipgloss.json      # Theme definition (vars + color mappings)
```
