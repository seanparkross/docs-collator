# Docs Collator

A Deno application that combines MDX documentation files into a single text file, respecting the Docusaurus ordering system. This tool processes documentation content while maintaining the same order as it appears in your Docusaurus site.

## Features

- Recursively walks through a directory to find all `.mdx` files
- Respects Docusaurus ordering system:
  - Directory order from `_category_.json` files
  - Page order from `sidebar_position` in MDX frontmatter
  - Alphabetical fallback for equal positions
- Combines the content of all MDX files into a single output file
- Preserves file paths and titles as headers in the output
- Handles errors gracefully with proper error reporting
- Supports processing specific subdirectories of the documentation

## Usage

The app can be run in two ways:

1. Process all MDX files in the base docs directory:

```bash
deno run main.ts
```

2. Process MDX files in a specific subdirectory:

```bash
deno run main.ts <subdirectory-path>
```

For example:

```bash
deno run main.ts auth/jwt
```

## Output

The app generates a text file containing all the MDX content, with each file's content preceded by a header showing its path and title. The output file is named based on the input:

- If no subdirectory is specified: `allContent.txt`
- If a subdirectory is specified: `<subdirectory-name>.txt`

The output format includes:

- File path
- Title (from frontmatter title, sidebar_label, or path)
- Full MDX content

## Requirements

- Deno runtime environment
- Access to the documentation directory (default path: `../ddn-docs/docs`)
- Docusaurus-style documentation structure with:
  - Optional `_category_.json` files for directory ordering
  - Optional `sidebar_position` in MDX frontmatter for page ordering

## Error Handling

The app includes error handling for:

- File reading errors
- File writing errors
- Invalid paths
- Processing errors
- Missing or invalid frontmatter
- Missing or invalid category configurations

All errors are logged to the console with descriptive messages.
