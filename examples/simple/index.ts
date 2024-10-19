import fs from "fs";
import { Context } from "@000alen/amdlite";

async function main() {
  const context = new Context();

  context.define("c", [], {
    c: "hello from c",
  });

  const moduleCode = await fs.promises.readFile("module.js", "utf-8");
  context.loadFromCode(moduleCode);

  context.require(["b", "c"], (b, c) => {
    console.log({ b, c });
  });
}

main().catch(console.error);
