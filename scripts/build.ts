import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

await emptyDir("./build");

await build({
  compilerOptions: {
    lib: [
      "esnext",
      "dom",
      "dom.iterable",
    ],
  },
  entryPoints: ["./mod.ts"],
  outDir: "./build",
  package: {
    name: "functionalland-component",
    version: Deno.args[0],
    description: "A library to develop web component with a bit more of functional flavour.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/functionalland/functional-component.git",
    },
    bugs: {
      url: "https://github.com/functionalland/functional-component/issues",
    },
  },
  shims: {
    deno: false,
  },
  test: false,
});

// post build steps
Deno.copyFileSync("./LICENSE", "build/LICENSE");
Deno.copyFileSync("./README.md", "build/README.md");
