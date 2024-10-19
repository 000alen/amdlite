define("a", {
  hello: "world",
});

define("b", ["a"], function (a) {
  return {
    hello: `${a.hello}, again!`,
  };
});
