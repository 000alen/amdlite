import { exportValues, getCached } from "@/utils";
import { cache, global, loads, newModules } from "@/lib";
import type { ExportValue, FactoryFunction, GeneratorFunction } from "@/types";

export class Module {
  // Optional string identifying the module.
  id: string | undefined;

  // Optional array of strings identifying the module's dependencies.
  dependencies: Array<string> | undefined;

  // Optional function returning the export value of the module.
  factoryFunction: FactoryFunction | undefined;

  // Optional export value for modules without a factory.
  exportValue: ExportValue | undefined;

  // Optional function returning a dynamic export value for the module.
  exports: Record<string, any>;

  // Optional function returning a dynamic export value for the module.
  generator: GeneratorFunction | undefined;

  // Global object.
  global: any;

  constructor(
    id: string | undefined,
    dependencies: Array<string> | undefined,
    factory: ((...args: any[]) => any) | undefined,
    exportValue: any | undefined,
    generator: ((module: Module) => any) | undefined
  ) {
    this.id = id;
    this.dependencies = dependencies;
    this.factoryFunction = factory;
    this.exports = {};
    this.generator = generator;
    this.global = global;

    if (!factory) {
      this.exportValue = exportValue || this.exports;
    }

    if (id) {
      loads[id] = true;
      cache[id] = this;
    }
  }

  loadDependencies() {
    if (!this.dependencies) return;

    let id: string, i: number;

    for (i = this.dependencies.length; i--; ) {
      id = this.dependencies[i];

      // normalize relative deps
      // TODO: normalize 'dot dot' segments
      if (id.charAt(0) == ".") {
        if (this.id !== undefined && this.id.indexOf("/") >= 0) {
          id = this.id.replace(/\/[^/]*$/, "/") + id;
        } else {
          id = "/" + id;
        }
        id = id.replace(/[/]\.[/]/g, "/");
        this.dependencies[i] = id;
      }

      // load deps that haven't started loading yet
      if (!loads.hasOwnProperty(id)) {
        this.loadScript(id);
      }
    }
  }

  checkDependencies(ignore?: string): boolean {
    const dependencies = this.dependencies || [];

    let dep: Module | undefined, i: number;

    for (i = dependencies.length; i--; ) {
      dep = getCached(dependencies[i]);
      // if the dependency doesn't exist, it's not ready
      if (!dep) {
        return false;
      }
      // if the dependency already exported something, it's ready
      if (dep.exportValue) {
        continue;
      }
      // if the dependency is only blocked by this module, it's ready
      // (circular reference check, this module)
      if (!ignore && dep.checkDependencies(this.id)) {
        continue;
      }
      // if we're ignoring this dependency, it's ready
      // (circular reference check, dependency of dependency)
      if (ignore && ignore == dep.id) {
        continue;
      }
      // else it's not ready
      return false;
    }
    return true;
  }

  getDependencyValue(id: string) {
    const dep = getCached(id);

    if (!dep) throw new Error(`Dependency ${id} not found`);

    return dep.generator ? dep.generator(this) : dep.exportValue;
  }

  loadScript(id: string) {
    const script = document.createElement("script"),
      parent = document.documentElement.children[0];

    loads[id] = true;

    script.onload = function () {
      var hasDefinition; // anonymous or matching id
      let module: Module | undefined;

      // loading amd modules
      while ((module = newModules.pop())) {
        if (!module.id || module.id == id) {
          hasDefinition = true;
          module.id = id;
        }
        if (!getCached(module.id)) {
          cache[module.id] = module;
        }
      }
      // loading alien script
      if (!hasDefinition) {
        module = new Module(id, undefined, undefined, undefined, undefined);
        cache[id] = module;
      }
      // set export values for modules that have all dependencies ready
      exportValues();
      parent.removeChild(script);
    };

    script.src = id + ".js";
    parent.appendChild(script);
  }
}
