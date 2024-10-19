import type { Module } from "@/module";

export type FactoryFunction = (...args: any[]) => any;

export type GeneratorFunction = (module: Module) => any;

export type ExportValue = Record<string, any>;
