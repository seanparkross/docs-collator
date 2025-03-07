import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, normalize, dirname } from "https://deno.land/std/path/mod.ts";
import { processPartials } from "./partials.ts";

interface CategoryConfig {
  position?: number;
  label?: string;
}

interface MDXFrontmatter {
  sidebar_position?: number;
  sidebar_label?: string;
  title?: string;
  [key: string]: string | number | undefined;
}

async function readCategoryConfig(
  dirPath: string
): Promise<CategoryConfig | null> {
  try {
    const categoryPath = join(dirPath, "_category_.json");
    const content = await Deno.readTextFile(categoryPath);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function parseMDXFrontmatter(content: string): Promise<MDXFrontmatter> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  const frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split("\n");
  const result: MDXFrontmatter = {};

  for (const line of lines) {
    const [key, value] = line.split(":").map((s) => s.trim());
    if (key && value) {
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, "");
      if (key === "sidebar_position") {
        result.sidebar_position = parseInt(cleanValue, 10);
      } else {
        result[key] = cleanValue;
      }
    }
  }

  return result;
}

interface FileEntry {
  path: string;
  content: string;
  frontmatter: MDXFrontmatter;
  categoryConfig: CategoryConfig | null;
  parentDirs: string[];
}

function generateUrl(filePath: string): string {
  // Remove the base docs directory prefix and .mdx extension
  const relativePath = filePath
    .replace(/^.*?\/docs\//, "")
    .replace(/\.mdx$/, "");
  // Convert the path to URL format
  const urlPath = relativePath.split("/").join("/");
  return `https://hasura.io/docs/3.0/${urlPath}/`;
}

async function combineMarkdownFiles(directory: string, outputFile: string) {
  const allContent: FileEntry[] = [];
  const categoryConfigs = new Map<string, CategoryConfig | null>();

  // First pass: collect all files and their metadata
  for await (const entry of walk(directory, {
    exts: [".mdx"],
    includeDirs: false,
  })) {
    // Skip files that begin with an underscore (partials)
    if (entry.name.startsWith("_")) {
      continue;
    }

    try {
      const content = await Deno.readTextFile(entry.path);
      const frontmatter = await parseMDXFrontmatter(content);
      const dirPath = dirname(entry.path);

      // Process partials in the content
      const processedContent = await processPartials(content, directory);

      // Get all parent directories
      const parentDirs: string[] = [];
      let currentDir = dirPath;
      while (currentDir !== directory) {
        parentDirs.push(currentDir);
        currentDir = dirname(currentDir);
      }
      parentDirs.reverse(); // Order from root to leaf

      // Get or cache category config for this directory and all parent directories
      const dirConfigs = new Map<string, CategoryConfig | null>();
      for (const dir of [dirPath, ...parentDirs]) {
        let config: CategoryConfig | null;
        if (!categoryConfigs.has(dir)) {
          config = await readCategoryConfig(dir);
          categoryConfigs.set(dir, config);
        } else {
          const existingConfig = categoryConfigs.get(dir);
          if (existingConfig === undefined) {
            throw new Error(`Category config not found for directory ${dir}`);
          }
          config = existingConfig;
        }
        dirConfigs.set(dir, config);
      }

      allContent.push({
        path: entry.path,
        content: processedContent,
        frontmatter,
        categoryConfig: dirConfigs.get(dirPath)!,
        parentDirs,
      });
    } catch (error) {
      console.error(`Error reading file ${entry.path}:`, error);
    }
  }

  // Sort content based on hierarchical category positions and sidebar position
  allContent.sort((a, b) => {
    // Compare each level of the directory hierarchy
    const maxDepth = Math.max(a.parentDirs.length, b.parentDirs.length);
    for (let i = 0; i < maxDepth; i++) {
      const aDir = a.parentDirs[i];
      const bDir = b.parentDirs[i];

      // If one path is shorter, it should come first
      if (!aDir && !bDir) break;
      if (!aDir) return -1;
      if (!bDir) return 1;

      // Compare category positions at this level
      const aConfig = categoryConfigs.get(aDir);
      const bConfig = categoryConfigs.get(bDir);
      const aPos = aConfig?.position ?? 0;
      const bPos = bConfig?.position ?? 0;

      if (aPos !== bPos) {
        return aPos - bPos;
      }
    }

    // If we're in the same directory, compare sidebar positions
    const aPos = a.frontmatter.sidebar_position ?? 0;
    const bPos = b.frontmatter.sidebar_position ?? 0;
    if (aPos !== bPos) {
      return aPos - bPos;
    }

    // If positions are equal, sort alphabetically by path
    return a.path.localeCompare(b.path);
  });

  // Generate the output content
  const outputContent = allContent
    .map((entry) => {
      const title =
        entry.frontmatter.title ||
        entry.frontmatter.sidebar_label ||
        entry.path;
      const url = generateUrl(entry.path);
      return `\n\n--- File: ${entry.path} ---\nURL: ${url}\n# ${title}\n\n${entry.content}`;
    })
    .join("\n");

  try {
    await Deno.writeTextFile(outputFile, outputContent);
    console.log(`Successfully combined all MDX files into ${outputFile}`);
  } catch (error) {
    console.error("Error writing to output file:", error);
  }
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  // Get the path from command line arguments
  const subPath = Deno.args[0];
  const baseDocsDir = "../ddn-docs/docs";

  // If no subpath provided, use the base docs directory
  if (!subPath) {
    const outputFile = "./allContent.txt";
    try {
      await combineMarkdownFiles(baseDocsDir, outputFile);
    } catch (error) {
      console.error("Error processing files:", error);
      Deno.exit(1);
    }
    Deno.exit(0);
  }

  // Normalize the path by removing extra slashes and resolving . and ..
  const normalizedPath = normalize(subPath).replace(/^\/+|\/+$/g, "");

  // Construct the full docs directory path
  const docsDir = join(baseDocsDir, normalizedPath);

  // Create output filename based on the last part of the path
  const outputName = normalizedPath.split("/").pop() || normalizedPath;
  const outputFile = `./${outputName}.txt`;

  try {
    await combineMarkdownFiles(docsDir, outputFile);
  } catch (error) {
    console.error("Error processing files:", error);
    Deno.exit(1);
  }
}
