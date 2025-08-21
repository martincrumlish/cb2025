# MCP (Model Context Protocol) Installation Instructions

This document provides complete installation and configuration instructions for all MCP servers used in this project.

## Table of Contents
1. [Supabase MCP Server](#supabase-mcp-server)
2. [Playwright MCP Server](#playwright-mcp-server)
3. [Context7 MCP Server](#context7-mcp-server)
4. [Shadcn UI MCP Server](#shadcn-ui-mcp-server)

---

## Supabase MCP Server

Official Supabase integration for database operations via MCP.

### Prerequisites
- Node.js v16 or newer
- npm or yarn
- Supabase project with API credentials

### Installation

No manual installation required! The server runs via `npx` and downloads automatically when needed.

### Configuration

1. **Get your Supabase credentials:**
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Navigate to Settings → API
   - Copy your `Project URL` (format: `https://[PROJECT_REF].supabase.co`)
   - Extract the PROJECT_REF from the URL (e.g., `xxrlnwelfrvdshjrrxlu`)
   
2. **Get your Personal Access Token:**
   - Go to [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens)
   - Click "Generate New Token"
   - Give it a descriptive name (e.g., "MCP Server")
   - Copy the token (starts with `sbp_`)
   - **IMPORTANT:** Save this token immediately - you won't be able to see it again!

3. **For Windows Users - Add to Project Configuration (Recommended):**

Create or update `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "@supabase/mcp-server-supabase",
        "--project-ref=YOUR_PROJECT_REF",
        "--access-token=sbp_YOUR_ACCESS_TOKEN"
      ],
      "env": {}
    }
  }
}
```

Replace:
- `YOUR_PROJECT_REF` with your project reference (e.g., `xxrlnwelfrvdshjrrxlu`)
- `sbp_YOUR_ACCESS_TOKEN` with your actual token

**Note:** On Windows, the `cmd /c npx` wrapper is required for proper execution.

4. **Alternative - Using Claude CLI:**

For Mac/Linux users or if you prefer global configuration:

```bash
claude mcp add supabase \
  -- npx @supabase/mcp-server-supabase \
  --project-ref=YOUR_PROJECT_REF \
  --access-token=sbp_YOUR_ACCESS_TOKEN \
  -s project
```

### Example Values
- **Project Reference:** `xxrlnwelfrvdshjrrxlu` (extract from your Supabase URL)
- **Access Token:** `sbp_e218ca4c86c39b1bc1d6bc96eafcf52ce9581494` (starts with `sbp_`)

### Available Features
- Database queries (read/write)
- Table management
- Documentation access
- Project information

### Troubleshooting

#### Windows-Specific Issues
- **Environment variables not working:** On Windows, pass the access token directly as an argument instead of using environment variables
- **Command not found:** Ensure you use `cmd /c npx` wrapper for Windows
- **Failed to connect:** Check if there's a local configuration overriding project settings with `claude mcp get supabase`
- **Multiple configurations:** Remove local config with `claude mcp remove supabase -s local` if needed

#### General Issues
- Verify your access token is valid and hasn't expired
- Ensure your project reference is correct (no `https://` or `.supabase.co`)
- After modifying `.mcp.json`, restart Claude Code completely
- Run `claude mcp list` to verify the server status shows "✓ Connected"
- Check the exact package name is `@supabase/mcp-server-supabase` (not `@supabase/mcp-server`)

---

## Playwright MCP Server

Browser automation and web testing via MCP.

### Prerequisites
- Node.js v16 or newer
- Chromium browser (auto-installs if missing)

### Installation

No manual installation required! Runs via `npx`.

### Configuration

Add to `.mcp.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@microsoft/mcp-server-playwright"]
    }
  }
}
```

### Available Features
- Browser navigation (`browser_navigate`)
- Element interaction (`browser_click`, `browser_type`)
- Screenshot capture (`browser_take_screenshot`)
- Page snapshots (`browser_snapshot`)
- JavaScript evaluation (`browser_evaluate`)
- Network monitoring (`browser_network_requests`)
- Multi-tab support (`browser_tab_new`, `browser_tab_select`)

### Common Commands
```javascript
// Navigate to a URL
browser_navigate({ url: "https://example.com" })

// Take a screenshot
browser_take_screenshot({ filename: "screenshot.png" })

// Click an element
browser_click({ element: "Submit button", ref: "button#submit" })

// Type text
browser_type({ element: "Search input", ref: "input#search", text: "query" })
```

### Troubleshooting
- If browser doesn't launch, run: `browser_install()` to install Chromium
- For headless mode issues, check system display settings
- Ensure sufficient memory for browser operations

---

## Context7 MCP Server

Library documentation retrieval and code examples.

### Prerequisites
- Node.js v16 or newer
- Internet connection for fetching documentation

### Installation

No manual installation required! Runs via `npx`.

### Configuration

Add to `.mcp.json`:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

### Available Features
- Library ID resolution (`resolve-library-id`)
- Documentation retrieval (`get-library-docs`)
- Code examples and snippets
- Version-specific documentation

### Usage Examples
```javascript
// First, resolve the library ID
resolve-library-id({ libraryName: "react" })
// Returns: /facebook/react

// Then fetch documentation
get-library-docs({ 
  context7CompatibleLibraryID: "/facebook/react",
  tokens: 10000,
  topic: "hooks"
})
```

### Supported Libraries
- React, Vue, Angular
- Next.js, Nuxt, SvelteKit
- Express, Fastify, NestJS
- Tailwind CSS, Material-UI
- MongoDB, PostgreSQL, Redis
- And many more...

### Troubleshooting
- Always resolve library ID first before fetching docs
- Use specific version strings for version-locked documentation
- Increase token limit for more comprehensive documentation

---

## Shadcn UI MCP Server

Shadcn/ui component library integration.

### Prerequisites
- Node.js v16 or newer
- React project with Tailwind CSS

### Installation

No manual installation required! Runs via `npx`.

### Configuration

Add to `.mcp.json`:
```json
{
  "mcpServers": {
    "shadcn-ui": {
      "command": "npx",
      "args": ["-y", "shadcn-ui-mcp-server"]
    }
  }
}
```

### Available Features
- Component listing (`list_components`)
- Component source code (`get_component`)
- Component demos (`get_component_demo`)
- Component metadata (`get_component_metadata`)
- Block templates (`get_block`, `list_blocks`)
- Directory structure (`get_directory_structure`)

### Usage Examples
```javascript
// List all available components
list_components()

// Get component source code
get_component({ componentName: "button" })

// Get component demo
get_component_demo({ componentName: "accordion" })

// Get block template
get_block({ blockName: "dashboard-01" })
```

### Available Components
- Accordion, Alert, Avatar, Badge, Button
- Calendar, Card, Carousel, Checkbox
- Dialog, Dropdown, Form, Input
- Table, Tabs, Toast, Tooltip
- And 50+ more components...

### Available Blocks
- Authentication (login, register, password reset)
- Dashboards (analytics, admin, user)
- Marketing (landing pages, pricing, features)
- E-commerce (product lists, checkout, cart)

### Troubleshooting
- Ensure your project has Tailwind CSS configured
- Components use CSS variables - verify your `globals.css` includes them
- Check path aliases in `tsconfig.json` match shadcn expectations

---

## Complete Configuration

### For Windows Users - Project Configuration (Recommended)

Create a `.mcp.json` file in your project root with all MCP servers:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "@supabase/mcp-server-supabase",
        "--project-ref=YOUR_PROJECT_REF",
        "--access-token=sbp_YOUR_ACCESS_TOKEN"
      ],
      "env": {}
    },
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "@executeautomation/playwright-mcp-server"]
    },
    "context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@upstash/context7-mcp"]
    },
    "shadcn-ui": {
      "command": "cmd",
      "args": ["/c", "npx", "shadcn-ui-mcp-server"]
    }
  }
}
```

**Important for Windows:** All servers need the `cmd /c` wrapper for proper execution.

### For Mac/Linux Users - Claude CLI Commands

Install all MCP servers using Claude CLI commands:

```bash
# Supabase
claude mcp add supabase \
  -- npx @supabase/mcp-server-supabase \
  --project-ref=YOUR_PROJECT_REF \
  --access-token=sbp_YOUR_ACCESS_TOKEN \
  -s project

