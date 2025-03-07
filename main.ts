import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, normalize } from "https://deno.land/std/path/mod.ts";

async function combineMarkdownFiles(directory: string, outputFile: string) {
  const allContent: string[] = [];

  // Walk through all files recursively
  for await (const entry of walk(directory, {
    exts: [".mdx"], // Only process .mdx files
    includeDirs: false,
  })) {
    try {
      // Read the content of each file
      const content = await Deno.readTextFile(entry.path);
      // Add file path as a header before its content
      allContent.push(`\n\n--- File: ${entry.path} ---\n`);
      allContent.push(content);
    } catch (error) {
      console.error(`Error reading file ${entry.path}:`, error);
    }
  }

  try {
    // Write all content to the output file
    await Deno.writeTextFile(outputFile, allContent.join("\n"));
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
