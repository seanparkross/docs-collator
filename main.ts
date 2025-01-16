import { walk } from "https://deno.land/std/fs/mod.ts";

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
  const docsDir = "../ddn-docs/docs/";
  const outputFile = "./allContent.txt";

  try {
    await combineMarkdownFiles(docsDir, outputFile);
  } catch (error) {
    console.error("Error processing files:", error);
    Deno.exit(1);
  }
}
