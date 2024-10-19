import { Context } from "@/context";

const defaultContext = new Context();

const define = defaultContext.define.bind(defaultContext);

const _require = defaultContext.require.bind(defaultContext);

const dynamic = defaultContext.dynamic.bind(defaultContext);

export * from "@/types";
export * from "@/context";
export * from "@/module";
export * from "@/constants";

export { define, _require as require, dynamic };
