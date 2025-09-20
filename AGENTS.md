# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

This project hosts a collection of simple, focused browser-based tools accessible at **tools.amezcua.dev**. Each tool is a standalone utility designed for immediate use without setup or configuration.

### Access & Deployment
- **Production URL**: https://tools.amezcua.dev
- **Tool Access**: Append tool name to base URL (e.g., `/json` for JSON viewer, `/urls` for URL extractor)
- **Infrastructure**: Static site hosted on AWS S3 bucket with CloudFront CDN distribution
- **Deployment**: Build files are uploaded to S3 and served globally via CloudFront

## Commands

### Development
- `npm start` - Start development server on port 3000 with hot reload
- `npm run build:dev` - Create development build
- `npm run build` - Create production build
- `npm run type-check` - Run TypeScript type checking without emitting files

## Architecture

This is a React-based tools platform using a dynamic multi-tool webpack configuration. Each tool is a standalone React application that gets built and served independently.

### Key Architecture Points

**Dynamic Tool Loading**: The webpack configuration (`webpack.config.js:5-26`) automatically discovers tools in `src/tools/` directories and creates separate entry points for each. Tools are accessed via URLs like `/json` for the JSON viewer or `/urls` for the URL extractor.

**Component Structure**: Tools are self-contained React applications in `src/tools/[tool-name]/index.tsx`. Each tool mounts itself to a root element and includes its own styling via `@/styles/globals.css`.

**Styling System**: Uses Tailwind CSS with a custom shadcn/ui component library. Components are in `src/components/ui/` with a warm bone-colored theme defined in `src/styles/globals.css`. The `@` alias maps to the `src/` directory.

**Build System**: Webpack bundles each tool separately with React loaded from CDN (`template.html:8-9`). The build outputs to `dist/[tool-name]/index.js` with corresponding HTML files.

## Adding New Tools

Create a new directory under `src/tools/` with an `index.tsx` file. The webpack configuration will automatically detect it and create the necessary entry point and HTML file. Tools should follow the existing pattern of importing globals.css and mounting to the root element.

## UI/UX Guidelines

### Design Philosophy
- **Minimalism First**: Create clean, focused interfaces with only essential elements
- **Single Purpose**: Each tool should do one thing exceptionally well
- **Immediate Utility**: Tools should be instantly usable without configuration

### Component Usage
- **Prefer shadcn/ui**: Use existing components from `src/components/ui/` (Card, Button, Input, Alert, etc.)
- **Check shadcn Documentation**: Reference https://ui.shadcn.com for component patterns and new components
- **Custom When Needed**: Create custom components only when shadcn doesn't provide suitable options

### Styling Patterns
- **Dark Mode Default**: All tools use `className="dark"` on the root container
- **Consistent Layout**: Center tools with `min-h-screen`, use Card as main container with `max-w-3xl`
- **Responsive Design**: Use Tailwind's responsive utilities (sm:, md:, lg:)
- **Warm Bone Theme**: Follow the existing color palette defined in `src/styles/globals.css`

### Tool Structure Example
```tsx
<div className="dark flex items-center justify-center min-h-screen bg-background p-4">
  <Card className="w-full max-w-3xl flex flex-col max-h-[90vh]">
    <CardHeader>
      <CardTitle className="text-foreground text-3xl font-bold">Tool Name</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col min-h-0">
      {/* Tool content */}
    </CardContent>
  </Card>
</div>
```

## Development Workflow

### Build Verification
**IMPORTANT**: Always verify your changes build successfully before completing work:
- Run `npm run build:dev` to ensure the project builds without errors
- Fix any TypeScript or build errors before finalizing changes
- The development build must succeed for deployment to work