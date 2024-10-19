import { ExportValue, FactoryFunction, GeneratorFunction } from "@/types";
import { Module } from "@/module";
import { E_REQUIRE_FAILED } from "@/constants";
import { scopedEval } from "@/eval";

const global = globalThis;

export class Context {
  cache: Record<string, Module>;
  loads: Record<string, boolean>;
  pendingModules: Array<Module>;
  newModules: Array<Module>;

  constructor() {
    this.cache = {};
    this.loads = {};
    this.pendingModules = [];
    this.newModules = [];

    const _require = this.require.bind(this);
    this.dynamic("require", function (module) {
      function r() {
        return _require.apply(global, arguments as any);
      }
      r["toUrl"] = function (path: string) {
        return module.id + "/" + path;
      };
      return r;
    });

    this.dynamic("exports", function (module) {
      return module["exports"];
    });

    this.dynamic("module", function (module) {
      return module;
    });
  }

  public getCached(id: string): Module | undefined {
    if (this.cache.hasOwnProperty(id)) {
      return this.cache[id];
    }
  }

  public exportValues() {
    let count: number = 0;
    let lastCount: number = 1;

    let i: number,
      j: number,
      module: Module,
      factory: FactoryFunction,
      args: any[],
      id: string,
      value;

    while (count != lastCount) {
      lastCount = count;
      for (i = this.pendingModules.length; i--; ) {
        module = this.pendingModules[i];
        if (!module.exportValue && module.checkDependencies()) {
          this.pendingModules.splice(i, 1);
          factory = module.factoryFunction as FactoryFunction;

          args = [];
          if (module.dependencies)
            for (j = module.dependencies.length; j--; ) {
              id = module.dependencies[j];
              args.unshift(module.getDependencyValue(id));
            }

          value = factory.apply(module["exports"], args);
          module.exportValue = value || module["exports"];
          ++count;
        }
      }
    }
  }

  public define(
    id: string,
    dependencies: Array<string>,
    factoryOrExport: FactoryFunction | ExportValue
  ): void;
  public define(
    dependencies: Array<string>,
    factoryOrExport: FactoryFunction | ExportValue
  ): void;
  public define(factoryOrExport: FactoryFunction | ExportValue): void;
  public define(
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

    module = new Module(
      this,
      id,
      dependencies,
      factory,
      exportValue,
      undefined
    );
    this.newModules.push(module);
    this.pendingModules.push(module);

    setTimeout(function () {
      module.loadDependencies();
    }, 0);

    this.exportValues();

    return module;
  }

  public require(dependency: string): ExportValue;
  public require(dependencies: Array<string>, callback: FactoryFunction): void;
  public require(
    dependencyOrDependencies: string | Array<string>,
    factory?: FactoryFunction
  ): ExportValue | void {
    const argc = arguments.length;

    if (argc == 1) {
      const dep = this.getCached(dependencyOrDependencies as string);

      if (!dep) throw new Error(E_REQUIRE_FAILED);

      return dep.exportValue;
    } else if (argc == 2) {
      this.define(
        dependencyOrDependencies as Array<string>,
        factory as FactoryFunction
      );
    } else throw new Error(E_REQUIRE_FAILED);
  }

  public dynamic(id: string, generator: GeneratorFunction) {
    this.cache[id] = new Module(
      this,
      id,
      undefined,
      undefined,
      undefined,
      generator
    );
    this.loads[id] = true;
  }

  public loadFromCode(code: string): void {
    const scope = {
      define: this.define.bind(this),
      require: this.require.bind(this),
      dynamic: this.dynamic.bind(this),
    };

    scopedEval(scope, code);
  }

  public loadFromUrl(url: string) {
    return fetch(url)
      .then((response) => response.text())
      .then((code) => {
        this.loadFromCode(code);
      });
  }
}
