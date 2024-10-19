import type { Module } from "@/module";
import { cache, pendingModules } from "@/lib";
import { FactoryFunction } from "./types";

/** Get a cached module.
        
        @param {string} id
            Module id.
    */
export function getCached(id: string): Module | undefined {
  if (cache.hasOwnProperty(id)) {
    return cache[id];
  }
}

/** Export module values.
    
        For each module with all dependencies ready, set the
        export value from the factory or exports object.
    */
export function exportValues() {
  let count: number = 0;
  let lastCount: number = 1;

  var i: number,
    j: number,
    module: Module,
    factory: FactoryFunction,
    args: any[],
    id: string,
    value;

  while (count != lastCount) {
    lastCount = count;
    for (i = pendingModules.length; i--; ) {
      module = pendingModules[i];
      if (!module.exportValue && module.checkDependencies()) {
        pendingModules.splice(i, 1);
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
