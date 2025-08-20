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
   - Extract the PROJECT_REF from the URL (e.g., `rstyselykbbtanphsjxj`)
   
2. **Get your Personal Access Token:**
   - Go to [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens)
   - Click "Generate New Token"
   - Give it a descriptive name (e.g., "MCP Server")
   - Copy the token (starts with `sbp_`)
   - **IMPORTANT:** Save this token immediately - you won't be able to see it again!

3. **Add using Claude CLI (Recommended):**

Run this command in your terminal:

```bash
claude mcp add supabase \
  --env SUPABASE_ACCESS_TOKEN=sbp_YOUR_ACCESS_TOKEN \
  -- npx -y @supabase/mcp-server-supabase@latest \
  --project-ref=YOUR_PROJECT_REF
```

Replace:
- `sbp_YOUR_ACCESS_TOKEN` with your actual token
- `YOUR_PROJECT_REF` with your project reference

This command automatically configures the Supabase MCP server in your Claude configuration.

### Example Values
- **Project Reference:** `YOUR_PROJECT_REF` (e.g., `abc123xyz789`)
- **Access Token:** `sbp_YOUR_ACCESS_TOKEN` (starts with `sbp_`)

### Available Features
- Database queries (read/write)
- Table management
- Documentation access
- Project information

### Troubleshooting
- If the server doesn't connect, verify your access token is valid
- Ensure your project reference is correct (no `https://` or `.supabase.co`)
- After running the `claude mcp add` command, restart Claude Code
- The server configuration is saved in your Claude settings, not in `.mcp.json`
- You can verify the server is added by running `claude mcp list`

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

### Using Claude CLI (Recommended)

Install all MCP servers using Claude CLI commands:

```bash
# Supabase
claude mcp add supabase \
  --env SUPABASE_ACCESS_TOKEN=sbp_YOUR_ACCESS_TOKEN \
  -- npx -y @supabase/mcp-server-supabase@latest \
  --project-ref=YOUR_PROJECT_REF

# Playwright
claude mcp add playwright -- npx -y @microsoft/mcp-server-playwright

# Context7
claude mcp add context7 -- npx -y @context7/mcp-server

# Shadcn UI
claude mcp add shadcn-ui -- npx -y shadcn-ui-mcp-server
```

### Alternative: Manual `.mcp.json` Configuration

If you prefer manual configuration, create a `.mcp.json` file:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@microsoft/mcp-server-playwright"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    },
    "shadcn-ui": {
      "command": "npx",
      "args": ["-y", "shadcn-ui-mcp-server"]
    }
  }
}
```

**Note:** Supabase MCP works best when added via Claude CLI due to environment variable handling on different platforms.

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