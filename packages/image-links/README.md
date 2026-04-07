# image-links

Clickable `file://` links for images returned by pi's `read` tool. Open images in your browser with one click.

When the read tool encounters an image file, it normally just shows a text confirmation. This extension appends a clickable OSC 8 hyperlink:

```
Read image file and include it in the tool result...
📷 Open image                    ← click to open in browser
```

## How It Works

1. Listens for `tool_result` events where `toolName` is `read`
2. Checks if the result contains an image block
3. Resolves the file path to an absolute path
4. Appends an OSC 8 hyperlink (`file://` URL) to the text output

## Installation

```bash
pi install npm:@pi-extensions/image-links
```

Restart pi to activate.

## Compatibility

| Terminal | Support |
|----------|---------|
| **iTerm2** | ✅ |
| **Ghostty** | ✅ |
| **WezTerm** | ✅ |
| Kitty | ✅ |
| Most modern terminals | ✅ |

Requires OSC 8 hyperlink support (widely available in modern terminal emulators).
