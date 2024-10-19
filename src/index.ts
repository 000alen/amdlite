import { Module } from "@/module";
import { exportValues, getCached } from "@/utils";
import { E_REQUIRE_FAILED } from "@/constants";
import { cache, global, loads, newModules, pendingModules } from "@/lib";
import { ExportValue, FactoryFunction, GeneratorFunction } from "@/types";

export function define(
  id: string,
  dependencies: Array<string>,
  factoryOrExport: FactoryFunction | ExportValue
): void;
export function define(
  dependencies: Array<string>,
  factoryOrExport: FactoryFunction | ExportValue
): void;
export function define(factoryOrExport: FactoryFunction | ExportValue): void;
export function define(
  idOrDependenciesOrFactoryOrExport:
    | string
    | Array<string>
    | FactoryFunction
    | ExportValue,
  dependenciesOrFactory?: Array<string> | FactoryFunction | ExportValue,
  factoryOrExport?: FactoryFunction | ExportValue
) {
  const argc: number = arguments.length;
  const defaultDeps = ["require", "exports", "module"];

  let module: Module;

  let id: string | undefined;
  let dependencies: Array<string>;
  let factory: FactoryFunction | undefined;
  let exportValue: ExportValue | undefined;

  if (argc == 1) {
    id = undefined;
    dependencies = defaultDeps;
    factory = idOrDependenciesOrFactoryOrExport as unknown as FactoryFunction;
  } else if (argc == 2) {
    if (typeof idOrDependenciesOrFactoryOrExport == "string") {
      id = idOrDependenciesOrFactoryOrExport as string;
      dependencies = defaultDeps;
    } else {
      id = undefined;
      dependencies =
        idOrDependenciesOrFactoryOrExport as unknown as Array<string>;
    }

    factory = dependenciesOrFactory as unknown as FactoryFunction;
  } else {
    id = idOrDependenciesOrFactoryOrExport as string;
    dependencies = dependenciesOrFactory as unknown as Array<string>;
    factory = factoryOrExport as FactoryFunction;
  }

  if (typeof factory !== "function") {
    exportValue = factory;
    factory = undefined;
  }

  module = new Module(id, dependencies, factory, exportValue, undefined);
  newModules.push(module);
  pendingModules.push(module);
  setTimeout(function () {
    module.loadDependencies();
  }, 0);
  exportValues();

  return module;
}

// @ts-expect-error we're overloading the function here
export function require(dependency: string): ExportValue; // @ts-ignore
export function require(
  dependencies: Array<string>,
  callback: FactoryFunction
): void; // @ts-ignore
export function require(
  dependencyOrDependencies: string | Array<string>,
  factory?: FactoryFunction
): ExportValue | void {
  const argc = arguments.length;

  if (argc == 1) {
    const dep = getCached(dependencyOrDependencies as string);

    if (!dep) throw new Error(E_REQUIRE_FAILED);

    return dep.exportValue;
  } else if (argc == 2) {
    define(
      dependencyOrDependencies as Array<string>,
      factory as FactoryFunction
    );
  } else throw new Error(E_REQUIRE_FAILED);
}

// Built-in dynamic modules

export function dynamic(id: string, generator: GeneratorFunction) {
  cache[id] = new Module(id, undefined, undefined, undefined, generator);
  loads[id] = true;
}

dynamic("require", function (module) {
  function r() {
    return require.apply(global, arguments as any);
  }
  r["toUrl"] = function (path: string) {
    return module.id + "/" + path;
  };
  return r;
});

dynamic("exports", function (module) {
  return module["exports"];
});

dynamic("module", function (module) {
  return module;
});

// @ts-ignore
global["define"] = define; // @ts-ignore
global["define"]["amd"] = {};
