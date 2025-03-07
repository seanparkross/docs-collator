import { join, dirname } from "https://deno.land/std/path/mod.ts";

interface PartialImport {
  importName: string;
  partialPath: string;
}

/**
 * Extracts partial imports from MDX content
 * Example: import InstallTheCli from "@site/docs/_install-the-cli.mdx";
 */
function extractPartialImports(content: string): PartialImport[] {
  const importRegex = /import\s+(\w+)\s+from\s+"@site\/([^"]+)"/g;
  const partials: PartialImport[] = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const [_, importName, partialPath] = match;
    if (partialPath.includes("/_")) {
      partials.push({ importName, partialPath });
    }
  }

  return partials;
}

/**
 * Reads the content of a partial MDX file
 */
async function readPartialContent(
  baseDir: string,
  partialPath: string
): Promise<string> {
  try {
    // Remove @site prefix and normalize path
    // Since @site maps to the root directory, we need to go up one level from the docs directory
    const normalizedPath = partialPath.replace("@site/", "");
    const fullPath = join(dirname(baseDir), normalizedPath);
    const content = await Deno.readTextFile(fullPath);

    // Remove frontmatter if present
    const contentWithoutFrontmatter = content.replace(
      /^---\n[\s\S]*?\n---\n/,
      ""
    );

    return contentWithoutFrontmatter.trim();
  } catch (error) {
    console.error(`Error reading partial ${partialPath}:`, error);
    return "";
  }
}

/**
 * Replaces partial component usage with actual content
 * Example: <InstallTheCli /> -> content of _install-the-cli.mdx
 */
function replacePartialUsage(
  content: string,
  importName: string,
  partialContent: string
): string {
  const componentRegex = new RegExp(`<${importName}\\s*/>`, "g");
  return content.replace(componentRegex, partialContent);
}

/**
 * Main function to process partials in MDX content
 */
export async function processPartials(
  content: string,
  baseDir: string
): Promise<string> {
  const partials = extractPartialImports(content);
  let processedContent = content;

  for (const partial of partials) {
    const partialContent = await readPartialContent(
      baseDir,
      partial.partialPath
    );
    processedContent = replacePartialUsage(
      processedContent,
      partial.importName,
      partialContent
    );
  }

  return processedContent;
}
