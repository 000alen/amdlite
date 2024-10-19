import type { Module } from "./module";

export const global = globalThis;

/** Loaded modules, keyed by id.
    
        @type {Object.<Module>}
    */
export const cache: Record<string, Module> = {};

/** Names of modules which are loading/loaded.
            
                @type {Object.<boolean>}
            */
export const loads: Record<string, boolean> = {};

/** Modules waiting for dependencies to be exported.
    
  @type {Array.<Module>}
*/
export const pendingModules: Array<Module> = [];

/** New modules since the last script loaded.
    
        @type {Array.<Module>}
    */
export const newModules: Array<Module> = [];