# Playwright
claude mcp add playwright -- npx @executeautomation/playwright-mcp-server -s project

# Context7
claude mcp add context7 -- npx -y @upstash/context7-mcp -s project

# Shadcn UI
claude mcp add shadcn-ui -- npx shadcn-ui-mcp-server -s project
```

**Note:** The `-s project` flag adds servers to the project configuration (`.mcp.json`) instead of your personal configuration.

## Important Notes

1. **Security**: Never commit `.mcp.json` with real credentials to version control
2. **Restart Required**: After modifying `.mcp.json`, restart Claude Code
3. **npx Usage**: All servers use `npx` with `-y` flag for automatic installation
4. **Network Access**: MCP servers require internet access for initial download
5. **Permissions**: Some features (like Playwright) may require additional system permissions

## Verification

To verify MCP servers are working:

1. In Claude Code, ask: "List all available MCP resources"
2. You should see resources from all configured servers
3. Test each server with a simple command:
   - Supabase: "List Supabase tables"
   - Playwright: "Navigate to google.com"
   - Context7: "Get React documentation"
   - Shadcn: "List shadcn components"

## Additional Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Supabase MCP GitHub](https://github.com/supabase-community/mcp-server-supabase)
- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp)
- [Context7 GitHub](https://github.com/upstash/context7)
- [Shadcn UI MCP GitHub](https://github.com/jpisnice/shadcn-ui-mcp-server)