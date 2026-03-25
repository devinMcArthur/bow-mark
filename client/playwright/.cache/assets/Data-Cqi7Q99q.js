import { R as React, r as reactExports, g as getApolloContext, i as invariant, a as React$1, c as canUseLayoutEffect, b as canUseWeakSet, m as maybeDeepFreeze, N as NetworkStatus, d as canUseWeakMap, e as equal, f as compact, h as mergeOptions, _ as __rest$1, j as __assign$1, k as isNonEmptyArray, A as ApolloError, l as gql, n as jsxRuntimeExports, B as Box, F as FormControl, o as FormLabel, S as Select$1, p as FormErrorMessage, q as FormHelperText, s as getDefaultExportFromCjs, I as InputGroup, t as InputLeftElement, u as InputLeftAddon, v as Input, w as InputRightElement, x as InputRightAddon, y as requireReact, L as Link$1, C as Center, z as Spinner, D as useOutsideClick, E as Stack, H as Heading, G as NumberInputStepper, J as NumberIncrementStepper, K as NumberDecrementStepper, M as NumberInput, O as NumberInputField, P as Flex, Q as IconButton, T as SimpleGrid, U as Text, V as Badge, W as Alert, X as AlertIcon, Y as AlertDescription } from './index-DKGRvHC7.js';

var IconsManifest = [
  {
    "id": "fa",
    "name": "Font Awesome",
    "projectUrl": "https://fontawesome.com/",
    "license": "CC BY 4.0 License",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"
  },
  {
    "id": "io",
    "name": "Ionicons 4",
    "projectUrl": "https://ionicons.com/",
    "license": "MIT",
    "licenseUrl": "https://github.com/ionic-team/ionicons/blob/master/LICENSE"
  },
  {
    "id": "io5",
    "name": "Ionicons 5",
    "projectUrl": "https://ionicons.com/",
    "license": "MIT",
    "licenseUrl": "https://github.com/ionic-team/ionicons/blob/master/LICENSE"
  },
  {
    "id": "md",
    "name": "Material Design icons",
    "projectUrl": "http://google.github.io/material-design-icons/",
    "license": "Apache License Version 2.0",
    "licenseUrl": "https://github.com/google/material-design-icons/blob/master/LICENSE"
  },
  {
    "id": "ti",
    "name": "Typicons",
    "projectUrl": "http://s-ings.com/typicons/",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "id": "go",
    "name": "Github Octicons icons",
    "projectUrl": "https://octicons.github.com/",
    "license": "MIT",
    "licenseUrl": "https://github.com/primer/octicons/blob/master/LICENSE"
  },
  {
    "id": "fi",
    "name": "Feather",
    "projectUrl": "https://feathericons.com/",
    "license": "MIT",
    "licenseUrl": "https://github.com/feathericons/feather/blob/master/LICENSE"
  },
  {
    "id": "gi",
    "name": "Game Icons",
    "projectUrl": "https://game-icons.net/",
    "license": "CC BY 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/"
  },
  {
    "id": "wi",
    "name": "Weather Icons",
    "projectUrl": "https://erikflowers.github.io/weather-icons/",
    "license": "SIL OFL 1.1",
    "licenseUrl": "http://scripts.sil.org/OFL"
  },
  {
    "id": "di",
    "name": "Devicons",
    "projectUrl": "https://vorillaz.github.io/devicons/",
    "license": "MIT",
    "licenseUrl": "https://opensource.org/licenses/MIT"
  },
  {
    "id": "ai",
    "name": "Ant Design Icons",
    "projectUrl": "https://github.com/ant-design/ant-design-icons",
    "license": "MIT",
    "licenseUrl": "https://opensource.org/licenses/MIT"
  },
  {
    "id": "bs",
    "name": "Bootstrap Icons",
    "projectUrl": "https://github.com/twbs/icons",
    "license": "MIT",
    "licenseUrl": "https://opensource.org/licenses/MIT"
  },
  {
    "id": "ri",
    "name": "Remix Icon",
    "projectUrl": "https://github.com/Remix-Design/RemixIcon",
    "license": "Apache License Version 2.0",
    "licenseUrl": "http://www.apache.org/licenses/"
  },
  {
    "id": "fc",
    "name": "Flat Color Icons",
    "projectUrl": "https://github.com/icons8/flat-color-icons",
    "license": "MIT",
    "licenseUrl": "https://opensource.org/licenses/MIT"
  },
  {
    "id": "gr",
    "name": "Grommet-Icons",
    "projectUrl": "https://github.com/grommet/grommet-icons",
    "license": "Apache License Version 2.0",
    "licenseUrl": "http://www.apache.org/licenses/"
  },
  {
    "id": "hi",
    "name": "Heroicons",
    "projectUrl": "https://github.com/refactoringui/heroicons",
    "license": "MIT",
    "licenseUrl": "https://opensource.org/licenses/MIT"
  },
  {
    "id": "si",
    "name": "Simple Icons",
    "projectUrl": "https://simpleicons.org/",
    "license": "CC0 1.0 Universal",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/"
  },
  {
    "id": "im",
    "name": "IcoMoon Free",
    "projectUrl": "https://github.com/Keyamoon/IcoMoon-Free",
    "license": "CC BY 4.0 License"
  },
  {
    "id": "bi",
    "name": "BoxIcons",
    "projectUrl": "https://github.com/atisawd/boxicons",
    "license": "CC BY 4.0 License"
  },
  {
    "id": "cg",
    "name": "css.gg",
    "projectUrl": "https://github.com/astrit/css.gg",
    "license": "MIT",
    "licenseUrl": "https://opensource.org/licenses/MIT"
  },
  {
    "id": "vsc",
    "name": "VS Code Icons",
    "projectUrl": "https://github.com/microsoft/vscode-codicons",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"
  }
];

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = React.createContext && React.createContext(DefaultContext);

var __assign = undefined && undefined.__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

var __rest = undefined && undefined.__rest || function (s, e) {
  var t = {};

  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];

  if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
    if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
  }
  return t;
};

function Tree2Element(tree) {
  return tree && tree.map(function (node, i) {
    return React.createElement(node.tag, __assign({
      key: i
    }, node.attr), Tree2Element(node.child));
  });
}

function GenIcon(data) {
  return function (props) {
    return React.createElement(IconBase, __assign({
      attr: __assign({}, data.attr)
    }, props), Tree2Element(data.child));
  };
}
function IconBase(props) {
  var elem = function (conf) {
    var attr = props.attr,
        size = props.size,
        title = props.title,
        svgProps = __rest(props, ["attr", "size", "title"]);

    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + ' ' : '') + props.className;
    return React.createElement("svg", __assign({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: __assign(__assign({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && React.createElement("title", null, title), props.children);
  };

  return IconContext !== undefined ? React.createElement(IconContext.Consumer, null, function (conf) {
    return elem(conf);
  }) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FiActivity (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"22 12 18 12 15 21 9 3 6 12 2 12"}}]})(props);
};
function FiAirplay (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"}},{"tag":"polygon","attr":{"points":"12 15 17 21 7 21 12 15"}}]})(props);
};
function FiAlertCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"12","y1":"8","x2":"12","y2":"12"}},{"tag":"line","attr":{"x1":"12","y1":"16","x2":"12.01","y2":"16"}}]})(props);
};
function FiAlertOctagon (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"}},{"tag":"line","attr":{"x1":"12","y1":"8","x2":"12","y2":"12"}},{"tag":"line","attr":{"x1":"12","y1":"16","x2":"12.01","y2":"16"}}]})(props);
};
function FiAlertTriangle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"}},{"tag":"line","attr":{"x1":"12","y1":"9","x2":"12","y2":"13"}},{"tag":"line","attr":{"x1":"12","y1":"17","x2":"12.01","y2":"17"}}]})(props);
};
function FiAlignCenter (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"18","y1":"10","x2":"6","y2":"10"}},{"tag":"line","attr":{"x1":"21","y1":"6","x2":"3","y2":"6"}},{"tag":"line","attr":{"x1":"21","y1":"14","x2":"3","y2":"14"}},{"tag":"line","attr":{"x1":"18","y1":"18","x2":"6","y2":"18"}}]})(props);
};
function FiAlignJustify (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"21","y1":"10","x2":"3","y2":"10"}},{"tag":"line","attr":{"x1":"21","y1":"6","x2":"3","y2":"6"}},{"tag":"line","attr":{"x1":"21","y1":"14","x2":"3","y2":"14"}},{"tag":"line","attr":{"x1":"21","y1":"18","x2":"3","y2":"18"}}]})(props);
};
function FiAlignLeft (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"17","y1":"10","x2":"3","y2":"10"}},{"tag":"line","attr":{"x1":"21","y1":"6","x2":"3","y2":"6"}},{"tag":"line","attr":{"x1":"21","y1":"14","x2":"3","y2":"14"}},{"tag":"line","attr":{"x1":"17","y1":"18","x2":"3","y2":"18"}}]})(props);
};
function FiAlignRight (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"21","y1":"10","x2":"7","y2":"10"}},{"tag":"line","attr":{"x1":"21","y1":"6","x2":"3","y2":"6"}},{"tag":"line","attr":{"x1":"21","y1":"14","x2":"3","y2":"14"}},{"tag":"line","attr":{"x1":"21","y1":"18","x2":"7","y2":"18"}}]})(props);
};
function FiAnchor (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"5","r":"3"}},{"tag":"line","attr":{"x1":"12","y1":"22","x2":"12","y2":"8"}},{"tag":"path","attr":{"d":"M5 12H2a10 10 0 0 0 20 0h-3"}}]})(props);
};
function FiAperture (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"14.31","y1":"8","x2":"20.05","y2":"17.94"}},{"tag":"line","attr":{"x1":"9.69","y1":"8","x2":"21.17","y2":"8"}},{"tag":"line","attr":{"x1":"7.38","y1":"12","x2":"13.12","y2":"2.06"}},{"tag":"line","attr":{"x1":"9.69","y1":"16","x2":"3.95","y2":"6.06"}},{"tag":"line","attr":{"x1":"14.31","y1":"16","x2":"2.83","y2":"16"}},{"tag":"line","attr":{"x1":"16.62","y1":"12","x2":"10.88","y2":"21.94"}}]})(props);
};
function FiArchive (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"21 8 21 21 3 21 3 8"}},{"tag":"rect","attr":{"x":"1","y":"3","width":"22","height":"5"}},{"tag":"line","attr":{"x1":"10","y1":"12","x2":"14","y2":"12"}}]})(props);
};
function FiArrowDownCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"polyline","attr":{"points":"8 12 12 16 16 12"}},{"tag":"line","attr":{"x1":"12","y1":"8","x2":"12","y2":"16"}}]})(props);
};
function FiArrowDownLeft (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"17","y1":"7","x2":"7","y2":"17"}},{"tag":"polyline","attr":{"points":"17 17 7 17 7 7"}}]})(props);
};
function FiArrowDownRight (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"7","y1":"7","x2":"17","y2":"17"}},{"tag":"polyline","attr":{"points":"17 7 17 17 7 17"}}]})(props);
};
function FiArrowDown (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"12","y1":"5","x2":"12","y2":"19"}},{"tag":"polyline","attr":{"points":"19 12 12 19 5 12"}}]})(props);
};
function FiArrowLeftCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"polyline","attr":{"points":"12 8 8 12 12 16"}},{"tag":"line","attr":{"x1":"16","y1":"12","x2":"8","y2":"12"}}]})(props);
};
function FiArrowLeft (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"19","y1":"12","x2":"5","y2":"12"}},{"tag":"polyline","attr":{"points":"12 19 5 12 12 5"}}]})(props);
};
function FiArrowRightCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"polyline","attr":{"points":"12 16 16 12 12 8"}},{"tag":"line","attr":{"x1":"8","y1":"12","x2":"16","y2":"12"}}]})(props);
};
function FiArrowRight (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"5","y1":"12","x2":"19","y2":"12"}},{"tag":"polyline","attr":{"points":"12 5 19 12 12 19"}}]})(props);
};
function FiArrowUpCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"polyline","attr":{"points":"16 12 12 8 8 12"}},{"tag":"line","attr":{"x1":"12","y1":"16","x2":"12","y2":"8"}}]})(props);
};
function FiArrowUpLeft (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"17","y1":"17","x2":"7","y2":"7"}},{"tag":"polyline","attr":{"points":"7 17 7 7 17 7"}}]})(props);
};
function FiArrowUpRight (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"7","y1":"17","x2":"17","y2":"7"}},{"tag":"polyline","attr":{"points":"7 7 17 7 17 17"}}]})(props);
};
function FiArrowUp (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"12","y1":"19","x2":"12","y2":"5"}},{"tag":"polyline","attr":{"points":"5 12 12 5 19 12"}}]})(props);
};
function FiAtSign (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"4"}},{"tag":"path","attr":{"d":"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"}}]})(props);
};
function FiAward (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"8","r":"7"}},{"tag":"polyline","attr":{"points":"8.21 13.89 7 23 12 20 17 23 15.79 13.88"}}]})(props);
};
function FiBarChart2 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"18","y1":"20","x2":"18","y2":"10"}},{"tag":"line","attr":{"x1":"12","y1":"20","x2":"12","y2":"4"}},{"tag":"line","attr":{"x1":"6","y1":"20","x2":"6","y2":"14"}}]})(props);
};
function FiBarChart (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"12","y1":"20","x2":"12","y2":"10"}},{"tag":"line","attr":{"x1":"18","y1":"20","x2":"18","y2":"4"}},{"tag":"line","attr":{"x1":"6","y1":"20","x2":"6","y2":"16"}}]})(props);
};
function FiBatteryCharging (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.19"}},{"tag":"line","attr":{"x1":"23","y1":"13","x2":"23","y2":"11"}},{"tag":"polyline","attr":{"points":"11 6 7 12 13 12 9 18"}}]})(props);
};
function FiBattery (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"1","y":"6","width":"18","height":"12","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"23","y1":"13","x2":"23","y2":"11"}}]})(props);
};
function FiBellOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M13.73 21a2 2 0 0 1-3.46 0"}},{"tag":"path","attr":{"d":"M18.63 13A17.89 17.89 0 0 1 18 8"}},{"tag":"path","attr":{"d":"M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"}},{"tag":"path","attr":{"d":"M18 8a6 6 0 0 0-9.33-5"}},{"tag":"line","attr":{"x1":"1","y1":"1","x2":"23","y2":"23"}}]})(props);
};
function FiBell (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"}},{"tag":"path","attr":{"d":"M13.73 21a2 2 0 0 1-3.46 0"}}]})(props);
};
function FiBluetooth (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"}}]})(props);
};
function FiBold (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"}},{"tag":"path","attr":{"d":"M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"}}]})(props);
};
function FiBookOpen (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"}},{"tag":"path","attr":{"d":"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"}}]})(props);
};
function FiBook (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M4 19.5A2.5 2.5 0 0 1 6.5 17H20"}},{"tag":"path","attr":{"d":"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"}}]})(props);
};
function FiBookmark (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"}}]})(props);
};
function FiBox (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}},{"tag":"polyline","attr":{"points":"3.27 6.96 12 12.01 20.73 6.96"}},{"tag":"line","attr":{"x1":"12","y1":"22.08","x2":"12","y2":"12"}}]})(props);
};
function FiBriefcase (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"2","y":"7","width":"20","height":"14","rx":"2","ry":"2"}},{"tag":"path","attr":{"d":"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"}}]})(props);
};
function FiCalendar (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"4","width":"18","height":"18","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"16","y1":"2","x2":"16","y2":"6"}},{"tag":"line","attr":{"x1":"8","y1":"2","x2":"8","y2":"6"}},{"tag":"line","attr":{"x1":"3","y1":"10","x2":"21","y2":"10"}}]})(props);
};
function FiCameraOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"1","y1":"1","x2":"23","y2":"23"}},{"tag":"path","attr":{"d":"M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"}}]})(props);
};
function FiCamera (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"}},{"tag":"circle","attr":{"cx":"12","cy":"13","r":"4"}}]})(props);
};
function FiCast (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"}},{"tag":"line","attr":{"x1":"2","y1":"20","x2":"2.01","y2":"20"}}]})(props);
};
function FiCheckCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M22 11.08V12a10 10 0 1 1-5.93-9.14"}},{"tag":"polyline","attr":{"points":"22 4 12 14.01 9 11.01"}}]})(props);
};
function FiCheckSquare (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"9 11 12 14 22 4"}},{"tag":"path","attr":{"d":"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"}}]})(props);
};
function FiCheck (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"20 6 9 17 4 12"}}]})(props);
};
function FiChevronDown (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"6 9 12 15 18 9"}}]})(props);
};
function FiChevronLeft (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"15 18 9 12 15 6"}}]})(props);
};
function FiChevronRight (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"9 18 15 12 9 6"}}]})(props);
};
function FiChevronUp (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"18 15 12 9 6 15"}}]})(props);
};
function FiChevronsDown (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"7 13 12 18 17 13"}},{"tag":"polyline","attr":{"points":"7 6 12 11 17 6"}}]})(props);
};
function FiChevronsLeft (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"11 17 6 12 11 7"}},{"tag":"polyline","attr":{"points":"18 17 13 12 18 7"}}]})(props);
};
function FiChevronsRight (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"13 17 18 12 13 7"}},{"tag":"polyline","attr":{"points":"6 17 11 12 6 7"}}]})(props);
};
function FiChevronsUp (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"17 11 12 6 7 11"}},{"tag":"polyline","attr":{"points":"17 18 12 13 7 18"}}]})(props);
};
function FiChrome (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"circle","attr":{"cx":"12","cy":"12","r":"4"}},{"tag":"line","attr":{"x1":"21.17","y1":"8","x2":"12","y2":"8"}},{"tag":"line","attr":{"x1":"3.95","y1":"6.06","x2":"8.54","y2":"14"}},{"tag":"line","attr":{"x1":"10.88","y1":"21.94","x2":"15.46","y2":"14"}}]})(props);
};
function FiCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}}]})(props);
};
function FiClipboard (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}},{"tag":"rect","attr":{"x":"8","y":"2","width":"8","height":"4","rx":"1","ry":"1"}}]})(props);
};
function FiClock (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"polyline","attr":{"points":"12 6 12 12 16 14"}}]})(props);
};
function FiCloudDrizzle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"8","y1":"19","x2":"8","y2":"21"}},{"tag":"line","attr":{"x1":"8","y1":"13","x2":"8","y2":"15"}},{"tag":"line","attr":{"x1":"16","y1":"19","x2":"16","y2":"21"}},{"tag":"line","attr":{"x1":"16","y1":"13","x2":"16","y2":"15"}},{"tag":"line","attr":{"x1":"12","y1":"21","x2":"12","y2":"23"}},{"tag":"line","attr":{"x1":"12","y1":"15","x2":"12","y2":"17"}},{"tag":"path","attr":{"d":"M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"}}]})(props);
};
function FiCloudLightning (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"}},{"tag":"polyline","attr":{"points":"13 11 9 17 15 17 11 23"}}]})(props);
};
function FiCloudOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"}},{"tag":"line","attr":{"x1":"1","y1":"1","x2":"23","y2":"23"}}]})(props);
};
function FiCloudRain (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"16","y1":"13","x2":"16","y2":"21"}},{"tag":"line","attr":{"x1":"8","y1":"13","x2":"8","y2":"21"}},{"tag":"line","attr":{"x1":"12","y1":"15","x2":"12","y2":"23"}},{"tag":"path","attr":{"d":"M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"}}]})(props);
};
function FiCloudSnow (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"}},{"tag":"line","attr":{"x1":"8","y1":"16","x2":"8.01","y2":"16"}},{"tag":"line","attr":{"x1":"8","y1":"20","x2":"8.01","y2":"20"}},{"tag":"line","attr":{"x1":"12","y1":"18","x2":"12.01","y2":"18"}},{"tag":"line","attr":{"x1":"12","y1":"22","x2":"12.01","y2":"22"}},{"tag":"line","attr":{"x1":"16","y1":"16","x2":"16.01","y2":"16"}},{"tag":"line","attr":{"x1":"16","y1":"20","x2":"16.01","y2":"20"}}]})(props);
};
function FiCloud (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"}}]})(props);
};
function FiCode (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"16 18 22 12 16 6"}},{"tag":"polyline","attr":{"points":"8 6 2 12 8 18"}}]})(props);
};
function FiCodepen (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"}},{"tag":"line","attr":{"x1":"12","y1":"22","x2":"12","y2":"15.5"}},{"tag":"polyline","attr":{"points":"22 8.5 12 15.5 2 8.5"}},{"tag":"polyline","attr":{"points":"2 15.5 12 8.5 22 15.5"}},{"tag":"line","attr":{"x1":"12","y1":"2","x2":"12","y2":"8.5"}}]})(props);
};
function FiCodesandbox (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}},{"tag":"polyline","attr":{"points":"7.5 4.21 12 6.81 16.5 4.21"}},{"tag":"polyline","attr":{"points":"7.5 19.79 7.5 14.6 3 12"}},{"tag":"polyline","attr":{"points":"21 12 16.5 14.6 16.5 19.79"}},{"tag":"polyline","attr":{"points":"3.27 6.96 12 12.01 20.73 6.96"}},{"tag":"line","attr":{"x1":"12","y1":"22.08","x2":"12","y2":"12"}}]})(props);
};
function FiCoffee (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M18 8h1a4 4 0 0 1 0 8h-1"}},{"tag":"path","attr":{"d":"M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"}},{"tag":"line","attr":{"x1":"6","y1":"1","x2":"6","y2":"4"}},{"tag":"line","attr":{"x1":"10","y1":"1","x2":"10","y2":"4"}},{"tag":"line","attr":{"x1":"14","y1":"1","x2":"14","y2":"4"}}]})(props);
};
function FiColumns (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"}}]})(props);
};
function FiCommand (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"}}]})(props);
};
function FiCompass (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"polygon","attr":{"points":"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"}}]})(props);
};
function FiCopy (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"9","y":"9","width":"13","height":"13","rx":"2","ry":"2"}},{"tag":"path","attr":{"d":"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"}}]})(props);
};
function FiCornerDownLeft (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"9 10 4 15 9 20"}},{"tag":"path","attr":{"d":"M20 4v7a4 4 0 0 1-4 4H4"}}]})(props);
};
function FiCornerDownRight (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"15 10 20 15 15 20"}},{"tag":"path","attr":{"d":"M4 4v7a4 4 0 0 0 4 4h12"}}]})(props);
};
function FiCornerLeftDown (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"14 15 9 20 4 15"}},{"tag":"path","attr":{"d":"M20 4h-7a4 4 0 0 0-4 4v12"}}]})(props);
};
function FiCornerLeftUp (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"14 9 9 4 4 9"}},{"tag":"path","attr":{"d":"M20 20h-7a4 4 0 0 1-4-4V4"}}]})(props);
};
function FiCornerRightDown (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"10 15 15 20 20 15"}},{"tag":"path","attr":{"d":"M4 4h7a4 4 0 0 1 4 4v12"}}]})(props);
};
function FiCornerRightUp (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"10 9 15 4 20 9"}},{"tag":"path","attr":{"d":"M4 20h7a4 4 0 0 0 4-4V4"}}]})(props);
};
function FiCornerUpLeft (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"9 14 4 9 9 4"}},{"tag":"path","attr":{"d":"M20 20v-7a4 4 0 0 0-4-4H4"}}]})(props);
};
function FiCornerUpRight (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"15 14 20 9 15 4"}},{"tag":"path","attr":{"d":"M4 20v-7a4 4 0 0 1 4-4h12"}}]})(props);
};
function FiCpu (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"4","y":"4","width":"16","height":"16","rx":"2","ry":"2"}},{"tag":"rect","attr":{"x":"9","y":"9","width":"6","height":"6"}},{"tag":"line","attr":{"x1":"9","y1":"1","x2":"9","y2":"4"}},{"tag":"line","attr":{"x1":"15","y1":"1","x2":"15","y2":"4"}},{"tag":"line","attr":{"x1":"9","y1":"20","x2":"9","y2":"23"}},{"tag":"line","attr":{"x1":"15","y1":"20","x2":"15","y2":"23"}},{"tag":"line","attr":{"x1":"20","y1":"9","x2":"23","y2":"9"}},{"tag":"line","attr":{"x1":"20","y1":"14","x2":"23","y2":"14"}},{"tag":"line","attr":{"x1":"1","y1":"9","x2":"4","y2":"9"}},{"tag":"line","attr":{"x1":"1","y1":"14","x2":"4","y2":"14"}}]})(props);
};
function FiCreditCard (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"1","y":"4","width":"22","height":"16","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"1","y1":"10","x2":"23","y2":"10"}}]})(props);
};
function FiCrop (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M6.13 1L6 16a2 2 0 0 0 2 2h15"}},{"tag":"path","attr":{"d":"M1 6.13L16 6a2 2 0 0 1 2 2v15"}}]})(props);
};
function FiCrosshair (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"22","y1":"12","x2":"18","y2":"12"}},{"tag":"line","attr":{"x1":"6","y1":"12","x2":"2","y2":"12"}},{"tag":"line","attr":{"x1":"12","y1":"6","x2":"12","y2":"2"}},{"tag":"line","attr":{"x1":"12","y1":"22","x2":"12","y2":"18"}}]})(props);
};
function FiDatabase (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"ellipse","attr":{"cx":"12","cy":"5","rx":"9","ry":"3"}},{"tag":"path","attr":{"d":"M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"}},{"tag":"path","attr":{"d":"M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"}}]})(props);
};
function FiDelete (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"}},{"tag":"line","attr":{"x1":"18","y1":"9","x2":"12","y2":"15"}},{"tag":"line","attr":{"x1":"12","y1":"9","x2":"18","y2":"15"}}]})(props);
};
function FiDisc (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"circle","attr":{"cx":"12","cy":"12","r":"3"}}]})(props);
};
function FiDivideCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"8","y1":"12","x2":"16","y2":"12"}},{"tag":"line","attr":{"x1":"12","y1":"16","x2":"12","y2":"16"}},{"tag":"line","attr":{"x1":"12","y1":"8","x2":"12","y2":"8"}},{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}}]})(props);
};
function FiDivideSquare (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"18","height":"18","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"8","y1":"12","x2":"16","y2":"12"}},{"tag":"line","attr":{"x1":"12","y1":"16","x2":"12","y2":"16"}},{"tag":"line","attr":{"x1":"12","y1":"8","x2":"12","y2":"8"}}]})(props);
};
function FiDivide (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"6","r":"2"}},{"tag":"line","attr":{"x1":"5","y1":"12","x2":"19","y2":"12"}},{"tag":"circle","attr":{"cx":"12","cy":"18","r":"2"}}]})(props);
};
function FiDollarSign (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"12","y1":"1","x2":"12","y2":"23"}},{"tag":"path","attr":{"d":"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"}}]})(props);
};
function FiDownloadCloud (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"8 17 12 21 16 17"}},{"tag":"line","attr":{"x1":"12","y1":"12","x2":"12","y2":"21"}},{"tag":"path","attr":{"d":"M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"}}]})(props);
};
function FiDownload (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}},{"tag":"polyline","attr":{"points":"7 10 12 15 17 10"}},{"tag":"line","attr":{"x1":"12","y1":"15","x2":"12","y2":"3"}}]})(props);
};
function FiDribbble (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"path","attr":{"d":"M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"}}]})(props);
};
function FiDroplet (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"}}]})(props);
};
function FiEdit2 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"}}]})(props);
};
function FiEdit3 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M12 20h9"}},{"tag":"path","attr":{"d":"M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"}}]})(props);
};
function FiEdit (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}},{"tag":"path","attr":{"d":"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"}}]})(props);
};
function FiExternalLink (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}},{"tag":"polyline","attr":{"points":"15 3 21 3 21 9"}},{"tag":"line","attr":{"x1":"10","y1":"14","x2":"21","y2":"3"}}]})(props);
};
function FiEyeOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"}},{"tag":"line","attr":{"x1":"1","y1":"1","x2":"23","y2":"23"}}]})(props);
};
function FiEye (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}},{"tag":"circle","attr":{"cx":"12","cy":"12","r":"3"}}]})(props);
};
function FiFacebook (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"}}]})(props);
};
function FiFastForward (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"13 19 22 12 13 5 13 19"}},{"tag":"polygon","attr":{"points":"2 19 11 12 2 5 2 19"}}]})(props);
};
function FiFeather (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"}},{"tag":"line","attr":{"x1":"16","y1":"8","x2":"2","y2":"22"}},{"tag":"line","attr":{"x1":"17.5","y1":"15","x2":"9","y2":"15"}}]})(props);
};
function FiFigma (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"}},{"tag":"path","attr":{"d":"M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"}},{"tag":"path","attr":{"d":"M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"}},{"tag":"path","attr":{"d":"M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"}},{"tag":"path","attr":{"d":"M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"}}]})(props);
};
function FiFileMinus (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}},{"tag":"polyline","attr":{"points":"14 2 14 8 20 8"}},{"tag":"line","attr":{"x1":"9","y1":"15","x2":"15","y2":"15"}}]})(props);
};
function FiFilePlus (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}},{"tag":"polyline","attr":{"points":"14 2 14 8 20 8"}},{"tag":"line","attr":{"x1":"12","y1":"18","x2":"12","y2":"12"}},{"tag":"line","attr":{"x1":"9","y1":"15","x2":"15","y2":"15"}}]})(props);
};
function FiFileText (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}},{"tag":"polyline","attr":{"points":"14 2 14 8 20 8"}},{"tag":"line","attr":{"x1":"16","y1":"13","x2":"8","y2":"13"}},{"tag":"line","attr":{"x1":"16","y1":"17","x2":"8","y2":"17"}},{"tag":"polyline","attr":{"points":"10 9 9 9 8 9"}}]})(props);
};
function FiFile (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"}},{"tag":"polyline","attr":{"points":"13 2 13 9 20 9"}}]})(props);
};
function FiFilm (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"2","y":"2","width":"20","height":"20","rx":"2.18","ry":"2.18"}},{"tag":"line","attr":{"x1":"7","y1":"2","x2":"7","y2":"22"}},{"tag":"line","attr":{"x1":"17","y1":"2","x2":"17","y2":"22"}},{"tag":"line","attr":{"x1":"2","y1":"12","x2":"22","y2":"12"}},{"tag":"line","attr":{"x1":"2","y1":"7","x2":"7","y2":"7"}},{"tag":"line","attr":{"x1":"2","y1":"17","x2":"7","y2":"17"}},{"tag":"line","attr":{"x1":"17","y1":"17","x2":"22","y2":"17"}},{"tag":"line","attr":{"x1":"17","y1":"7","x2":"22","y2":"7"}}]})(props);
};
function FiFilter (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"}}]})(props);
};
function FiFlag (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}},{"tag":"line","attr":{"x1":"4","y1":"22","x2":"4","y2":"15"}}]})(props);
};
function FiFolderMinus (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"}},{"tag":"line","attr":{"x1":"9","y1":"14","x2":"15","y2":"14"}}]})(props);
};
function FiFolderPlus (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"}},{"tag":"line","attr":{"x1":"12","y1":"11","x2":"12","y2":"17"}},{"tag":"line","attr":{"x1":"9","y1":"14","x2":"15","y2":"14"}}]})(props);
};
function FiFolder (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"}}]})(props);
};
function FiFramer (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M5 16V9h14V2H5l14 14h-7m-7 0l7 7v-7m-7 0h7"}}]})(props);
};
function FiFrown (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"path","attr":{"d":"M16 16s-1.5-2-4-2-4 2-4 2"}},{"tag":"line","attr":{"x1":"9","y1":"9","x2":"9.01","y2":"9"}},{"tag":"line","attr":{"x1":"15","y1":"9","x2":"15.01","y2":"9"}}]})(props);
};
function FiGift (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"20 12 20 22 4 22 4 12"}},{"tag":"rect","attr":{"x":"2","y":"7","width":"20","height":"5"}},{"tag":"line","attr":{"x1":"12","y1":"22","x2":"12","y2":"7"}},{"tag":"path","attr":{"d":"M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"}},{"tag":"path","attr":{"d":"M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"}}]})(props);
};
function FiGitBranch (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"6","y1":"3","x2":"6","y2":"15"}},{"tag":"circle","attr":{"cx":"18","cy":"6","r":"3"}},{"tag":"circle","attr":{"cx":"6","cy":"18","r":"3"}},{"tag":"path","attr":{"d":"M18 9a9 9 0 0 1-9 9"}}]})(props);
};
function FiGitCommit (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"4"}},{"tag":"line","attr":{"x1":"1.05","y1":"12","x2":"7","y2":"12"}},{"tag":"line","attr":{"x1":"17.01","y1":"12","x2":"22.96","y2":"12"}}]})(props);
};
function FiGitMerge (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"18","cy":"18","r":"3"}},{"tag":"circle","attr":{"cx":"6","cy":"6","r":"3"}},{"tag":"path","attr":{"d":"M6 21V9a9 9 0 0 0 9 9"}}]})(props);
};
function FiGitPullRequest (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"18","cy":"18","r":"3"}},{"tag":"circle","attr":{"cx":"6","cy":"6","r":"3"}},{"tag":"path","attr":{"d":"M13 6h3a2 2 0 0 1 2 2v7"}},{"tag":"line","attr":{"x1":"6","y1":"9","x2":"6","y2":"21"}}]})(props);
};
function FiGithub (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"}}]})(props);
};
function FiGitlab (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"}}]})(props);
};
function FiGlobe (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"2","y1":"12","x2":"22","y2":"12"}},{"tag":"path","attr":{"d":"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"}}]})(props);
};
function FiGrid (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"7","height":"7"}},{"tag":"rect","attr":{"x":"14","y":"3","width":"7","height":"7"}},{"tag":"rect","attr":{"x":"14","y":"14","width":"7","height":"7"}},{"tag":"rect","attr":{"x":"3","y":"14","width":"7","height":"7"}}]})(props);
};
function FiHardDrive (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"22","y1":"12","x2":"2","y2":"12"}},{"tag":"path","attr":{"d":"M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"}},{"tag":"line","attr":{"x1":"6","y1":"16","x2":"6.01","y2":"16"}},{"tag":"line","attr":{"x1":"10","y1":"16","x2":"10.01","y2":"16"}}]})(props);
};
function FiHash (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"4","y1":"9","x2":"20","y2":"9"}},{"tag":"line","attr":{"x1":"4","y1":"15","x2":"20","y2":"15"}},{"tag":"line","attr":{"x1":"10","y1":"3","x2":"8","y2":"21"}},{"tag":"line","attr":{"x1":"16","y1":"3","x2":"14","y2":"21"}}]})(props);
};
function FiHeadphones (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M3 18v-6a9 9 0 0 1 18 0v6"}},{"tag":"path","attr":{"d":"M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"}}]})(props);
};
function FiHeart (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"}}]})(props);
};
function FiHelpCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"path","attr":{"d":"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}},{"tag":"line","attr":{"x1":"12","y1":"17","x2":"12.01","y2":"17"}}]})(props);
};
function FiHexagon (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}}]})(props);
};
function FiHome (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}},{"tag":"polyline","attr":{"points":"9 22 9 12 15 12 15 22"}}]})(props);
};
function FiImage (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"18","height":"18","rx":"2","ry":"2"}},{"tag":"circle","attr":{"cx":"8.5","cy":"8.5","r":"1.5"}},{"tag":"polyline","attr":{"points":"21 15 16 10 5 21"}}]})(props);
};
function FiInbox (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"22 12 16 12 14 15 10 15 8 12 2 12"}},{"tag":"path","attr":{"d":"M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"}}]})(props);
};
function FiInfo (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"12","y1":"16","x2":"12","y2":"12"}},{"tag":"line","attr":{"x1":"12","y1":"8","x2":"12.01","y2":"8"}}]})(props);
};
function FiInstagram (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"2","y":"2","width":"20","height":"20","rx":"5","ry":"5"}},{"tag":"path","attr":{"d":"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"}},{"tag":"line","attr":{"x1":"17.5","y1":"6.5","x2":"17.51","y2":"6.5"}}]})(props);
};
function FiItalic (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"19","y1":"4","x2":"10","y2":"4"}},{"tag":"line","attr":{"x1":"14","y1":"20","x2":"5","y2":"20"}},{"tag":"line","attr":{"x1":"15","y1":"4","x2":"9","y2":"20"}}]})(props);
};
function FiKey (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"}}]})(props);
};
function FiLayers (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"12 2 2 7 12 12 22 7 12 2"}},{"tag":"polyline","attr":{"points":"2 17 12 22 22 17"}},{"tag":"polyline","attr":{"points":"2 12 12 17 22 12"}}]})(props);
};
function FiLayout (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"18","height":"18","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"3","y1":"9","x2":"21","y2":"9"}},{"tag":"line","attr":{"x1":"9","y1":"21","x2":"9","y2":"9"}}]})(props);
};
function FiLifeBuoy (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"circle","attr":{"cx":"12","cy":"12","r":"4"}},{"tag":"line","attr":{"x1":"4.93","y1":"4.93","x2":"9.17","y2":"9.17"}},{"tag":"line","attr":{"x1":"14.83","y1":"14.83","x2":"19.07","y2":"19.07"}},{"tag":"line","attr":{"x1":"14.83","y1":"9.17","x2":"19.07","y2":"4.93"}},{"tag":"line","attr":{"x1":"14.83","y1":"9.17","x2":"18.36","y2":"5.64"}},{"tag":"line","attr":{"x1":"4.93","y1":"19.07","x2":"9.17","y2":"14.83"}}]})(props);
};
function FiLink2 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"}},{"tag":"line","attr":{"x1":"8","y1":"12","x2":"16","y2":"12"}}]})(props);
};
function FiLink (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}},{"tag":"path","attr":{"d":"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"}}]})(props);
};
function FiLinkedin (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"}},{"tag":"rect","attr":{"x":"2","y":"9","width":"4","height":"12"}},{"tag":"circle","attr":{"cx":"4","cy":"4","r":"2"}}]})(props);
};
function FiList (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"8","y1":"6","x2":"21","y2":"6"}},{"tag":"line","attr":{"x1":"8","y1":"12","x2":"21","y2":"12"}},{"tag":"line","attr":{"x1":"8","y1":"18","x2":"21","y2":"18"}},{"tag":"line","attr":{"x1":"3","y1":"6","x2":"3.01","y2":"6"}},{"tag":"line","attr":{"x1":"3","y1":"12","x2":"3.01","y2":"12"}},{"tag":"line","attr":{"x1":"3","y1":"18","x2":"3.01","y2":"18"}}]})(props);
};
function FiLoader (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"12","y1":"2","x2":"12","y2":"6"}},{"tag":"line","attr":{"x1":"12","y1":"18","x2":"12","y2":"22"}},{"tag":"line","attr":{"x1":"4.93","y1":"4.93","x2":"7.76","y2":"7.76"}},{"tag":"line","attr":{"x1":"16.24","y1":"16.24","x2":"19.07","y2":"19.07"}},{"tag":"line","attr":{"x1":"2","y1":"12","x2":"6","y2":"12"}},{"tag":"line","attr":{"x1":"18","y1":"12","x2":"22","y2":"12"}},{"tag":"line","attr":{"x1":"4.93","y1":"19.07","x2":"7.76","y2":"16.24"}},{"tag":"line","attr":{"x1":"16.24","y1":"7.76","x2":"19.07","y2":"4.93"}}]})(props);
};
function FiLock (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"11","width":"18","height":"11","rx":"2","ry":"2"}},{"tag":"path","attr":{"d":"M7 11V7a5 5 0 0 1 10 0v4"}}]})(props);
};
function FiLogIn (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"}},{"tag":"polyline","attr":{"points":"10 17 15 12 10 7"}},{"tag":"line","attr":{"x1":"15","y1":"12","x2":"3","y2":"12"}}]})(props);
};
function FiLogOut (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}},{"tag":"polyline","attr":{"points":"16 17 21 12 16 7"}},{"tag":"line","attr":{"x1":"21","y1":"12","x2":"9","y2":"12"}}]})(props);
};
function FiMail (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}},{"tag":"polyline","attr":{"points":"22,6 12,13 2,6"}}]})(props);
};
function FiMapPin (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}},{"tag":"circle","attr":{"cx":"12","cy":"10","r":"3"}}]})(props);
};
function FiMap (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"}},{"tag":"line","attr":{"x1":"8","y1":"2","x2":"8","y2":"18"}},{"tag":"line","attr":{"x1":"16","y1":"6","x2":"16","y2":"22"}}]})(props);
};
function FiMaximize2 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"15 3 21 3 21 9"}},{"tag":"polyline","attr":{"points":"9 21 3 21 3 15"}},{"tag":"line","attr":{"x1":"21","y1":"3","x2":"14","y2":"10"}},{"tag":"line","attr":{"x1":"3","y1":"21","x2":"10","y2":"14"}}]})(props);
};
function FiMaximize (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"}}]})(props);
};
function FiMeh (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"8","y1":"15","x2":"16","y2":"15"}},{"tag":"line","attr":{"x1":"9","y1":"9","x2":"9.01","y2":"9"}},{"tag":"line","attr":{"x1":"15","y1":"9","x2":"15.01","y2":"9"}}]})(props);
};
function FiMenu (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"3","y1":"12","x2":"21","y2":"12"}},{"tag":"line","attr":{"x1":"3","y1":"6","x2":"21","y2":"6"}},{"tag":"line","attr":{"x1":"3","y1":"18","x2":"21","y2":"18"}}]})(props);
};
function FiMessageCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"}}]})(props);
};
function FiMessageSquare (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}}]})(props);
};
function FiMicOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"1","y1":"1","x2":"23","y2":"23"}},{"tag":"path","attr":{"d":"M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"}},{"tag":"path","attr":{"d":"M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"}},{"tag":"line","attr":{"x1":"12","y1":"19","x2":"12","y2":"23"}},{"tag":"line","attr":{"x1":"8","y1":"23","x2":"16","y2":"23"}}]})(props);
};
function FiMic (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"}},{"tag":"path","attr":{"d":"M19 10v2a7 7 0 0 1-14 0v-2"}},{"tag":"line","attr":{"x1":"12","y1":"19","x2":"12","y2":"23"}},{"tag":"line","attr":{"x1":"8","y1":"23","x2":"16","y2":"23"}}]})(props);
};
function FiMinimize2 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"4 14 10 14 10 20"}},{"tag":"polyline","attr":{"points":"20 10 14 10 14 4"}},{"tag":"line","attr":{"x1":"14","y1":"10","x2":"21","y2":"3"}},{"tag":"line","attr":{"x1":"3","y1":"21","x2":"10","y2":"14"}}]})(props);
};
function FiMinimize (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"}}]})(props);
};
function FiMinusCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"8","y1":"12","x2":"16","y2":"12"}}]})(props);
};
function FiMinusSquare (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"18","height":"18","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"8","y1":"12","x2":"16","y2":"12"}}]})(props);
};
function FiMinus (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"5","y1":"12","x2":"19","y2":"12"}}]})(props);
};
function FiMonitor (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"2","y":"3","width":"20","height":"14","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"8","y1":"21","x2":"16","y2":"21"}},{"tag":"line","attr":{"x1":"12","y1":"17","x2":"12","y2":"21"}}]})(props);
};
function FiMoon (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"}}]})(props);
};
function FiMoreHorizontal (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"1"}},{"tag":"circle","attr":{"cx":"19","cy":"12","r":"1"}},{"tag":"circle","attr":{"cx":"5","cy":"12","r":"1"}}]})(props);
};
function FiMoreVertical (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"1"}},{"tag":"circle","attr":{"cx":"12","cy":"5","r":"1"}},{"tag":"circle","attr":{"cx":"12","cy":"19","r":"1"}}]})(props);
};
function FiMousePointer (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"}},{"tag":"path","attr":{"d":"M13 13l6 6"}}]})(props);
};
function FiMove (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"5 9 2 12 5 15"}},{"tag":"polyline","attr":{"points":"9 5 12 2 15 5"}},{"tag":"polyline","attr":{"points":"15 19 12 22 9 19"}},{"tag":"polyline","attr":{"points":"19 9 22 12 19 15"}},{"tag":"line","attr":{"x1":"2","y1":"12","x2":"22","y2":"12"}},{"tag":"line","attr":{"x1":"12","y1":"2","x2":"12","y2":"22"}}]})(props);
};
function FiMusic (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M9 18V5l12-2v13"}},{"tag":"circle","attr":{"cx":"6","cy":"18","r":"3"}},{"tag":"circle","attr":{"cx":"18","cy":"16","r":"3"}}]})(props);
};
function FiNavigation2 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"12 2 19 21 12 17 5 21 12 2"}}]})(props);
};
function FiNavigation (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"3 11 22 2 13 21 11 13 3 11"}}]})(props);
};
function FiOctagon (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"}}]})(props);
};
function FiPackage (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"16.5","y1":"9.4","x2":"7.5","y2":"4.21"}},{"tag":"path","attr":{"d":"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}},{"tag":"polyline","attr":{"points":"3.27 6.96 12 12.01 20.73 6.96"}},{"tag":"line","attr":{"x1":"12","y1":"22.08","x2":"12","y2":"12"}}]})(props);
};
function FiPaperclip (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"}}]})(props);
};
function FiPauseCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"10","y1":"15","x2":"10","y2":"9"}},{"tag":"line","attr":{"x1":"14","y1":"15","x2":"14","y2":"9"}}]})(props);
};
function FiPause (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"6","y":"4","width":"4","height":"16"}},{"tag":"rect","attr":{"x":"14","y":"4","width":"4","height":"16"}}]})(props);
};
function FiPenTool (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M12 19l7-7 3 3-7 7-3-3z"}},{"tag":"path","attr":{"d":"M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"}},{"tag":"path","attr":{"d":"M2 2l7.586 7.586"}},{"tag":"circle","attr":{"cx":"11","cy":"11","r":"2"}}]})(props);
};
function FiPercent (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"19","y1":"5","x2":"5","y2":"19"}},{"tag":"circle","attr":{"cx":"6.5","cy":"6.5","r":"2.5"}},{"tag":"circle","attr":{"cx":"17.5","cy":"17.5","r":"2.5"}}]})(props);
};
function FiPhoneCall (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}}]})(props);
};
function FiPhoneForwarded (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"19 1 23 5 19 9"}},{"tag":"line","attr":{"x1":"15","y1":"5","x2":"23","y2":"5"}},{"tag":"path","attr":{"d":"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}}]})(props);
};
function FiPhoneIncoming (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"16 2 16 8 22 8"}},{"tag":"line","attr":{"x1":"23","y1":"1","x2":"16","y2":"8"}},{"tag":"path","attr":{"d":"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}}]})(props);
};
function FiPhoneMissed (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"23","y1":"1","x2":"17","y2":"7"}},{"tag":"line","attr":{"x1":"17","y1":"1","x2":"23","y2":"7"}},{"tag":"path","attr":{"d":"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}}]})(props);
};
function FiPhoneOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"}},{"tag":"line","attr":{"x1":"23","y1":"1","x2":"1","y2":"23"}}]})(props);
};
function FiPhoneOutgoing (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"23 7 23 1 17 1"}},{"tag":"line","attr":{"x1":"16","y1":"8","x2":"23","y2":"1"}},{"tag":"path","attr":{"d":"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}}]})(props);
};
function FiPhone (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}}]})(props);
};
function FiPieChart (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21.21 15.89A10 10 0 1 1 8 2.83"}},{"tag":"path","attr":{"d":"M22 12A10 10 0 0 0 12 2v10z"}}]})(props);
};
function FiPlayCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"polygon","attr":{"points":"10 8 16 12 10 16 10 8"}}]})(props);
};
function FiPlay (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"5 3 19 12 5 21 5 3"}}]})(props);
};
function FiPlusCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"12","y1":"8","x2":"12","y2":"16"}},{"tag":"line","attr":{"x1":"8","y1":"12","x2":"16","y2":"12"}}]})(props);
};
function FiPlusSquare (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"18","height":"18","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"12","y1":"8","x2":"12","y2":"16"}},{"tag":"line","attr":{"x1":"8","y1":"12","x2":"16","y2":"12"}}]})(props);
};
function FiPlus (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"12","y1":"5","x2":"12","y2":"19"}},{"tag":"line","attr":{"x1":"5","y1":"12","x2":"19","y2":"12"}}]})(props);
};
function FiPocket (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z"}},{"tag":"polyline","attr":{"points":"8 10 12 14 16 10"}}]})(props);
};
function FiPower (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M18.36 6.64a9 9 0 1 1-12.73 0"}},{"tag":"line","attr":{"x1":"12","y1":"2","x2":"12","y2":"12"}}]})(props);
};
function FiPrinter (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"6 9 6 2 18 2 18 9"}},{"tag":"path","attr":{"d":"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"}},{"tag":"rect","attr":{"x":"6","y":"14","width":"12","height":"8"}}]})(props);
};
function FiRadio (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"2"}},{"tag":"path","attr":{"d":"M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"}}]})(props);
};
function FiRefreshCcw (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"1 4 1 10 7 10"}},{"tag":"polyline","attr":{"points":"23 20 23 14 17 14"}},{"tag":"path","attr":{"d":"M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"}}]})(props);
};
function FiRefreshCw (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"23 4 23 10 17 10"}},{"tag":"polyline","attr":{"points":"1 20 1 14 7 14"}},{"tag":"path","attr":{"d":"M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"}}]})(props);
};
function FiRepeat (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"17 1 21 5 17 9"}},{"tag":"path","attr":{"d":"M3 11V9a4 4 0 0 1 4-4h14"}},{"tag":"polyline","attr":{"points":"7 23 3 19 7 15"}},{"tag":"path","attr":{"d":"M21 13v2a4 4 0 0 1-4 4H3"}}]})(props);
};
function FiRewind (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"11 19 2 12 11 5 11 19"}},{"tag":"polygon","attr":{"points":"22 19 13 12 22 5 22 19"}}]})(props);
};
function FiRotateCcw (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"1 4 1 10 7 10"}},{"tag":"path","attr":{"d":"M3.51 15a9 9 0 1 0 2.13-9.36L1 10"}}]})(props);
};
function FiRotateCw (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"23 4 23 10 17 10"}},{"tag":"path","attr":{"d":"M20.49 15a9 9 0 1 1-2.12-9.36L23 10"}}]})(props);
};
function FiRss (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M4 11a9 9 0 0 1 9 9"}},{"tag":"path","attr":{"d":"M4 4a16 16 0 0 1 16 16"}},{"tag":"circle","attr":{"cx":"5","cy":"19","r":"1"}}]})(props);
};
function FiSave (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"}},{"tag":"polyline","attr":{"points":"17 21 17 13 7 13 7 21"}},{"tag":"polyline","attr":{"points":"7 3 7 8 15 8"}}]})(props);
};
function FiScissors (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"6","cy":"6","r":"3"}},{"tag":"circle","attr":{"cx":"6","cy":"18","r":"3"}},{"tag":"line","attr":{"x1":"20","y1":"4","x2":"8.12","y2":"15.88"}},{"tag":"line","attr":{"x1":"14.47","y1":"14.48","x2":"20","y2":"20"}},{"tag":"line","attr":{"x1":"8.12","y1":"8.12","x2":"12","y2":"12"}}]})(props);
};
function FiSearch (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"11","cy":"11","r":"8"}},{"tag":"line","attr":{"x1":"21","y1":"21","x2":"16.65","y2":"16.65"}}]})(props);
};
function FiSend (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"22","y1":"2","x2":"11","y2":"13"}},{"tag":"polygon","attr":{"points":"22 2 15 22 11 13 2 9 22 2"}}]})(props);
};
function FiServer (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"2","y":"2","width":"20","height":"8","rx":"2","ry":"2"}},{"tag":"rect","attr":{"x":"2","y":"14","width":"20","height":"8","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"6","y1":"6","x2":"6.01","y2":"6"}},{"tag":"line","attr":{"x1":"6","y1":"18","x2":"6.01","y2":"18"}}]})(props);
};
function FiSettings (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"3"}},{"tag":"path","attr":{"d":"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"}}]})(props);
};
function FiShare2 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"18","cy":"5","r":"3"}},{"tag":"circle","attr":{"cx":"6","cy":"12","r":"3"}},{"tag":"circle","attr":{"cx":"18","cy":"19","r":"3"}},{"tag":"line","attr":{"x1":"8.59","y1":"13.51","x2":"15.42","y2":"17.49"}},{"tag":"line","attr":{"x1":"15.41","y1":"6.51","x2":"8.59","y2":"10.49"}}]})(props);
};
function FiShare (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"}},{"tag":"polyline","attr":{"points":"16 6 12 2 8 6"}},{"tag":"line","attr":{"x1":"12","y1":"2","x2":"12","y2":"15"}}]})(props);
};
function FiShieldOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18"}},{"tag":"path","attr":{"d":"M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38"}},{"tag":"line","attr":{"x1":"1","y1":"1","x2":"23","y2":"23"}}]})(props);
};
function FiShield (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}}]})(props);
};
function FiShoppingBag (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"}},{"tag":"line","attr":{"x1":"3","y1":"6","x2":"21","y2":"6"}},{"tag":"path","attr":{"d":"M16 10a4 4 0 0 1-8 0"}}]})(props);
};
function FiShoppingCart (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"9","cy":"21","r":"1"}},{"tag":"circle","attr":{"cx":"20","cy":"21","r":"1"}},{"tag":"path","attr":{"d":"M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"}}]})(props);
};
function FiShuffle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"16 3 21 3 21 8"}},{"tag":"line","attr":{"x1":"4","y1":"20","x2":"21","y2":"3"}},{"tag":"polyline","attr":{"points":"21 16 21 21 16 21"}},{"tag":"line","attr":{"x1":"15","y1":"15","x2":"21","y2":"21"}},{"tag":"line","attr":{"x1":"4","y1":"4","x2":"9","y2":"9"}}]})(props);
};
function FiSidebar (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"18","height":"18","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"9","y1":"3","x2":"9","y2":"21"}}]})(props);
};
function FiSkipBack (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"19 20 9 12 19 4 19 20"}},{"tag":"line","attr":{"x1":"5","y1":"19","x2":"5","y2":"5"}}]})(props);
};
function FiSkipForward (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"5 4 15 12 5 20 5 4"}},{"tag":"line","attr":{"x1":"19","y1":"5","x2":"19","y2":"19"}}]})(props);
};
function FiSlack (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"}},{"tag":"path","attr":{"d":"M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"}},{"tag":"path","attr":{"d":"M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"}},{"tag":"path","attr":{"d":"M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"}},{"tag":"path","attr":{"d":"M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"}},{"tag":"path","attr":{"d":"M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"}},{"tag":"path","attr":{"d":"M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"}},{"tag":"path","attr":{"d":"M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"}}]})(props);
};
function FiSlash (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"4.93","y1":"4.93","x2":"19.07","y2":"19.07"}}]})(props);
};
function FiSliders (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"4","y1":"21","x2":"4","y2":"14"}},{"tag":"line","attr":{"x1":"4","y1":"10","x2":"4","y2":"3"}},{"tag":"line","attr":{"x1":"12","y1":"21","x2":"12","y2":"12"}},{"tag":"line","attr":{"x1":"12","y1":"8","x2":"12","y2":"3"}},{"tag":"line","attr":{"x1":"20","y1":"21","x2":"20","y2":"16"}},{"tag":"line","attr":{"x1":"20","y1":"12","x2":"20","y2":"3"}},{"tag":"line","attr":{"x1":"1","y1":"14","x2":"7","y2":"14"}},{"tag":"line","attr":{"x1":"9","y1":"8","x2":"15","y2":"8"}},{"tag":"line","attr":{"x1":"17","y1":"16","x2":"23","y2":"16"}}]})(props);
};
function FiSmartphone (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"5","y":"2","width":"14","height":"20","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"12","y1":"18","x2":"12.01","y2":"18"}}]})(props);
};
function FiSmile (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"path","attr":{"d":"M8 14s1.5 2 4 2 4-2 4-2"}},{"tag":"line","attr":{"x1":"9","y1":"9","x2":"9.01","y2":"9"}},{"tag":"line","attr":{"x1":"15","y1":"9","x2":"15.01","y2":"9"}}]})(props);
};
function FiSpeaker (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"4","y":"2","width":"16","height":"20","rx":"2","ry":"2"}},{"tag":"circle","attr":{"cx":"12","cy":"14","r":"4"}},{"tag":"line","attr":{"x1":"12","y1":"6","x2":"12.01","y2":"6"}}]})(props);
};
function FiSquare (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"18","height":"18","rx":"2","ry":"2"}}]})(props);
};
function FiStar (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"}}]})(props);
};
function FiStopCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"rect","attr":{"x":"9","y":"9","width":"6","height":"6"}}]})(props);
};
function FiSun (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"5"}},{"tag":"line","attr":{"x1":"12","y1":"1","x2":"12","y2":"3"}},{"tag":"line","attr":{"x1":"12","y1":"21","x2":"12","y2":"23"}},{"tag":"line","attr":{"x1":"4.22","y1":"4.22","x2":"5.64","y2":"5.64"}},{"tag":"line","attr":{"x1":"18.36","y1":"18.36","x2":"19.78","y2":"19.78"}},{"tag":"line","attr":{"x1":"1","y1":"12","x2":"3","y2":"12"}},{"tag":"line","attr":{"x1":"21","y1":"12","x2":"23","y2":"12"}},{"tag":"line","attr":{"x1":"4.22","y1":"19.78","x2":"5.64","y2":"18.36"}},{"tag":"line","attr":{"x1":"18.36","y1":"5.64","x2":"19.78","y2":"4.22"}}]})(props);
};
function FiSunrise (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M17 18a5 5 0 0 0-10 0"}},{"tag":"line","attr":{"x1":"12","y1":"2","x2":"12","y2":"9"}},{"tag":"line","attr":{"x1":"4.22","y1":"10.22","x2":"5.64","y2":"11.64"}},{"tag":"line","attr":{"x1":"1","y1":"18","x2":"3","y2":"18"}},{"tag":"line","attr":{"x1":"21","y1":"18","x2":"23","y2":"18"}},{"tag":"line","attr":{"x1":"18.36","y1":"11.64","x2":"19.78","y2":"10.22"}},{"tag":"line","attr":{"x1":"23","y1":"22","x2":"1","y2":"22"}},{"tag":"polyline","attr":{"points":"8 6 12 2 16 6"}}]})(props);
};
function FiSunset (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M17 18a5 5 0 0 0-10 0"}},{"tag":"line","attr":{"x1":"12","y1":"9","x2":"12","y2":"2"}},{"tag":"line","attr":{"x1":"4.22","y1":"10.22","x2":"5.64","y2":"11.64"}},{"tag":"line","attr":{"x1":"1","y1":"18","x2":"3","y2":"18"}},{"tag":"line","attr":{"x1":"21","y1":"18","x2":"23","y2":"18"}},{"tag":"line","attr":{"x1":"18.36","y1":"11.64","x2":"19.78","y2":"10.22"}},{"tag":"line","attr":{"x1":"23","y1":"22","x2":"1","y2":"22"}},{"tag":"polyline","attr":{"points":"16 5 12 9 8 5"}}]})(props);
};
function FiTablet (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"4","y":"2","width":"16","height":"20","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"12","y1":"18","x2":"12.01","y2":"18"}}]})(props);
};
function FiTag (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"}},{"tag":"line","attr":{"x1":"7","y1":"7","x2":"7.01","y2":"7"}}]})(props);
};
function FiTarget (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"circle","attr":{"cx":"12","cy":"12","r":"6"}},{"tag":"circle","attr":{"cx":"12","cy":"12","r":"2"}}]})(props);
};
function FiTerminal (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"4 17 10 11 4 5"}},{"tag":"line","attr":{"x1":"12","y1":"19","x2":"20","y2":"19"}}]})(props);
};
function FiThermometer (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"}}]})(props);
};
function FiThumbsDown (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"}}]})(props);
};
function FiThumbsUp (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"}}]})(props);
};
function FiToggleLeft (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"1","y":"5","width":"22","height":"14","rx":"7","ry":"7"}},{"tag":"circle","attr":{"cx":"8","cy":"12","r":"3"}}]})(props);
};
function FiToggleRight (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"1","y":"5","width":"22","height":"14","rx":"7","ry":"7"}},{"tag":"circle","attr":{"cx":"16","cy":"12","r":"3"}}]})(props);
};
function FiTool (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"}}]})(props);
};
function FiTrash2 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"3 6 5 6 21 6"}},{"tag":"path","attr":{"d":"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"}},{"tag":"line","attr":{"x1":"10","y1":"11","x2":"10","y2":"17"}},{"tag":"line","attr":{"x1":"14","y1":"11","x2":"14","y2":"17"}}]})(props);
};
function FiTrash (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"3 6 5 6 21 6"}},{"tag":"path","attr":{"d":"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"}}]})(props);
};
function FiTrello (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"18","height":"18","rx":"2","ry":"2"}},{"tag":"rect","attr":{"x":"7","y":"7","width":"3","height":"9"}},{"tag":"rect","attr":{"x":"14","y":"7","width":"3","height":"5"}}]})(props);
};
function FiTrendingDown (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"23 18 13.5 8.5 8.5 13.5 1 6"}},{"tag":"polyline","attr":{"points":"17 18 23 18 23 12"}}]})(props);
};
function FiTrendingUp (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"23 6 13.5 15.5 8.5 10.5 1 18"}},{"tag":"polyline","attr":{"points":"17 6 23 6 23 12"}}]})(props);
};
function FiTriangle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"}}]})(props);
};
function FiTruck (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"1","y":"3","width":"15","height":"13"}},{"tag":"polygon","attr":{"points":"16 8 20 8 23 11 23 16 16 16 16 8"}},{"tag":"circle","attr":{"cx":"5.5","cy":"18.5","r":"2.5"}},{"tag":"circle","attr":{"cx":"18.5","cy":"18.5","r":"2.5"}}]})(props);
};
function FiTv (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"2","y":"7","width":"20","height":"15","rx":"2","ry":"2"}},{"tag":"polyline","attr":{"points":"17 2 12 7 7 2"}}]})(props);
};
function FiTwitch (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"}}]})(props);
};
function FiTwitter (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"}}]})(props);
};
function FiType (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"4 7 4 4 20 4 20 7"}},{"tag":"line","attr":{"x1":"9","y1":"20","x2":"15","y2":"20"}},{"tag":"line","attr":{"x1":"12","y1":"4","x2":"12","y2":"20"}}]})(props);
};
function FiUmbrella (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"}}]})(props);
};
function FiUnderline (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"}},{"tag":"line","attr":{"x1":"4","y1":"21","x2":"20","y2":"21"}}]})(props);
};
function FiUnlock (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"11","width":"18","height":"11","rx":"2","ry":"2"}},{"tag":"path","attr":{"d":"M7 11V7a5 5 0 0 1 9.9-1"}}]})(props);
};
function FiUploadCloud (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"16 16 12 12 8 16"}},{"tag":"line","attr":{"x1":"12","y1":"12","x2":"12","y2":"21"}},{"tag":"path","attr":{"d":"M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"}},{"tag":"polyline","attr":{"points":"16 16 12 12 8 16"}}]})(props);
};
function FiUpload (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}},{"tag":"polyline","attr":{"points":"17 8 12 3 7 8"}},{"tag":"line","attr":{"x1":"12","y1":"3","x2":"12","y2":"15"}}]})(props);
};
function FiUserCheck (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}},{"tag":"circle","attr":{"cx":"8.5","cy":"7","r":"4"}},{"tag":"polyline","attr":{"points":"17 11 19 13 23 9"}}]})(props);
};
function FiUserMinus (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}},{"tag":"circle","attr":{"cx":"8.5","cy":"7","r":"4"}},{"tag":"line","attr":{"x1":"23","y1":"11","x2":"17","y2":"11"}}]})(props);
};
function FiUserPlus (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}},{"tag":"circle","attr":{"cx":"8.5","cy":"7","r":"4"}},{"tag":"line","attr":{"x1":"20","y1":"8","x2":"20","y2":"14"}},{"tag":"line","attr":{"x1":"23","y1":"11","x2":"17","y2":"11"}}]})(props);
};
function FiUserX (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}},{"tag":"circle","attr":{"cx":"8.5","cy":"7","r":"4"}},{"tag":"line","attr":{"x1":"18","y1":"8","x2":"23","y2":"13"}},{"tag":"line","attr":{"x1":"23","y1":"8","x2":"18","y2":"13"}}]})(props);
};
function FiUser (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}},{"tag":"circle","attr":{"cx":"12","cy":"7","r":"4"}}]})(props);
};
function FiUsers (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}},{"tag":"circle","attr":{"cx":"9","cy":"7","r":"4"}},{"tag":"path","attr":{"d":"M23 21v-2a4 4 0 0 0-3-3.87"}},{"tag":"path","attr":{"d":"M16 3.13a4 4 0 0 1 0 7.75"}}]})(props);
};
function FiVideoOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"}},{"tag":"line","attr":{"x1":"1","y1":"1","x2":"23","y2":"23"}}]})(props);
};
function FiVideo (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"23 7 16 12 23 17 23 7"}},{"tag":"rect","attr":{"x":"1","y":"5","width":"15","height":"14","rx":"2","ry":"2"}}]})(props);
};
function FiVoicemail (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"5.5","cy":"11.5","r":"4.5"}},{"tag":"circle","attr":{"cx":"18.5","cy":"11.5","r":"4.5"}},{"tag":"line","attr":{"x1":"5.5","y1":"16","x2":"18.5","y2":"16"}}]})(props);
};
function FiVolume1 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}},{"tag":"path","attr":{"d":"M15.54 8.46a5 5 0 0 1 0 7.07"}}]})(props);
};
function FiVolume2 (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}},{"tag":"path","attr":{"d":"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"}}]})(props);
};
function FiVolumeX (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}},{"tag":"line","attr":{"x1":"23","y1":"9","x2":"17","y2":"15"}},{"tag":"line","attr":{"x1":"17","y1":"9","x2":"23","y2":"15"}}]})(props);
};
function FiVolume (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}}]})(props);
};
function FiWatch (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"7"}},{"tag":"polyline","attr":{"points":"12 9 12 12 13.5 13.5"}},{"tag":"path","attr":{"d":"M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"}}]})(props);
};
function FiWifiOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"1","y1":"1","x2":"23","y2":"23"}},{"tag":"path","attr":{"d":"M16.72 11.06A10.94 10.94 0 0 1 19 12.55"}},{"tag":"path","attr":{"d":"M5 12.55a10.94 10.94 0 0 1 5.17-2.39"}},{"tag":"path","attr":{"d":"M10.71 5.05A16 16 0 0 1 22.58 9"}},{"tag":"path","attr":{"d":"M1.42 9a15.91 15.91 0 0 1 4.7-2.88"}},{"tag":"path","attr":{"d":"M8.53 16.11a6 6 0 0 1 6.95 0"}},{"tag":"line","attr":{"x1":"12","y1":"20","x2":"12.01","y2":"20"}}]})(props);
};
function FiWifi (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M5 12.55a11 11 0 0 1 14.08 0"}},{"tag":"path","attr":{"d":"M1.42 9a16 16 0 0 1 21.16 0"}},{"tag":"path","attr":{"d":"M8.53 16.11a6 6 0 0 1 6.95 0"}},{"tag":"line","attr":{"x1":"12","y1":"20","x2":"12.01","y2":"20"}}]})(props);
};
function FiWind (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"}}]})(props);
};
function FiXCircle (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"12","cy":"12","r":"10"}},{"tag":"line","attr":{"x1":"15","y1":"9","x2":"9","y2":"15"}},{"tag":"line","attr":{"x1":"9","y1":"9","x2":"15","y2":"15"}}]})(props);
};
function FiXOctagon (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"}},{"tag":"line","attr":{"x1":"15","y1":"9","x2":"9","y2":"15"}},{"tag":"line","attr":{"x1":"9","y1":"9","x2":"15","y2":"15"}}]})(props);
};
function FiXSquare (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"rect","attr":{"x":"3","y":"3","width":"18","height":"18","rx":"2","ry":"2"}},{"tag":"line","attr":{"x1":"9","y1":"9","x2":"15","y2":"15"}},{"tag":"line","attr":{"x1":"15","y1":"9","x2":"9","y2":"15"}}]})(props);
};
function FiX (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"line","attr":{"x1":"18","y1":"6","x2":"6","y2":"18"}},{"tag":"line","attr":{"x1":"6","y1":"6","x2":"18","y2":"18"}}]})(props);
};
function FiYoutube (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"}},{"tag":"polygon","attr":{"points":"9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"}}]})(props);
};
function FiZapOff (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polyline","attr":{"points":"12.41 6.75 13 2 10.57 4.92"}},{"tag":"polyline","attr":{"points":"18.57 12.91 21 10 15.66 10"}},{"tag":"polyline","attr":{"points":"8 8 3 14 12 14 11 22 16 16"}},{"tag":"line","attr":{"x1":"1","y1":"1","x2":"23","y2":"23"}}]})(props);
};
function FiZap (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"polygon","attr":{"points":"13 2 3 14 12 14 11 22 21 10 12 10 13 2"}}]})(props);
};
function FiZoomIn (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"11","cy":"11","r":"8"}},{"tag":"line","attr":{"x1":"21","y1":"21","x2":"16.65","y2":"16.65"}},{"tag":"line","attr":{"x1":"11","y1":"8","x2":"11","y2":"14"}},{"tag":"line","attr":{"x1":"8","y1":"11","x2":"14","y2":"11"}}]})(props);
};
function FiZoomOut (props) {
  return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"circle","attr":{"cx":"11","cy":"11","r":"8"}},{"tag":"line","attr":{"x1":"21","y1":"21","x2":"16.65","y2":"16.65"}},{"tag":"line","attr":{"x1":"8","y1":"11","x2":"14","y2":"11"}}]})(props);
};

"use strict";
const MaterialShipmentVehicleTypes = [
  "Tandem",
  "Truck and Pup",
  "Truck and Tri",
  "Sidewinder",
  "Wagon",
  "Delivered",
  "Live Bottom"
];
const CrewTypes$1 = [
  "Base",
  "Paving",
  "Tech",
  "Shop",
  "Patch",
  "Concrete"
];
const TruckingRateTypes$1 = ["Hours", "Quantity"];

function useApolloClient(override) {
    var context = reactExports.useContext(getApolloContext());
    var client = override || context.client;
    __DEV__ ? invariant(!!client, 'Could not find "client" in the context or passed in as an option. ' +
        'Wrap the root component in an <ApolloProvider>, or pass an ApolloClient ' +
        'instance in via options.') : invariant(!!client, 29);
    return client;
}

var didWarnUncachedGetSnapshot = false;
var uSESKey = "useSyncExternalStore";
var realHook = React$1[uSESKey];
var useSyncExternalStore = realHook || (function (subscribe, getSnapshot, getServerSnapshot) {
    var value = getSnapshot();
    if (__DEV__ &&
        !didWarnUncachedGetSnapshot &&
        value !== getSnapshot()) {
        didWarnUncachedGetSnapshot = true;
        __DEV__ && invariant.error('The result of getSnapshot should be cached to avoid an infinite loop');
    }
    var _a = reactExports.useState({ inst: { value: value, getSnapshot: getSnapshot } }), inst = _a[0].inst, forceUpdate = _a[1];
    if (canUseLayoutEffect) {
        reactExports.useLayoutEffect(function () {
            Object.assign(inst, { value: value, getSnapshot: getSnapshot });
            if (checkIfSnapshotChanged(inst)) {
                forceUpdate({ inst: inst });
            }
        }, [subscribe, value, getSnapshot]);
    }
    else {
        Object.assign(inst, { value: value, getSnapshot: getSnapshot });
    }
    reactExports.useEffect(function () {
        if (checkIfSnapshotChanged(inst)) {
            forceUpdate({ inst: inst });
        }
        return subscribe(function handleStoreChange() {
            if (checkIfSnapshotChanged(inst)) {
                forceUpdate({ inst: inst });
            }
        });
    }, [subscribe]);
    return value;
});
function checkIfSnapshotChanged(_a) {
    var value = _a.value, getSnapshot = _a.getSnapshot;
    try {
        return value !== getSnapshot();
    }
    catch (_b) {
        return true;
    }
}

var DocumentType;
(function (DocumentType) {
    DocumentType[DocumentType["Query"] = 0] = "Query";
    DocumentType[DocumentType["Mutation"] = 1] = "Mutation";
    DocumentType[DocumentType["Subscription"] = 2] = "Subscription";
})(DocumentType || (DocumentType = {}));
var cache = new Map();
function operationName(type) {
    var name;
    switch (type) {
        case DocumentType.Query:
            name = 'Query';
            break;
        case DocumentType.Mutation:
            name = 'Mutation';
            break;
        case DocumentType.Subscription:
            name = 'Subscription';
            break;
    }
    return name;
}
function parser(document) {
    var cached = cache.get(document);
    if (cached)
        return cached;
    var variables, type, name;
    __DEV__ ? invariant(!!document && !!document.kind, "Argument of ".concat(document, " passed to parser was not a valid GraphQL ") +
        "DocumentNode. You may need to use 'graphql-tag' or another method " +
        "to convert your operation into a document") : invariant(!!document && !!document.kind, 30);
    var fragments = [];
    var queries = [];
    var mutations = [];
    var subscriptions = [];
    for (var _i = 0, _a = document.definitions; _i < _a.length; _i++) {
        var x = _a[_i];
        if (x.kind === 'FragmentDefinition') {
            fragments.push(x);
            continue;
        }
        if (x.kind === 'OperationDefinition') {
            switch (x.operation) {
                case 'query':
                    queries.push(x);
                    break;
                case 'mutation':
                    mutations.push(x);
                    break;
                case 'subscription':
                    subscriptions.push(x);
                    break;
            }
        }
    }
    __DEV__ ? invariant(!fragments.length ||
        (queries.length || mutations.length || subscriptions.length), "Passing only a fragment to 'graphql' is not yet supported. " +
        "You must include a query, subscription or mutation as well") : invariant(!fragments.length ||
        (queries.length || mutations.length || subscriptions.length), 31);
    __DEV__ ? invariant(queries.length + mutations.length + subscriptions.length <= 1, "react-apollo only supports a query, subscription, or a mutation per HOC. " +
        "".concat(document, " had ").concat(queries.length, " queries, ").concat(subscriptions.length, " ") +
        "subscriptions and ".concat(mutations.length, " mutations. ") +
        "You can use 'compose' to join multiple operation types to a component") : invariant(queries.length + mutations.length + subscriptions.length <= 1, 32);
    type = queries.length ? DocumentType.Query : DocumentType.Mutation;
    if (!queries.length && !mutations.length)
        type = DocumentType.Subscription;
    var definitions = queries.length
        ? queries
        : mutations.length
            ? mutations
            : subscriptions;
    __DEV__ ? invariant(definitions.length === 1, "react-apollo only supports one definition per HOC. ".concat(document, " had ") +
        "".concat(definitions.length, " definitions. ") +
        "You can use 'compose' to join multiple operation types to a component") : invariant(definitions.length === 1, 33);
    var definition = definitions[0];
    variables = definition.variableDefinitions || [];
    if (definition.name && definition.name.kind === 'Name') {
        name = definition.name.value;
    }
    else {
        name = 'data';
    }
    var payload = { name: name, type: type, variables: variables };
    cache.set(document, payload);
    return payload;
}
function verifyDocumentType(document, type) {
    var operation = parser(document);
    var requiredOperationName = operationName(type);
    var usedOperationName = operationName(operation.type);
    __DEV__ ? invariant(operation.type === type, "Running a ".concat(requiredOperationName, " requires a graphql ") +
        "".concat(requiredOperationName, ", but a ").concat(usedOperationName, " was used instead.")) : invariant(operation.type === type, 34);
}

var hasOwnProperty = Object.prototype.hasOwnProperty;
function useQuery(query, options) {
    if (options === void 0) { options = Object.create(null); }
    return useInternalState(useApolloClient(options.client), query).useQuery(options);
}
function useInternalState(client, query) {
    var stateRef = reactExports.useRef();
    if (!stateRef.current ||
        client !== stateRef.current.client ||
        query !== stateRef.current.query) {
        stateRef.current = new InternalState(client, query, stateRef.current);
    }
    var state = stateRef.current;
    var _a = reactExports.useState(0), _tick = _a[0], setTick = _a[1];
    state.forceUpdate = function () {
        setTick(function (tick) { return tick + 1; });
    };
    return state;
}
var InternalState = (function () {
    function InternalState(client, query, previous) {
        this.client = client;
        this.query = query;
        this.asyncResolveFns = new Set();
        this.optionsToIgnoreOnce = new (canUseWeakSet ? WeakSet : Set)();
        this.ssrDisabledResult = maybeDeepFreeze({
            loading: true,
            data: void 0,
            error: void 0,
            networkStatus: NetworkStatus.loading,
        });
        this.skipStandbyResult = maybeDeepFreeze({
            loading: false,
            data: void 0,
            error: void 0,
            networkStatus: NetworkStatus.ready,
        });
        this.toQueryResultCache = new (canUseWeakMap ? WeakMap : Map)();
        verifyDocumentType(query, DocumentType.Query);
        var previousResult = previous && previous.result;
        var previousData = previousResult && previousResult.data;
        if (previousData) {
            this.previousData = previousData;
        }
    }
    InternalState.prototype.forceUpdate = function () {
        __DEV__ && invariant.warn("Calling default no-op implementation of InternalState#forceUpdate");
    };
    InternalState.prototype.asyncUpdate = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.asyncResolveFns.add(resolve);
            _this.optionsToIgnoreOnce.add(_this.watchQueryOptions);
            _this.forceUpdate();
        });
    };
    InternalState.prototype.useQuery = function (options) {
        var _this = this;
        this.renderPromises = reactExports.useContext(getApolloContext()).renderPromises;
        this.useOptions(options);
        var obsQuery = this.useObservableQuery();
        var result = useSyncExternalStore(reactExports.useCallback(function () {
            if (_this.renderPromises) {
                return function () { };
            }
            var onNext = function () {
                var previousResult = _this.result;
                var result = obsQuery.getCurrentResult();
                if (previousResult &&
                    previousResult.loading === result.loading &&
                    previousResult.networkStatus === result.networkStatus &&
                    equal(previousResult.data, result.data)) {
                    return;
                }
                _this.setResult(result);
            };
            var onError = function (error) {
                var last = obsQuery["last"];
                subscription.unsubscribe();
                try {
                    obsQuery.resetLastResults();
                    subscription = obsQuery.subscribe(onNext, onError);
                }
                finally {
                    obsQuery["last"] = last;
                }
                if (!hasOwnProperty.call(error, 'graphQLErrors')) {
                    throw error;
                }
                var previousResult = _this.result;
                if (!previousResult ||
                    (previousResult && previousResult.loading) ||
                    !equal(error, previousResult.error)) {
                    _this.setResult({
                        data: (previousResult && previousResult.data),
                        error: error,
                        loading: false,
                        networkStatus: NetworkStatus.error,
                    });
                }
            };
            var subscription = obsQuery.subscribe(onNext, onError);
            return function () { return subscription.unsubscribe(); };
        }, [
            obsQuery,
            this.renderPromises,
            this.client.disableNetworkFetches,
        ]), function () { return _this.getCurrentResult(); }, function () { return _this.getCurrentResult(); });
        this.unsafeHandlePartialRefetch(result);
        var queryResult = this.toQueryResult(result);
        if (!queryResult.loading && this.asyncResolveFns.size) {
            this.asyncResolveFns.forEach(function (resolve) { return resolve(queryResult); });
            this.asyncResolveFns.clear();
        }
        return queryResult;
    };
    InternalState.prototype.useOptions = function (options) {
        var _a;
        var watchQueryOptions = this.createWatchQueryOptions(this.queryHookOptions = options);
        var currentWatchQueryOptions = this.watchQueryOptions;
        if (this.optionsToIgnoreOnce.has(currentWatchQueryOptions) ||
            !equal(watchQueryOptions, currentWatchQueryOptions)) {
            this.watchQueryOptions = watchQueryOptions;
            if (currentWatchQueryOptions && this.observable) {
                this.optionsToIgnoreOnce.delete(currentWatchQueryOptions);
                this.observable.reobserve(this.getObsQueryOptions());
                this.previousData = ((_a = this.result) === null || _a === void 0 ? void 0 : _a.data) || this.previousData;
                this.result = void 0;
            }
        }
        this.onCompleted = options.onCompleted || InternalState.prototype.onCompleted;
        this.onError = options.onError || InternalState.prototype.onError;
        if ((this.renderPromises || this.client.disableNetworkFetches) &&
            this.queryHookOptions.ssr === false &&
            !this.queryHookOptions.skip) {
            this.result = this.ssrDisabledResult;
        }
        else if (this.queryHookOptions.skip ||
            this.watchQueryOptions.fetchPolicy === 'standby') {
            this.result = this.skipStandbyResult;
        }
        else if (this.result === this.ssrDisabledResult ||
            this.result === this.skipStandbyResult) {
            this.result = void 0;
        }
    };
    InternalState.prototype.getObsQueryOptions = function () {
        var toMerge = [];
        var globalDefaults = this.client.defaultOptions.watchQuery;
        if (globalDefaults)
            toMerge.push(globalDefaults);
        if (this.queryHookOptions.defaultOptions) {
            toMerge.push(this.queryHookOptions.defaultOptions);
        }
        toMerge.push(compact(this.observable && this.observable.options, this.watchQueryOptions));
        return toMerge.reduce(mergeOptions);
    };
    InternalState.prototype.createWatchQueryOptions = function (_a) {
        var _b;
        if (_a === void 0) { _a = {}; }
        var skip = _a.skip, ssr = _a.ssr, onCompleted = _a.onCompleted, onError = _a.onError, defaultOptions = _a.defaultOptions, otherOptions = __rest$1(_a, ["skip", "ssr", "onCompleted", "onError", "defaultOptions"]);
        var watchQueryOptions = Object.assign(otherOptions, { query: this.query });
        if (this.renderPromises &&
            (watchQueryOptions.fetchPolicy === 'network-only' ||
                watchQueryOptions.fetchPolicy === 'cache-and-network')) {
            watchQueryOptions.fetchPolicy = 'cache-first';
        }
        if (!watchQueryOptions.variables) {
            watchQueryOptions.variables = {};
        }
        if (skip) {
            var _c = watchQueryOptions.fetchPolicy, fetchPolicy = _c === void 0 ? this.getDefaultFetchPolicy() : _c, _d = watchQueryOptions.initialFetchPolicy, initialFetchPolicy = _d === void 0 ? fetchPolicy : _d;
            Object.assign(watchQueryOptions, {
                initialFetchPolicy: initialFetchPolicy,
                fetchPolicy: 'standby',
            });
        }
        else if (!watchQueryOptions.fetchPolicy) {
            watchQueryOptions.fetchPolicy =
                ((_b = this.observable) === null || _b === void 0 ? void 0 : _b.options.initialFetchPolicy) ||
                    this.getDefaultFetchPolicy();
        }
        return watchQueryOptions;
    };
    InternalState.prototype.getDefaultFetchPolicy = function () {
        var _a, _b;
        return (((_a = this.queryHookOptions.defaultOptions) === null || _a === void 0 ? void 0 : _a.fetchPolicy) ||
            ((_b = this.client.defaultOptions.watchQuery) === null || _b === void 0 ? void 0 : _b.fetchPolicy) ||
            "cache-first");
    };
    InternalState.prototype.onCompleted = function (data) { };
    InternalState.prototype.onError = function (error) { };
    InternalState.prototype.useObservableQuery = function () {
        var obsQuery = this.observable =
            this.renderPromises
                && this.renderPromises.getSSRObservable(this.watchQueryOptions)
                || this.observable
                || this.client.watchQuery(this.getObsQueryOptions());
        this.obsQueryFields = reactExports.useMemo(function () { return ({
            refetch: obsQuery.refetch.bind(obsQuery),
            reobserve: obsQuery.reobserve.bind(obsQuery),
            fetchMore: obsQuery.fetchMore.bind(obsQuery),
            updateQuery: obsQuery.updateQuery.bind(obsQuery),
            startPolling: obsQuery.startPolling.bind(obsQuery),
            stopPolling: obsQuery.stopPolling.bind(obsQuery),
            subscribeToMore: obsQuery.subscribeToMore.bind(obsQuery),
        }); }, [obsQuery]);
        var ssrAllowed = !(this.queryHookOptions.ssr === false ||
            this.queryHookOptions.skip);
        if (this.renderPromises && ssrAllowed) {
            this.renderPromises.registerSSRObservable(obsQuery);
            if (obsQuery.getCurrentResult().loading) {
                this.renderPromises.addObservableQueryPromise(obsQuery);
            }
        }
        return obsQuery;
    };
    InternalState.prototype.setResult = function (nextResult) {
        var previousResult = this.result;
        if (previousResult && previousResult.data) {
            this.previousData = previousResult.data;
        }
        this.result = nextResult;
        this.forceUpdate();
        this.handleErrorOrCompleted(nextResult);
    };
    InternalState.prototype.handleErrorOrCompleted = function (result) {
        if (!result.loading) {
            if (result.error) {
                this.onError(result.error);
            }
            else if (result.data) {
                this.onCompleted(result.data);
            }
        }
    };
    InternalState.prototype.getCurrentResult = function () {
        if (!this.result) {
            this.handleErrorOrCompleted(this.result = this.observable.getCurrentResult());
        }
        return this.result;
    };
    InternalState.prototype.toQueryResult = function (result) {
        var queryResult = this.toQueryResultCache.get(result);
        if (queryResult)
            return queryResult;
        var data = result.data, partial = result.partial, resultWithoutPartial = __rest$1(result, ["data", "partial"]);
        this.toQueryResultCache.set(result, queryResult = __assign$1(__assign$1(__assign$1({ data: data }, resultWithoutPartial), this.obsQueryFields), { client: this.client, observable: this.observable, variables: this.observable.variables, called: !this.queryHookOptions.skip, previousData: this.previousData }));
        if (!queryResult.error && isNonEmptyArray(result.errors)) {
            queryResult.error = new ApolloError({ graphQLErrors: result.errors });
        }
        return queryResult;
    };
    InternalState.prototype.unsafeHandlePartialRefetch = function (result) {
        if (result.partial &&
            this.queryHookOptions.partialRefetch &&
            !result.loading &&
            (!result.data || Object.keys(result.data).length === 0) &&
            this.observable.options.fetchPolicy !== 'cache-only') {
            Object.assign(result, {
                loading: true,
                networkStatus: NetworkStatus.refetch,
            });
            this.observable.refetch();
        }
    };
    return InternalState;
}());

var EAGER_METHODS = [
    'refetch',
    'reobserve',
    'fetchMore',
    'updateQuery',
    'startPolling',
    'subscribeToMore',
];
function useLazyQuery(query, options) {
    var internalState = useInternalState(useApolloClient(options && options.client), query);
    var execOptionsRef = reactExports.useRef();
    var merged = execOptionsRef.current
        ? mergeOptions(options, execOptionsRef.current)
        : options;
    var useQueryResult = internalState.useQuery(__assign$1(__assign$1({}, merged), { skip: !execOptionsRef.current }));
    var initialFetchPolicy = useQueryResult.observable.options.initialFetchPolicy ||
        internalState.getDefaultFetchPolicy();
    var result = Object.assign(useQueryResult, {
        called: !!execOptionsRef.current,
    });
    var eagerMethods = reactExports.useMemo(function () {
        var eagerMethods = {};
        var _loop_1 = function (key) {
            var method = result[key];
            eagerMethods[key] = function () {
                if (!execOptionsRef.current) {
                    execOptionsRef.current = Object.create(null);
                    internalState.forceUpdate();
                }
                return method.apply(this, arguments);
            };
        };
        for (var _i = 0, EAGER_METHODS_1 = EAGER_METHODS; _i < EAGER_METHODS_1.length; _i++) {
            var key = EAGER_METHODS_1[_i];
            _loop_1(key);
        }
        return eagerMethods;
    }, []);
    Object.assign(result, eagerMethods);
    var execute = reactExports.useCallback(function (executeOptions) {
        execOptionsRef.current = executeOptions ? __assign$1(__assign$1({}, executeOptions), { fetchPolicy: executeOptions.fetchPolicy || initialFetchPolicy }) : {
            fetchPolicy: initialFetchPolicy,
        };
        var promise = internalState
            .asyncUpdate()
            .then(function (queryResult) { return Object.assign(queryResult, eagerMethods); });
        promise.catch(function () { });
        return promise;
    }, []);
    return [execute, result];
}

function useMutation(mutation, options) {
    var client = useApolloClient(options === null || options === void 0 ? void 0 : options.client);
    verifyDocumentType(mutation, DocumentType.Mutation);
    var _a = reactExports.useState({
        called: false,
        loading: false,
        client: client,
    }), result = _a[0], setResult = _a[1];
    var ref = reactExports.useRef({
        result: result,
        mutationId: 0,
        isMounted: true,
        client: client,
        mutation: mutation,
        options: options,
    });
    {
        Object.assign(ref.current, { client: client, options: options, mutation: mutation });
    }
    var execute = reactExports.useCallback(function (executeOptions) {
        if (executeOptions === void 0) { executeOptions = {}; }
        var _a = ref.current, client = _a.client, options = _a.options, mutation = _a.mutation;
        var baseOptions = __assign$1(__assign$1({}, options), { mutation: mutation });
        if (!ref.current.result.loading && !baseOptions.ignoreResults && ref.current.isMounted) {
            setResult(ref.current.result = {
                loading: true,
                error: void 0,
                data: void 0,
                called: true,
                client: client,
            });
        }
        var mutationId = ++ref.current.mutationId;
        var clientOptions = mergeOptions(baseOptions, executeOptions);
        return client.mutate(clientOptions).then(function (response) {
            var _a, _b, _c;
            var data = response.data, errors = response.errors;
            var error = errors && errors.length > 0
                ? new ApolloError({ graphQLErrors: errors })
                : void 0;
            if (mutationId === ref.current.mutationId &&
                !clientOptions.ignoreResults) {
                var result_1 = {
                    called: true,
                    loading: false,
                    data: data,
                    error: error,
                    client: client,
                };
                if (ref.current.isMounted && !equal(ref.current.result, result_1)) {
                    setResult(ref.current.result = result_1);
                }
            }
            (_b = (_a = ref.current.options) === null || _a === void 0 ? void 0 : _a.onCompleted) === null || _b === void 0 ? void 0 : _b.call(_a, response.data, clientOptions);
            (_c = executeOptions.onCompleted) === null || _c === void 0 ? void 0 : _c.call(executeOptions, response.data, clientOptions);
            return response;
        }).catch(function (error) {
            var _a, _b, _c, _d;
            if (mutationId === ref.current.mutationId &&
                ref.current.isMounted) {
                var result_2 = {
                    loading: false,
                    error: error,
                    data: void 0,
                    called: true,
                    client: client,
                };
                if (!equal(ref.current.result, result_2)) {
                    setResult(ref.current.result = result_2);
                }
            }
            if (((_a = ref.current.options) === null || _a === void 0 ? void 0 : _a.onError) || clientOptions.onError) {
                (_c = (_b = ref.current.options) === null || _b === void 0 ? void 0 : _b.onError) === null || _c === void 0 ? void 0 : _c.call(_b, error, clientOptions);
                (_d = executeOptions.onError) === null || _d === void 0 ? void 0 : _d.call(executeOptions, error, clientOptions);
                return { data: void 0, errors: error };
            }
            throw error;
        });
    }, []);
    var reset = reactExports.useCallback(function () {
        if (ref.current.isMounted) {
            setResult({ called: false, loading: false, client: client });
        }
    }, []);
    reactExports.useEffect(function () {
        ref.current.isMounted = true;
        return function () {
            ref.current.isMounted = false;
        };
    }, []);
    return [execute, __assign$1({ reset: reset }, result)];
}

function useSubscription(subscription, options) {
    var client = useApolloClient(options === null || options === void 0 ? void 0 : options.client);
    verifyDocumentType(subscription, DocumentType.Subscription);
    var _a = reactExports.useState({
        loading: !(options === null || options === void 0 ? void 0 : options.skip),
        error: void 0,
        data: void 0,
        variables: options === null || options === void 0 ? void 0 : options.variables,
    }), result = _a[0], setResult = _a[1];
    var _b = reactExports.useState(function () {
        if (options === null || options === void 0 ? void 0 : options.skip) {
            return null;
        }
        return client.subscribe({
            query: subscription,
            variables: options === null || options === void 0 ? void 0 : options.variables,
            fetchPolicy: options === null || options === void 0 ? void 0 : options.fetchPolicy,
            context: options === null || options === void 0 ? void 0 : options.context,
        });
    }), observable = _b[0], setObservable = _b[1];
    var canResetObservableRef = reactExports.useRef(false);
    reactExports.useEffect(function () {
        return function () {
            canResetObservableRef.current = true;
        };
    }, []);
    var ref = reactExports.useRef({ client: client, subscription: subscription, options: options });
    reactExports.useEffect(function () {
        var _a, _b, _c, _d;
        var shouldResubscribe = options === null || options === void 0 ? void 0 : options.shouldResubscribe;
        if (typeof shouldResubscribe === 'function') {
            shouldResubscribe = !!shouldResubscribe(options);
        }
        if (options === null || options === void 0 ? void 0 : options.skip) {
            if (!(options === null || options === void 0 ? void 0 : options.skip) !== !((_a = ref.current.options) === null || _a === void 0 ? void 0 : _a.skip) || canResetObservableRef.current) {
                setResult({
                    loading: false,
                    data: void 0,
                    error: void 0,
                    variables: options === null || options === void 0 ? void 0 : options.variables,
                });
                setObservable(null);
                canResetObservableRef.current = false;
            }
        }
        else if ((shouldResubscribe !== false &&
            (client !== ref.current.client ||
                subscription !== ref.current.subscription ||
                (options === null || options === void 0 ? void 0 : options.fetchPolicy) !== ((_b = ref.current.options) === null || _b === void 0 ? void 0 : _b.fetchPolicy) ||
                !(options === null || options === void 0 ? void 0 : options.skip) !== !((_c = ref.current.options) === null || _c === void 0 ? void 0 : _c.skip) ||
                !equal(options === null || options === void 0 ? void 0 : options.variables, (_d = ref.current.options) === null || _d === void 0 ? void 0 : _d.variables))) ||
            canResetObservableRef.current) {
            setResult({
                loading: true,
                data: void 0,
                error: void 0,
                variables: options === null || options === void 0 ? void 0 : options.variables,
            });
            setObservable(client.subscribe({
                query: subscription,
                variables: options === null || options === void 0 ? void 0 : options.variables,
                fetchPolicy: options === null || options === void 0 ? void 0 : options.fetchPolicy,
                context: options === null || options === void 0 ? void 0 : options.context,
            }));
            canResetObservableRef.current = false;
        }
        Object.assign(ref.current, { client: client, subscription: subscription, options: options });
    }, [client, subscription, options, canResetObservableRef.current]);
    reactExports.useEffect(function () {
        if (!observable) {
            return;
        }
        var subscription = observable.subscribe({
            next: function (fetchResult) {
                var _a, _b;
                var result = {
                    loading: false,
                    data: fetchResult.data,
                    error: void 0,
                    variables: options === null || options === void 0 ? void 0 : options.variables,
                };
                setResult(result);
                (_b = (_a = ref.current.options) === null || _a === void 0 ? void 0 : _a.onSubscriptionData) === null || _b === void 0 ? void 0 : _b.call(_a, {
                    client: client,
                    subscriptionData: result
                });
            },
            error: function (error) {
                setResult({
                    loading: false,
                    data: void 0,
                    error: error,
                    variables: options === null || options === void 0 ? void 0 : options.variables,
                });
            },
            complete: function () {
                var _a, _b;
                (_b = (_a = ref.current.options) === null || _a === void 0 ? void 0 : _a.onSubscriptionComplete) === null || _b === void 0 ? void 0 : _b.call(_a);
            },
        });
        return function () {
            subscription.unsubscribe();
        };
    }, [observable]);
    return result;
}

function useReactiveVar(rv) {
    var value = rv();
    var setValue = reactExports.useState(value)[1];
    reactExports.useEffect(function () {
        var probablySameValue = rv();
        if (value !== probablySameValue) {
            setValue(probablySameValue);
        }
        else {
            return rv.onNextChange(setValue);
        }
    }, [value]);
    return value;
}

"use strict";
const defaultOptions = {};
var BenchmarkTarget = /* @__PURE__ */ ((BenchmarkTarget2) => {
  BenchmarkTarget2["Crew"] = "CREW";
  BenchmarkTarget2["Jobsite"] = "JOBSITE";
  return BenchmarkTarget2;
})(BenchmarkTarget || {});
var CrewTypes = /* @__PURE__ */ ((CrewTypes2) => {
  CrewTypes2["Base"] = "Base";
  CrewTypes2["BasePrep"] = "BasePrep";
  CrewTypes2["Breakout"] = "Breakout";
  CrewTypes2["BreakoutCb"] = "BreakoutCB";
  CrewTypes2["CatchBasins"] = "CatchBasins";
  CrewTypes2["FormLineSetting"] = "FormLineSetting";
  CrewTypes2["FormTruck"] = "FormTruck";
  CrewTypes2["Other"] = "Other";
  CrewTypes2["Patch"] = "Patch";
  CrewTypes2["Paving"] = "Paving";
  CrewTypes2["Pour"] = "Pour";
  CrewTypes2["Shop"] = "Shop";
  CrewTypes2["Tech"] = "Tech";
  return CrewTypes2;
})(CrewTypes || {});
var DailyReportDateSort = /* @__PURE__ */ ((DailyReportDateSort2) => {
  DailyReportDateSort2["Accending"] = "Accending";
  DailyReportDateSort2["Descending"] = "Descending";
  return DailyReportDateSort2;
})(DailyReportDateSort || {});
var DailyReportListFilter = /* @__PURE__ */ ((DailyReportListFilter2) => {
  DailyReportListFilter2["NoCostApproval"] = "NoCostApproval";
  DailyReportListFilter2["NoPayroll"] = "NoPayroll";
  return DailyReportListFilter2;
})(DailyReportListFilter || {});
var EquipmentUsageUnits = /* @__PURE__ */ ((EquipmentUsageUnits2) => {
  EquipmentUsageUnits2["Hours"] = "hours";
  EquipmentUsageUnits2["Km"] = "km";
  return EquipmentUsageUnits2;
})(EquipmentUsageUnits || {});
var JobsiteMaterialCostModel = /* @__PURE__ */ ((JobsiteMaterialCostModel2) => {
  JobsiteMaterialCostModel2["Invoice"] = "invoice";
  JobsiteMaterialCostModel2["Rate"] = "rate";
  return JobsiteMaterialCostModel2;
})(JobsiteMaterialCostModel || {});
var JobsiteMaterialCostType = /* @__PURE__ */ ((JobsiteMaterialCostType2) => {
  JobsiteMaterialCostType2["DeliveredRate"] = "deliveredRate";
  JobsiteMaterialCostType2["Invoice"] = "invoice";
  JobsiteMaterialCostType2["Rate"] = "rate";
  return JobsiteMaterialCostType2;
})(JobsiteMaterialCostType || {});
var MaterialGrouping = /* @__PURE__ */ ((MaterialGrouping2) => {
  MaterialGrouping2["CrewType"] = "CREW_TYPE";
  MaterialGrouping2["JobTitle"] = "JOB_TITLE";
  MaterialGrouping2["MaterialOnly"] = "MATERIAL_ONLY";
  return MaterialGrouping2;
})(MaterialGrouping || {});
var ReportIssueTypePg = /* @__PURE__ */ ((ReportIssueTypePg2) => {
  ReportIssueTypePg2["EmployeeRateZero"] = "EmployeeRateZero";
  ReportIssueTypePg2["MaterialEstimatedRate"] = "MaterialEstimatedRate";
  ReportIssueTypePg2["MaterialRateZero"] = "MaterialRateZero";
  ReportIssueTypePg2["NonCostedMaterials"] = "NonCostedMaterials";
  ReportIssueTypePg2["VehicleRateZero"] = "VehicleRateZero";
  return ReportIssueTypePg2;
})(ReportIssueTypePg || {});
var ReportIssueTypes = /* @__PURE__ */ ((ReportIssueTypes2) => {
  ReportIssueTypes2["EmployeeRateZero"] = "EmployeeRateZero";
  ReportIssueTypes2["MaterialEstimatedRate"] = "MaterialEstimatedRate";
  ReportIssueTypes2["MaterialRateZero"] = "MaterialRateZero";
  ReportIssueTypes2["NonCostedMaterials"] = "NonCostedMaterials";
  ReportIssueTypes2["VehicleRateZero"] = "VehicleRateZero";
  return ReportIssueTypes2;
})(ReportIssueTypes || {});
var TruckingRateTypes = /* @__PURE__ */ ((TruckingRateTypes2) => {
  TruckingRateTypes2["Hour"] = "Hour";
  TruckingRateTypes2["Quantity"] = "Quantity";
  return TruckingRateTypes2;
})(TruckingRateTypes || {});
var UpdateStatus = /* @__PURE__ */ ((UpdateStatus2) => {
  UpdateStatus2["Pending"] = "Pending";
  UpdateStatus2["Requested"] = "Requested";
  UpdateStatus2["Updated"] = "Updated";
  return UpdateStatus2;
})(UpdateStatus || {});
var UserHomeViewSettings = /* @__PURE__ */ ((UserHomeViewSettings2) => {
  UserHomeViewSettings2["DailyReports"] = "DailyReports";
  UserHomeViewSettings2["GeneralReports"] = "GeneralReports";
  return UserHomeViewSettings2;
})(UserHomeViewSettings || {});
var UserRoles = /* @__PURE__ */ ((UserRoles2) => {
  UserRoles2["Admin"] = "Admin";
  UserRoles2["Developer"] = "Developer";
  UserRoles2["ProjectManager"] = "ProjectManager";
  UserRoles2["User"] = "User";
  return UserRoles2;
})(UserRoles || {});
var UserTypes = /* @__PURE__ */ ((UserTypes2) => {
  UserTypes2["Operations"] = "Operations";
  UserTypes2["VehicleMaintenance"] = "VehicleMaintenance";
  return UserTypes2;
})(UserTypes || {});
var VehicleIssuePriority = /* @__PURE__ */ ((VehicleIssuePriority2) => {
  VehicleIssuePriority2["P0"] = "P0";
  VehicleIssuePriority2["P1"] = "P1";
  VehicleIssuePriority2["P2"] = "P2";
  return VehicleIssuePriority2;
})(VehicleIssuePriority || {});
const CompanyCardSnippetFragmentDoc = gql`
    fragment CompanyCardSnippet on CompanyClass {
  _id
  name
}
    `;
const CompanyFullSnippetFragmentDoc = gql`
    fragment CompanyFullSnippet on CompanyClass {
  ...CompanyCardSnippet
  materialReportYears
  invoiceReportYears
}
    ${CompanyCardSnippetFragmentDoc}`;
const CrewLocationSnippetFragmentDoc = gql`
    fragment CrewLocationSnippet on CrewLocationClass {
  crew {
    _id
    name
  }
  days {
    date
    items {
      jobsiteName
      dailyReportId
    }
  }
}
    `;
const CrewSsrSnippetFragmentDoc = gql`
    fragment CrewSSRSnippet on CrewClass {
  _id
  name
  type
}
    `;
const RateSnippetFragmentDoc = gql`
    fragment RateSnippet on RateClass {
  date
  rate
}
    `;
const EmployeeCardSnippetFragmentDoc = gql`
    fragment EmployeeCardSnippet on EmployeeClass {
  _id
  name
  jobTitle
  rates {
    ...RateSnippet
  }
  archivedAt
}
    ${RateSnippetFragmentDoc}`;
const VehicleCardSnippetFragmentDoc = gql`
    fragment VehicleCardSnippet on VehicleClass {
  _id
  name
  vehicleCode
  vehicleType
  rates {
    ...RateSnippet
  }
  archivedAt
}
    ${RateSnippetFragmentDoc}`;
const CrewFullSnippetFragmentDoc = gql`
    fragment CrewFullSnippet on CrewClass {
  ...CrewSSRSnippet
  employees {
    ...EmployeeCardSnippet
  }
  vehicles {
    ...VehicleCardSnippet
  }
  dailyReports {
    _id
  }
}
    ${CrewSsrSnippetFragmentDoc}
${EmployeeCardSnippetFragmentDoc}
${VehicleCardSnippetFragmentDoc}`;
const MaterialCardSnippetFragmentDoc = gql`
    fragment MaterialCardSnippet on MaterialClass {
  _id
  name
}
    `;
const JobsiteMaterialRateSnippetFragmentDoc = gql`
    fragment JobsiteMaterialRateSnippet on JobsiteMaterialRateClass {
  _id
  rate
  date
  estimated
}
    `;
const JobsiteMaterialDeliveredRateSnippetFragmentDoc = gql`
    fragment JobsiteMaterialDeliveredRateSnippet on JobsiteMaterialDeliveredRateClass {
  _id
  title
  rates {
    ...JobsiteMaterialRateSnippet
  }
}
    ${JobsiteMaterialRateSnippetFragmentDoc}`;
const JobsiteMaterialForDailyReportSnippetFragmentDoc = gql`
    fragment JobsiteMaterialForDailyReportSnippet on JobsiteMaterialClass {
  _id
  material {
    ...MaterialCardSnippet
  }
  supplier {
    ...CompanyCardSnippet
  }
  unit
  costType
  costModel
  delivered
  deliveredRates {
    ...JobsiteMaterialDeliveredRateSnippet
  }
  scenarios {
    _id
    label
    delivered
  }
}
    ${MaterialCardSnippetFragmentDoc}
${CompanyCardSnippetFragmentDoc}
${JobsiteMaterialDeliveredRateSnippetFragmentDoc}`;
const TruckingRateSnippetFragmentDoc = gql`
    fragment TruckingRateSnippet on TruckingRateClass {
  rate
  date
  type
}
    `;
const TruckingTypeRateSnippetFragmentDoc = gql`
    fragment TruckingTypeRateSnippet on TruckingTypeRateClass {
  _id
  title
  rates {
    ...TruckingRateSnippet
  }
}
    ${TruckingRateSnippetFragmentDoc}`;
const FilePreloadSnippetFragmentDoc = gql`
    fragment FilePreloadSnippet on FileClass {
  _id
  mimetype
  description
  downloadUrl
}
    `;
const JobsiteFileObjectPreloadSnippetFragmentDoc = gql`
    fragment JobsiteFileObjectPreloadSnippet on JobsiteFileObjectClass {
  _id
  minRole
  file {
    ...FilePreloadSnippet
  }
}
    ${FilePreloadSnippetFragmentDoc}`;
const JobsiteForDailyReportSnippetFragmentDoc = gql`
    fragment JobsiteForDailyReportSnippet on JobsiteClass {
  _id
  name
  materials {
    ...JobsiteMaterialForDailyReportSnippet
  }
  truckingRates {
    ...TruckingTypeRateSnippet
  }
  fileObjects {
    ...JobsiteFileObjectPreloadSnippet
  }
  enrichedFiles {
    _id
    minRole
    enrichedFile {
      _id
      documentType
      summaryStatus
      summaryError
      pageCount
      summary {
        overview
        documentType
        keyTopics
      }
      file {
        _id
        mimetype
        description
      }
    }
  }
}
    ${JobsiteMaterialForDailyReportSnippetFragmentDoc}
${TruckingTypeRateSnippetFragmentDoc}
${JobsiteFileObjectPreloadSnippetFragmentDoc}`;
const CrewForDailyReportSnippetFragmentDoc = gql`
    fragment CrewForDailyReportSnippet on CrewClass {
  ...CrewSSRSnippet
  employees {
    ...EmployeeCardSnippet
  }
  vehicles {
    ...VehicleCardSnippet
  }
}
    ${CrewSsrSnippetFragmentDoc}
${EmployeeCardSnippetFragmentDoc}
${VehicleCardSnippetFragmentDoc}`;
const EmployeeWorkCardSnippetFragmentDoc = gql`
    fragment EmployeeWorkCardSnippet on EmployeeWorkClass {
  _id
  jobTitle
  employee {
    _id
    name
  }
  startTime
  endTime
}
    `;
const VehicleWorkCardSnippetFragmentDoc = gql`
    fragment VehicleWorkCardSnippet on VehicleWorkClass {
  _id
  hours
  jobTitle
  vehicle {
    _id
    name
  }
}
    `;
const ProductionCardSnippetFragmentDoc = gql`
    fragment ProductionCardSnippet on ProductionClass {
  _id
  jobTitle
  quantity
  unit
  startTime
  endTime
  description
}
    `;
const JobsiteMaterialCardSnippetFragmentDoc = gql`
    fragment JobsiteMaterialCardSnippet on JobsiteMaterialClass {
  _id
  material {
    ...MaterialCardSnippet
  }
  supplier {
    ...CompanyCardSnippet
  }
  quantity
  completedQuantity {
    year
    quantity
  }
  unit
  costType
  costModel
  delivered
  rates {
    ...JobsiteMaterialRateSnippet
  }
  deliveredRates {
    ...JobsiteMaterialDeliveredRateSnippet
  }
  scenarios {
    _id
    label
    delivered
    rates {
      ...JobsiteMaterialRateSnippet
    }
  }
  canRemove
}
    ${MaterialCardSnippetFragmentDoc}
${CompanyCardSnippetFragmentDoc}
${JobsiteMaterialRateSnippetFragmentDoc}
${JobsiteMaterialDeliveredRateSnippetFragmentDoc}`;
const MaterialShipmentCardSnippetFragmentDoc = gql`
    fragment MaterialShipmentCardSnippet on MaterialShipmentClass {
  _id
  shipmentType
  supplier
  quantity
  unit
  startTime
  endTime
  noJobsiteMaterial
  jobsiteMaterial {
    ...JobsiteMaterialCardSnippet
  }
  vehicleObject {
    source
    vehicleType
    vehicleCode
    truckingRateId
    deliveredRateId
  }
  schemaVersion
}
    ${JobsiteMaterialCardSnippetFragmentDoc}`;
const ReportNoteCardSnippetFragmentDoc = gql`
    fragment ReportNoteCardSnippet on ReportNoteClass {
  _id
  note
  files {
    ...FilePreloadSnippet
  }
}
    ${FilePreloadSnippetFragmentDoc}`;
const DailyReportFullSnippetFragmentDoc = gql`
    fragment DailyReportFullSnippet on DailyReportClass {
  _id
  date
  jobCostApproved
  payrollComplete
  jobsite {
    ...JobsiteForDailyReportSnippet
  }
  crew {
    ...CrewForDailyReportSnippet
  }
  employeeWork {
    ...EmployeeWorkCardSnippet
  }
  vehicleWork {
    ...VehicleWorkCardSnippet
  }
  productions {
    ...ProductionCardSnippet
  }
  materialShipments {
    ...MaterialShipmentCardSnippet
  }
  reportNote {
    ...ReportNoteCardSnippet
  }
  temporaryEmployees {
    ...EmployeeCardSnippet
  }
  temporaryVehicles {
    ...VehicleCardSnippet
  }
}
    ${JobsiteForDailyReportSnippetFragmentDoc}
${CrewForDailyReportSnippetFragmentDoc}
${EmployeeWorkCardSnippetFragmentDoc}
${VehicleWorkCardSnippetFragmentDoc}
${ProductionCardSnippetFragmentDoc}
${MaterialShipmentCardSnippetFragmentDoc}
${ReportNoteCardSnippetFragmentDoc}
${EmployeeCardSnippetFragmentDoc}
${VehicleCardSnippetFragmentDoc}`;
const DailyReportCardSnippetFragmentDoc = gql`
    fragment DailyReportCardSnippet on DailyReportClass {
  _id
  date
  jobCostApproved
  payrollComplete
  jobsite {
    _id
    name
    jobcode
  }
  crew {
    _id
    name
  }
}
    `;
const ReportNoteFullSnippetFragmentDoc = gql`
    fragment ReportNoteFullSnippet on ReportNoteClass {
  ...ReportNoteCardSnippet
  dailyReport {
    ...DailyReportCardSnippet
  }
}
    ${ReportNoteCardSnippetFragmentDoc}
${DailyReportCardSnippetFragmentDoc}`;
const DailyReportPdfSnippetFragmentDoc = gql`
    fragment DailyReportPDFSnippet on DailyReportClass {
  date
  crew {
    name
  }
  jobsite {
    name
    jobcode
  }
  employeeWork {
    ...EmployeeWorkCardSnippet
  }
  vehicleWork {
    ...VehicleWorkCardSnippet
  }
  productions {
    ...ProductionCardSnippet
  }
  materialShipments {
    ...MaterialShipmentCardSnippet
  }
  reportNote {
    ...ReportNoteFullSnippet
  }
}
    ${EmployeeWorkCardSnippetFragmentDoc}
${VehicleWorkCardSnippetFragmentDoc}
${ProductionCardSnippetFragmentDoc}
${MaterialShipmentCardSnippetFragmentDoc}
${ReportNoteFullSnippetFragmentDoc}`;
const DailyReportSsrSnippetFragmentDoc = gql`
    fragment DailyReportSSRSnippet on DailyReportClass {
  _id
  jobsite {
    _id
    name
    jobcode
  }
  crew {
    _id
    name
  }
}
    `;
const UserCardSnippetFragmentDoc = gql`
    fragment UserCardSnippet on UserClass {
  _id
  name
  email
  role
  types
  admin
  projectManager
}
    `;
const EmployeeFullSnippetFragmentDoc = gql`
    fragment EmployeeFullSnippet on EmployeeClass {
  ...EmployeeCardSnippet
  user {
    ...UserCardSnippet
  }
  crews {
    _id
    name
  }
  signup {
    _id
  }
}
    ${EmployeeCardSnippetFragmentDoc}
${UserCardSnippetFragmentDoc}`;
const EmployeeSsrSnippetFragmentDoc = gql`
    fragment EmployeeSSRSnippet on EmployeeClass {
  _id
  name
  jobTitle
}
    `;
const EmployeeSearchSnippetFragmentDoc = gql`
    fragment EmployeeSearchSnippet on EmployeeClass {
  _id
  name
}
    `;
const FileFullSnippetFragmentDoc = gql`
    fragment FileFullSnippet on FileClass {
  ...FilePreloadSnippet
  buffer
}
    ${FilePreloadSnippetFragmentDoc}`;
const InvoiceCardSnippetFragmentDoc = gql`
    fragment InvoiceCardSnippet on InvoiceClass {
  _id
  company {
    ...CompanyCardSnippet
  }
  date
  invoiceNumber
  cost
  description
  internal
  accrual
}
    ${CompanyCardSnippetFragmentDoc}`;
const JobsiteCardSnippetFragmentDoc = gql`
    fragment JobsiteCardSnippet on JobsiteClass {
  _id
  name
  jobcode
}
    `;
const InvoiceFullSnippetFragmentDoc = gql`
    fragment InvoiceFullSnippet on InvoiceClass {
  ...InvoiceCardSnippet
  jobsite {
    ...JobsiteCardSnippet
  }
  jobsiteMaterial {
    ...JobsiteMaterialCardSnippet
  }
}
    ${InvoiceCardSnippetFragmentDoc}
${JobsiteCardSnippetFragmentDoc}
${JobsiteMaterialCardSnippetFragmentDoc}`;
const JobsiteDayReportEmployeeSnippetFragmentDoc = gql`
    fragment JobsiteDayReportEmployeeSnippet on EmployeeReportClass {
  _id
  employeeRecord {
    ...EmployeeCardSnippet
  }
  employeeWorkRecord {
    jobTitle
  }
}
    ${EmployeeCardSnippetFragmentDoc}`;
const JobsiteDayReportEmployeeNoFetchSnippetFragmentDoc = gql`
    fragment JobsiteDayReportEmployeeNoFetchSnippet on EmployeeReportClass {
  _id
  employee
  employeeWork
  rate
  hours
  crewType
}
    `;
const JobsiteDayReportEmployeeFullSnippetFragmentDoc = gql`
    fragment JobsiteDayReportEmployeeFullSnippet on EmployeeReportClass {
  ...JobsiteDayReportEmployeeSnippet
  ...JobsiteDayReportEmployeeNoFetchSnippet
}
    ${JobsiteDayReportEmployeeSnippetFragmentDoc}
${JobsiteDayReportEmployeeNoFetchSnippetFragmentDoc}`;
const JobsiteDayReportMaterialNoFetchSnippetFragmentDoc = gql`
    fragment JobsiteDayReportMaterialNoFetchSnippet on MaterialReportClass {
  _id
  jobsiteMaterial
  deliveredRateId
  rate
  quantity
  crewType
}
    `;
const JobsiteDayReportMaterialSnippetFragmentDoc = gql`
    fragment JobsiteDayReportMaterialSnippet on MaterialReportClass {
  _id
  jobsiteMaterialRecord {
    ...JobsiteMaterialCardSnippet
  }
}
    ${JobsiteMaterialCardSnippetFragmentDoc}`;
const JobsiteDayReportMaterialFullSnippetFragmentDoc = gql`
    fragment JobsiteDayReportMaterialFullSnippet on MaterialReportClass {
  ...JobsiteDayReportMaterialNoFetchSnippet
  ...JobsiteDayReportMaterialSnippet
}
    ${JobsiteDayReportMaterialNoFetchSnippetFragmentDoc}
${JobsiteDayReportMaterialSnippetFragmentDoc}`;
const JobsiteDayReportVehicleSnippetFragmentDoc = gql`
    fragment JobsiteDayReportVehicleSnippet on VehicleReportClass {
  _id
  vehicleRecord {
    ...VehicleCardSnippet
  }
  vehicleWorkRecord {
    jobTitle
  }
}
    ${VehicleCardSnippetFragmentDoc}`;
const JobsiteDayReportVehicleNoFetchSnippetFragmentDoc = gql`
    fragment JobsiteDayReportVehicleNoFetchSnippet on VehicleReportClass {
  _id
  vehicle
  vehicleWork
  rate
  hours
  crewType
}
    `;
const JobsiteDayReportVehicleFullSnippetFragmentDoc = gql`
    fragment JobsiteDayReportVehicleFullSnippet on VehicleReportClass {
  ...JobsiteDayReportVehicleSnippet
  ...JobsiteDayReportVehicleNoFetchSnippet
}
    ${JobsiteDayReportVehicleSnippetFragmentDoc}
${JobsiteDayReportVehicleNoFetchSnippetFragmentDoc}`;
const JobsiteDayReportFetchSnippetFragmentDoc = gql`
    fragment JobsiteDayReportFetchSnippet on JobsiteDayReportClass {
  employees {
    ...JobsiteDayReportEmployeeSnippet
  }
  vehicles {
    ...JobsiteDayReportVehicleSnippet
  }
  materials {
    ...JobsiteDayReportMaterialSnippet
  }
}
    ${JobsiteDayReportEmployeeSnippetFragmentDoc}
${JobsiteDayReportVehicleSnippetFragmentDoc}
${JobsiteDayReportMaterialSnippetFragmentDoc}`;
const JobsiteDayReportNonCostedMaterialSnippetFragmentDoc = gql`
    fragment JobsiteDayReportNonCostedMaterialSnippet on NonCostedMaterialReportClass {
  _id
  materialName
  supplierName
  quantity
  crewType
}
    `;
const JobsiteDayReportTruckingSnippetFragmentDoc = gql`
    fragment JobsiteDayReportTruckingSnippet on TruckingReportClass {
  _id
  truckingType
  quantity
  hours
  type
  rate
  crewType
}
    `;
const OnSiteSummaryReportSnippetFragmentDoc = gql`
    fragment OnSiteSummaryReportSnippet on OnSiteSummaryReportClass {
  crewTypeSummaries {
    crewType
    employeeHours
    employeeCost
    vehicleHours
    vehicleCost
    materialQuantity
    materialCost
    nonCostedMaterialQuantity
    truckingQuantity
    truckingHours
    truckingCost
  }
  employeeHours
  employeeCost
  vehicleHours
  vehicleCost
  materialQuantity
  materialCost
  nonCostedMaterialQuantity
  truckingQuantity
  truckingHours
  truckingCost
}
    `;
const JobsiteDayReportNoFetchSnippetFragmentDoc = gql`
    fragment JobsiteDayReportNoFetchSnippet on JobsiteDayReportClass {
  _id
  date
  crewTypes
  employees {
    ...JobsiteDayReportEmployeeNoFetchSnippet
  }
  vehicles {
    ...JobsiteDayReportVehicleNoFetchSnippet
  }
  materials {
    ...JobsiteDayReportMaterialNoFetchSnippet
  }
  nonCostedMaterials {
    ...JobsiteDayReportNonCostedMaterialSnippet
  }
  trucking {
    ...JobsiteDayReportTruckingSnippet
  }
  summary {
    ...OnSiteSummaryReportSnippet
  }
}
    ${JobsiteDayReportEmployeeNoFetchSnippetFragmentDoc}
${JobsiteDayReportVehicleNoFetchSnippetFragmentDoc}
${JobsiteDayReportMaterialNoFetchSnippetFragmentDoc}
${JobsiteDayReportNonCostedMaterialSnippetFragmentDoc}
${JobsiteDayReportTruckingSnippetFragmentDoc}
${OnSiteSummaryReportSnippetFragmentDoc}`;
const JobsiteDayReportFullSnippetFragmentDoc = gql`
    fragment JobsiteDayReportFullSnippet on JobsiteDayReportClass {
  ...JobsiteDayReportFetchSnippet
  ...JobsiteDayReportNoFetchSnippet
}
    ${JobsiteDayReportFetchSnippetFragmentDoc}
${JobsiteDayReportNoFetchSnippetFragmentDoc}`;
const JobsiteMaterialInvoiceSnippetFragmentDoc = gql`
    fragment JobsiteMaterialInvoiceSnippet on JobsiteMaterialClass {
  _id
  invoices {
    ...InvoiceCardSnippet
  }
}
    ${InvoiceCardSnippetFragmentDoc}`;
const JobsiteMonthReportFetchSnippetFragmentDoc = gql`
    fragment JobsiteMonthReportFetchSnippet on JobsiteMonthReportClass {
  dayReports {
    ...JobsiteDayReportFetchSnippet
  }
}
    ${JobsiteDayReportFetchSnippetFragmentDoc}`;
const UpdateSnippetFragmentDoc = gql`
    fragment UpdateSnippet on UpdateClass {
  status
  lastUpdatedAt
}
    `;
const JobsiteMonthReportCardSnippetFragmentDoc = gql`
    fragment JobsiteMonthReportCardSnippet on JobsiteMonthReportClass {
  _id
  startOfMonth
  update {
    ...UpdateSnippet
  }
  jobsite {
    ...JobsiteCardSnippet
  }
}
    ${UpdateSnippetFragmentDoc}
${JobsiteCardSnippetFragmentDoc}`;
const JobsiteDayReportInvoiceSnippetFragmentDoc = gql`
    fragment JobsiteDayReportInvoiceSnippet on InvoiceReportClass {
  _id
  invoice {
    ...InvoiceCardSnippet
  }
  value
  internal
  accrual
}
    ${InvoiceCardSnippetFragmentDoc}`;
const ReportIssueSnippetFragmentDoc = gql`
    fragment ReportIssueSnippet on ReportIssueFullClass {
  _id
  type
  employee {
    ...EmployeeCardSnippet
  }
  vehicle {
    ...VehicleCardSnippet
  }
  jobsiteMaterial {
    ...JobsiteMaterialCardSnippet
    jobsite {
      _id
    }
  }
  amount
}
    ${EmployeeCardSnippetFragmentDoc}
${VehicleCardSnippetFragmentDoc}
${JobsiteMaterialCardSnippetFragmentDoc}`;
const JobsiteMonthReportNoFetchSnippetFragmentDoc = gql`
    fragment JobsiteMonthReportNoFetchSnippet on JobsiteMonthReportClass {
  ...JobsiteMonthReportCardSnippet
  crewTypes
  dayReports {
    ...JobsiteDayReportNoFetchSnippet
  }
  expenseInvoices {
    ...JobsiteDayReportInvoiceSnippet
  }
  revenueInvoices {
    ...JobsiteDayReportInvoiceSnippet
  }
  summary {
    externalExpenseInvoiceValue
    internalExpenseInvoiceValue
    accrualExpenseInvoiceValue
    externalRevenueInvoiceValue
    internalRevenueInvoiceValue
    accrualRevenueInvoiceValue
  }
  issues {
    ...ReportIssueSnippet
  }
  excelDownloadUrl
  reportNotes {
    ...ReportNoteFullSnippet
  }
}
    ${JobsiteMonthReportCardSnippetFragmentDoc}
${JobsiteDayReportNoFetchSnippetFragmentDoc}
${JobsiteDayReportInvoiceSnippetFragmentDoc}
${ReportIssueSnippetFragmentDoc}
${ReportNoteFullSnippetFragmentDoc}`;
const JobsiteYearMasterReportCardSnippetFragmentDoc = gql`
    fragment JobsiteYearMasterReportCardSnippet on JobsiteYearMasterReportClass {
  _id
  startOfYear
  update {
    ...UpdateSnippet
  }
}
    ${UpdateSnippetFragmentDoc}`;
const JobsiteYearMasterReportItemSnippetFragmentDoc = gql`
    fragment JobsiteYearMasterReportItemSnippet on JobsiteYearMasterReportItemClass {
  _id
  report {
    _id
    jobsite {
      _id
      name
      jobcode
    }
  }
  summary {
    ...OnSiteSummaryReportSnippet
  }
}
    ${OnSiteSummaryReportSnippetFragmentDoc}`;
const JobsiteYearMasterReportFullSnippetFragmentDoc = gql`
    fragment JobsiteYearMasterReportFullSnippet on JobsiteYearMasterReportClass {
  ...JobsiteYearMasterReportCardSnippet
  reports {
    ...JobsiteYearMasterReportItemSnippet
  }
  crewTypes
  summary {
    externalExpenseInvoiceValue
    internalExpenseInvoiceValue
    accrualExpenseInvoiceValue
    externalRevenueInvoiceValue
    internalRevenueInvoiceValue
    accrualRevenueInvoiceValue
  }
  excelDownloadUrl
}
    ${JobsiteYearMasterReportCardSnippetFragmentDoc}
${JobsiteYearMasterReportItemSnippetFragmentDoc}`;
const JobsiteYearReportFetchSnippetFragmentDoc = gql`
    fragment JobsiteYearReportFetchSnippet on JobsiteYearReportClass {
  dayReports {
    ...JobsiteDayReportFetchSnippet
  }
}
    ${JobsiteDayReportFetchSnippetFragmentDoc}`;
const JobsiteYearReportCardSnippetFragmentDoc = gql`
    fragment JobsiteYearReportCardSnippet on JobsiteYearReportClass {
  _id
  startOfYear
  update {
    ...UpdateSnippet
  }
  jobsite {
    ...JobsiteCardSnippet
  }
}
    ${UpdateSnippetFragmentDoc}
${JobsiteCardSnippetFragmentDoc}`;
const JobsiteYearReportNoFetchSnippetFragmentDoc = gql`
    fragment JobsiteYearReportNoFetchSnippet on JobsiteYearReportClass {
  ...JobsiteYearReportCardSnippet
  crewTypes
  dayReports {
    ...JobsiteDayReportNoFetchSnippet
  }
  expenseInvoices {
    ...JobsiteDayReportInvoiceSnippet
  }
  revenueInvoices {
    ...JobsiteDayReportInvoiceSnippet
  }
  summary {
    externalExpenseInvoiceValue
    internalExpenseInvoiceValue
    accrualExpenseInvoiceValue
    externalRevenueInvoiceValue
    internalRevenueInvoiceValue
    accrualRevenueInvoiceValue
  }
  issues {
    ...ReportIssueSnippet
  }
  excelDownloadUrl
  reportNotes {
    ...ReportNoteFullSnippet
  }
}
    ${JobsiteYearReportCardSnippetFragmentDoc}
${JobsiteDayReportNoFetchSnippetFragmentDoc}
${JobsiteDayReportInvoiceSnippetFragmentDoc}
${ReportIssueSnippetFragmentDoc}
${ReportNoteFullSnippetFragmentDoc}`;
const JobsiteYearReportSummarySnippetFragmentDoc = gql`
    fragment JobsiteYearReportSummarySnippet on JobsiteYearReportClass {
  ...JobsiteYearReportCardSnippet
  crewTypes
  summary {
    externalExpenseInvoiceValue
    internalExpenseInvoiceValue
    accrualExpenseInvoiceValue
    externalRevenueInvoiceValue
    internalRevenueInvoiceValue
    accrualRevenueInvoiceValue
  }
  issues {
    ...ReportIssueSnippet
  }
}
    ${JobsiteYearReportCardSnippetFragmentDoc}
${ReportIssueSnippetFragmentDoc}`;
const JobsiteAllDataSnippetFragmentDoc = gql`
    fragment JobsiteAllDataSnippet on JobsiteClass {
  dailyReports {
    ...DailyReportCardSnippet
  }
  expenseInvoices {
    ...InvoiceCardSnippet
  }
  revenueInvoices {
    ...InvoiceCardSnippet
  }
}
    ${DailyReportCardSnippetFragmentDoc}
${InvoiceCardSnippetFragmentDoc}`;
const JobsiteCurrentYearSnippetFragmentDoc = gql`
    fragment JobsiteCurrentYearSnippet on JobsiteClass {
  yearsDailyReports {
    ...DailyReportCardSnippet
  }
  yearsExpenseInvoices {
    ...InvoiceCardSnippet
  }
  yearsRevenueInvoices {
    ...InvoiceCardSnippet
  }
}
    ${DailyReportCardSnippetFragmentDoc}
${InvoiceCardSnippetFragmentDoc}`;
const CrewCardSnippetFragmentDoc = gql`
    fragment CrewCardSnippet on CrewClass {
  _id
  name
  type
}
    `;
const JobsiteContractSnippetFragmentDoc = gql`
    fragment JobsiteContractSnippet on JobsiteContractClass {
  _id
  bidValue
  expectedProfit
  workOnHand
}
    `;
const JobsiteFullSnippetFragmentDoc = gql`
    fragment JobsiteFullSnippet on JobsiteClass {
  _id
  name
  jobcode
  description
  location_url
  active
  archivedAt
  crews {
    ...CrewCardSnippet
  }
  monthReports {
    ...JobsiteMonthReportCardSnippet
  }
  yearReports {
    ...JobsiteYearReportCardSnippet
  }
  truckingRates {
    ...TruckingTypeRateSnippet
  }
  materials {
    _id
  }
  contract {
    ...JobsiteContractSnippet
  }
  fileObjects {
    ...JobsiteFileObjectPreloadSnippet
  }
  enrichedFiles {
    _id
    minRole
    enrichedFile {
      _id
      documentType
      summaryStatus
      summaryError
      pageCount
      summary {
        overview
        documentType
        keyTopics
      }
      file {
        _id
        mimetype
        description
      }
    }
  }
  location {
    latitude
    longitude
  }
}
    ${CrewCardSnippetFragmentDoc}
${JobsiteMonthReportCardSnippetFragmentDoc}
${JobsiteYearReportCardSnippetFragmentDoc}
${TruckingTypeRateSnippetFragmentDoc}
${JobsiteContractSnippetFragmentDoc}
${JobsiteFileObjectPreloadSnippetFragmentDoc}`;
const JobsiteInvoicesSnippetFragmentDoc = gql`
    fragment JobsiteInvoicesSnippet on JobsiteClass {
  _id
  yearsExpenseInvoices {
    ...InvoiceCardSnippet
  }
  yearsRevenueInvoices {
    ...InvoiceCardSnippet
  }
}
    ${InvoiceCardSnippetFragmentDoc}`;
const JobsiteMaterialsSnippetFragmentDoc = gql`
    fragment JobsiteMaterialsSnippet on JobsiteClass {
  _id
  materials {
    ...JobsiteMaterialCardSnippet
  }
}
    ${JobsiteMaterialCardSnippetFragmentDoc}`;
const DailyReportForMaterialShipmentSnippetFragmentDoc = gql`
    fragment DailyReportForMaterialShipmentSnippet on DailyReportClass {
  _id
  date
  jobsite {
    materials {
      ...JobsiteMaterialForDailyReportSnippet
    }
    truckingRates {
      ...TruckingTypeRateSnippet
    }
  }
}
    ${JobsiteMaterialForDailyReportSnippetFragmentDoc}
${TruckingTypeRateSnippetFragmentDoc}`;
const MaterialShipmentNonCostedSnippetFragmentDoc = gql`
    fragment MaterialShipmentNonCostedSnippet on MaterialShipmentClass {
  dailyReport {
    ...DailyReportForMaterialShipmentSnippet
  }
  ...MaterialShipmentCardSnippet
}
    ${DailyReportForMaterialShipmentSnippetFragmentDoc}
${MaterialShipmentCardSnippetFragmentDoc}`;
const JobsiteNonCostedMaterialsSnippetFragmentDoc = gql`
    fragment JobsiteNonCostedMaterialsSnippet on JobsiteClass {
  _id
  nonCostedMaterialShipments {
    ...MaterialShipmentNonCostedSnippet
  }
}
    ${MaterialShipmentNonCostedSnippetFragmentDoc}`;
const JobsiteSsrSnippetFragmentDoc = gql`
    fragment JobsiteSSRSnippet on JobsiteClass {
  _id
  name
  jobcode
}
    `;
const JobsiteSearchSnippetFragmentDoc = gql`
    fragment JobsiteSearchSnippet on JobsiteClass {
  _id
  name
  jobcode
}
    `;
const JobsiteTruckingRatesSnippetFragmentDoc = gql`
    fragment JobsiteTruckingRatesSnippet on JobsiteClass {
  ...JobsiteCardSnippet
  truckingRates {
    ...TruckingTypeRateSnippet
  }
}
    ${JobsiteCardSnippetFragmentDoc}
${TruckingTypeRateSnippetFragmentDoc}`;
const JobsiteYearNonCostedMaterialsSnippetFragmentDoc = gql`
    fragment JobsiteYearNonCostedMaterialsSnippet on JobsiteClass {
  _id
  yearsNonCostedMaterialShipments {
    ...MaterialShipmentNonCostedSnippet
  }
}
    ${MaterialShipmentNonCostedSnippetFragmentDoc}`;
const MaterialFullSnippetFragmentDoc = gql`
    fragment MaterialFullSnippet on MaterialClass {
  ...MaterialCardSnippet
  canRemove
}
    ${MaterialCardSnippetFragmentDoc}`;
const OperatorDailyReportCardSnippetFragmentDoc = gql`
    fragment OperatorDailyReportCardSnippet on OperatorDailyReportClass {
  _id
  vehicle {
    ...VehicleCardSnippet
  }
  author {
    ...EmployeeCardSnippet
  }
  equipmentUsage {
    usage
    unit
  }
  startTime
  checklist {
    walkaroundComplete
    visualInspectionComplete
    oilChecked
    coolantChecked
    fluidsChecked
  }
  functionChecks {
    backupAlarm
    lights
    fireExtinguisher
    licensePlate
  }
  malfunction
  damageObserved
  leaks {
    type
    location
  }
  fluidsAdded {
    type
    amount
  }
  createdAt
}
    ${VehicleCardSnippetFragmentDoc}
${EmployeeCardSnippetFragmentDoc}`;
const VehicleIssueCardSnippetFragmentDoc = gql`
    fragment VehicleIssueCardSnippet on VehicleIssueClass {
  _id
  title
  description
  priority
  closed
  createdAt
  vehicle {
    ...VehicleCardSnippet
  }
  author {
    ...EmployeeCardSnippet
  }
  assignedTo {
    ...EmployeeCardSnippet
  }
  operatorDailyReport {
    ...OperatorDailyReportCardSnippet
  }
}
    ${VehicleCardSnippetFragmentDoc}
${EmployeeCardSnippetFragmentDoc}
${OperatorDailyReportCardSnippetFragmentDoc}`;
const OperatorDailyReportFullSnippetFragmentDoc = gql`
    fragment OperatorDailyReportFullSnippet on OperatorDailyReportClass {
  ...OperatorDailyReportCardSnippet
  vehicleIssues {
    ...VehicleIssueCardSnippet
  }
}
    ${OperatorDailyReportCardSnippetFragmentDoc}
${VehicleIssueCardSnippetFragmentDoc}`;
const PublicDocumentSnippetFragmentDoc = gql`
    fragment PublicDocumentSnippet on PublicDocumentClass {
  _id
  slug
  title
  description
  viewCount
  fileUrl
  createdAt
}
    `;
const SearchSnippetFragmentDoc = gql`
    fragment SearchSnippet on SearchClass {
  score
  employee {
    _id
    name
    jobTitle
  }
  vehicle {
    _id
    name
    vehicleType
    vehicleCode
  }
  jobsite {
    ...JobsiteCardSnippet
  }
  dailyReport {
    ...DailyReportCardSnippet
  }
  crew {
    ...CrewCardSnippet
  }
  company {
    ...CompanyCardSnippet
  }
}
    ${JobsiteCardSnippetFragmentDoc}
${DailyReportCardSnippetFragmentDoc}
${CrewCardSnippetFragmentDoc}
${CompanyCardSnippetFragmentDoc}`;
const SignupFullSnippetFragmentDoc = gql`
    fragment SignupFullSnippet on SignupClass {
  _id
  employee {
    _id
    name
  }
}
    `;
const DefaultRateSnippetFragmentDoc = gql`
    fragment DefaultRateSnippet on DefaultRateClass {
  _id
  title
  rates {
    rate
    date
  }
}
    `;
const SystemSnippetFragmentDoc = gql`
    fragment SystemSnippet on SystemClass {
  unitDefaults
  laborTypes
  fluidTypes
  companyVehicleTypeDefaults {
    ...DefaultRateSnippet
  }
  materialShipmentVehicleTypeDefaults {
    ...DefaultRateSnippet
  }
  internalExpenseOverheadRate {
    ...RateSnippet
  }
  specFiles {
    _id
    documentType
    summaryStatus
    summaryError
    pageCount
    summary {
      overview
      documentType
      keyTopics
      chunks {
        startPage
        endPage
        overview
        keyTopics
      }
    }
    file {
      _id
      mimetype
      description
    }
  }
}
    ${DefaultRateSnippetFragmentDoc}
${RateSnippetFragmentDoc}`;
const UserCrewSnippetFragmentDoc = gql`
    fragment UserCrewSnippet on UserClass {
  ...UserCardSnippet
  employee {
    crews {
      vehicles {
        ...VehicleCardSnippet
      }
    }
  }
}
    ${UserCardSnippetFragmentDoc}
${VehicleCardSnippetFragmentDoc}`;
const FullUserSnippetFragmentDoc = gql`
    fragment FullUserSnippet on UserClass {
  ...UserCardSnippet
  employee {
    _id
    name
    jobTitle
    crews {
      ...CrewCardSnippet
    }
  }
  settings {
    homeView
    subscribedVehicleIssuePriorities
  }
}
    ${UserCardSnippetFragmentDoc}
${CrewCardSnippetFragmentDoc}`;
const VehicleIssueFullSnippetFragmentDoc = gql`
    fragment VehicleIssueFullSnippet on VehicleIssueClass {
  ...VehicleIssueCardSnippet
}
    ${VehicleIssueCardSnippetFragmentDoc}`;
const VehicleFullSnippetFragmentDoc = gql`
    fragment VehicleFullSnippet on VehicleClass {
  ...VehicleCardSnippet
  currentRate
  crews {
    ...CrewCardSnippet
  }
  operatorDailyReports {
    ...OperatorDailyReportCardSnippet
  }
  vehicleIssues {
    ...VehicleIssueCardSnippet
  }
}
    ${VehicleCardSnippetFragmentDoc}
${CrewCardSnippetFragmentDoc}
${OperatorDailyReportCardSnippetFragmentDoc}
${VehicleIssueCardSnippetFragmentDoc}`;
const VehicleSsrSnippetFragmentDoc = gql`
    fragment VehicleSSRSnippet on VehicleClass {
  _id
  name
  vehicleCode
  vehicleType
  archivedAt
}
    `;
const VehicleSearchSnippetFragmentDoc = gql`
    fragment VehicleSearchSnippet on VehicleClass {
  _id
  name
  vehicleCode
  vehicleType
}
    `;
const CompanyArchiveDocument = gql`
    mutation CompanyArchive($id: ID!) {
  companyArchive(id: $id) {
    _id
  }
}
    `;
function useCompanyArchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(CompanyArchiveDocument, options);
}
const CompanyCreateDocument = gql`
    mutation CompanyCreate($data: CompanyCreateData!) {
  companyCreate(data: $data) {
    ...CompanyCardSnippet
  }
}
    ${CompanyCardSnippetFragmentDoc}`;
function useCompanyCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(CompanyCreateDocument, options);
}
const CrewAddEmployeeDocument = gql`
    mutation CrewAddEmployee($crewId: String!, $employeeId: String!) {
  crewAddEmployee(crewId: $crewId, employeeId: $employeeId) {
    ...CrewFullSnippet
  }
}
    ${CrewFullSnippetFragmentDoc}`;
function useCrewAddEmployeeMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(CrewAddEmployeeDocument, options);
}
const CrewAddVehicleDocument = gql`
    mutation CrewAddVehicle($crewId: String!, $vehicleId: String!) {
  crewAddVehicle(crewId: $crewId, vehicleId: $vehicleId) {
    ...CrewFullSnippet
  }
}
    ${CrewFullSnippetFragmentDoc}`;
function useCrewAddVehicleMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(CrewAddVehicleDocument, options);
}
const CrewArchiveDocument = gql`
    mutation CrewArchive($id: ID!) {
  crewArchive(id: $id) {
    _id
  }
}
    `;
function useCrewArchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(CrewArchiveDocument, options);
}
const CrewCreateDocument = gql`
    mutation CrewCreate($data: CrewCreateData!) {
  crewCreate(data: $data) {
    ...CrewFullSnippet
  }
}
    ${CrewFullSnippetFragmentDoc}`;
function useCrewCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(CrewCreateDocument, options);
}
const CrewRemoveEmployeeDocument = gql`
    mutation CrewRemoveEmployee($crewId: String!, $employeeId: String!) {
  crewRemoveEmployee(crewId: $crewId, employeeId: $employeeId) {
    ...CrewFullSnippet
  }
}
    ${CrewFullSnippetFragmentDoc}`;
function useCrewRemoveEmployeeMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(CrewRemoveEmployeeDocument, options);
}
const CrewRemoveVehicleDocument = gql`
    mutation CrewRemoveVehicle($crewId: String!, $vehicleId: String!) {
  crewRemoveVehicle(crewId: $crewId, vehicleId: $vehicleId) {
    ...CrewFullSnippet
  }
}
    ${CrewFullSnippetFragmentDoc}`;
function useCrewRemoveVehicleMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(CrewRemoveVehicleDocument, options);
}
const CrewUpdateDocument = gql`
    mutation CrewUpdate($id: ID!, $data: CrewUpdateData!) {
  crewUpdate(id: $id, data: $data) {
    ...CrewFullSnippet
  }
}
    ${CrewFullSnippetFragmentDoc}`;
function useCrewUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(CrewUpdateDocument, options);
}
const DailyReportAddNoteFileDocument = gql`
    mutation DailyReportAddNoteFile($dailyReportId: String!, $data: FileCreateData!) {
  dailyReportAddNoteFile(id: $dailyReportId, data: $data) {
    ...DailyReportFullSnippet
  }
}
    ${DailyReportFullSnippetFragmentDoc}`;
function useDailyReportAddNoteFileMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(DailyReportAddNoteFileDocument, options);
}
const DailyReportAddTemporaryEmployeeDocument = gql`
    mutation DailyReportAddTemporaryEmployee($id: String!, $employeeId: String!) {
  dailyReportAddTemporaryEmployee(id: $id, employeeId: $employeeId) {
    ...DailyReportFullSnippet
  }
}
    ${DailyReportFullSnippetFragmentDoc}`;
function useDailyReportAddTemporaryEmployeeMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(DailyReportAddTemporaryEmployeeDocument, options);
}
const DailyReportAddTemporaryVehicleDocument = gql`
    mutation DailyReportAddTemporaryVehicle($id: String!, $vehicleId: String!) {
  dailyReportAddTemporaryVehicle(id: $id, vehicleId: $vehicleId) {
    ...DailyReportFullSnippet
  }
}
    ${DailyReportFullSnippetFragmentDoc}`;
function useDailyReportAddTemporaryVehicleMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(DailyReportAddTemporaryVehicleDocument, options);
}
const DailyReportArchiveDocument = gql`
    mutation DailyReportArchive($id: ID!) {
  dailyReportArchive(id: $id) {
    _id
  }
}
    `;
function useDailyReportArchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(DailyReportArchiveDocument, options);
}
const DailyReportCreateDocument = gql`
    mutation DailyReportCreate($data: DailyReportCreateData!) {
  dailyReportCreate(data: $data) {
    ...DailyReportFullSnippet
  }
}
    ${DailyReportFullSnippetFragmentDoc}`;
function useDailyReportCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(DailyReportCreateDocument, options);
}
const DailyReportJobCostApprovalUpdateDocument = gql`
    mutation DailyReportJobCostApprovalUpdate($id: String!, $approved: Boolean!) {
  dailyReportJobCostApprovalUpdate(id: $id, approved: $approved) {
    ...DailyReportFullSnippet
  }
}
    ${DailyReportFullSnippetFragmentDoc}`;
function useDailyReportJobCostApprovalUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(DailyReportJobCostApprovalUpdateDocument, options);
}
const DailyReportNoteUpdateDocument = gql`
    mutation DailyReportNoteUpdate($id: String!, $data: DailyReportNoteUpdateData!) {
  dailyReportNoteUpdate(id: $id, data: $data) {
    ...DailyReportFullSnippet
  }
}
    ${DailyReportFullSnippetFragmentDoc}`;
function useDailyReportNoteUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(DailyReportNoteUpdateDocument, options);
}
const DailyReportPayrollCompleteUpdateDocument = gql`
    mutation DailyReportPayrollCompleteUpdate($id: String!, $complete: Boolean!) {
  dailyReportPayrollCompleteUpdate(id: $id, complete: $complete) {
    ...DailyReportFullSnippet
  }
}
    ${DailyReportFullSnippetFragmentDoc}`;
function useDailyReportPayrollCompleteUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(DailyReportPayrollCompleteUpdateDocument, options);
}
const DailyReportUpdateDocument = gql`
    mutation DailyReportUpdate($id: String!, $data: DailyReportUpdateData!) {
  dailyReportUpdate(id: $id, data: $data) {
    ...DailyReportFullSnippet
  }
}
    ${DailyReportFullSnippetFragmentDoc}`;
function useDailyReportUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(DailyReportUpdateDocument, options);
}
const EmployeeArchiveDocument = gql`
    mutation EmployeeArchive($id: ID!) {
  employeeArchive(id: $id) {
    _id
  }
}
    `;
function useEmployeeArchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(EmployeeArchiveDocument, options);
}
const EmployeeCreateDocument = gql`
    mutation EmployeeCreate($data: EmployeeCreateData!, $crewId: String) {
  employeeCreate(data: $data, crewId: $crewId) {
    ...EmployeeCardSnippet
  }
}
    ${EmployeeCardSnippetFragmentDoc}`;
function useEmployeeCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(EmployeeCreateDocument, options);
}
const EmployeeUnarchiveDocument = gql`
    mutation EmployeeUnarchive($id: ID!) {
  employeeUnarchive(id: $id) {
    _id
  }
}
    `;
function useEmployeeUnarchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(EmployeeUnarchiveDocument, options);
}
const EmployeeUpdateDocument = gql`
    mutation EmployeeUpdate($id: ID!, $data: EmployeeUpdateData!) {
  employeeUpdate(id: $id, data: $data) {
    ...EmployeeFullSnippet
  }
}
    ${EmployeeFullSnippetFragmentDoc}`;
function useEmployeeUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(EmployeeUpdateDocument, options);
}
const EmployeeUpdateRatesDocument = gql`
    mutation EmployeeUpdateRates($id: String!, $data: [RatesData!]!) {
  employeeUpdateRates(id: $id, data: $data) {
    ...EmployeeCardSnippet
  }
}
    ${EmployeeCardSnippetFragmentDoc}`;
function useEmployeeUpdateRatesMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(EmployeeUpdateRatesDocument, options);
}
const EmployeeWorkCreateDocument = gql`
    mutation EmployeeWorkCreate($dailyReportId: String!, $data: [EmployeeWorkCreateData!]!) {
  employeeWorkCreate(dailyReportId: $dailyReportId, data: $data) {
    ...EmployeeWorkCardSnippet
  }
}
    ${EmployeeWorkCardSnippetFragmentDoc}`;
function useEmployeeWorkCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(EmployeeWorkCreateDocument, options);
}
const EmployeeWorkDeleteDocument = gql`
    mutation EmployeeWorkDelete($id: String!) {
  employeeWorkDelete(id: $id)
}
    `;
function useEmployeeWorkDeleteMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(EmployeeWorkDeleteDocument, options);
}
const EmployeeWorkUpdateDocument = gql`
    mutation EmployeeWorkUpdate($id: String!, $data: EmployeeWorkUpdateData!) {
  employeeWorkUpdate(id: $id, data: $data) {
    ...EmployeeWorkCardSnippet
  }
}
    ${EmployeeWorkCardSnippetFragmentDoc}`;
function useEmployeeWorkUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(EmployeeWorkUpdateDocument, options);
}
const InvoiceRemoveDocument = gql`
    mutation InvoiceRemove($id: ID!) {
  invoiceRemove(id: $id)
}
    `;
function useInvoiceRemoveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(InvoiceRemoveDocument, options);
}
const InvoiceUpdateForJobsiteDocument = gql`
    mutation InvoiceUpdateForJobsite($id: String!, $jobsiteId: ID!, $data: InvoiceData!) {
  invoiceUpdateForJobsite(id: $id, jobsiteId: $jobsiteId, data: $data) {
    ...InvoiceCardSnippet
  }
}
    ${InvoiceCardSnippetFragmentDoc}`;
function useInvoiceUpdateForJobsiteMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(InvoiceUpdateForJobsiteDocument, options);
}
const InvoiceUpdateForJobsiteMaterialDocument = gql`
    mutation InvoiceUpdateForJobsiteMaterial($id: String!, $jobsiteMaterialId: ID!, $data: InvoiceData!) {
  invoiceUpdateForJobsiteMaterial(
    id: $id
    jobsiteMaterialId: $jobsiteMaterialId
    data: $data
  ) {
    ...InvoiceCardSnippet
  }
}
    ${InvoiceCardSnippetFragmentDoc}`;
function useInvoiceUpdateForJobsiteMaterialMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(InvoiceUpdateForJobsiteMaterialDocument, options);
}
const JobsiteAddDefaultTruckingRateToAllDocument = gql`
    mutation JobsiteAddDefaultTruckingRateToAll($itemIndex: Int!, $rateIndex: Int!) {
  jobsiteAddDefaultTruckingRateToAll(
    systemRateItemIndex: $itemIndex
    systemRateIndex: $rateIndex
  ) {
    _id
  }
}
    `;
function useJobsiteAddDefaultTruckingRateToAllMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteAddDefaultTruckingRateToAllDocument, options);
}
const JobsiteAddExpenseInvoiceDocument = gql`
    mutation JobsiteAddExpenseInvoice($jobsiteId: String!, $data: InvoiceData!) {
  jobsiteAddExpenseInvoice(jobsiteId: $jobsiteId, data: $data) {
    ...JobsiteInvoicesSnippet
  }
}
    ${JobsiteInvoicesSnippetFragmentDoc}`;
function useJobsiteAddExpenseInvoiceMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteAddExpenseInvoiceDocument, options);
}
const JobsiteAddFileObjectDocument = gql`
    mutation JobsiteAddFileObject($id: ID!, $data: JobsiteFileObjectData!) {
  jobsiteAddFileObject(id: $id, data: $data) {
    ...JobsiteFullSnippet
  }
}
    ${JobsiteFullSnippetFragmentDoc}`;
function useJobsiteAddFileObjectMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteAddFileObjectDocument, options);
}
const JobsiteAddMaterialDocument = gql`
    mutation JobsiteAddMaterial($jobsiteId: String!, $data: JobsiteMaterialCreateData!) {
  jobsiteAddMaterial(jobsiteId: $jobsiteId, data: $data) {
    ...JobsiteFullSnippet
  }
}
    ${JobsiteFullSnippetFragmentDoc}`;
function useJobsiteAddMaterialMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteAddMaterialDocument, options);
}
const JobsiteAddRevenueInvoiceDocument = gql`
    mutation JobsiteAddRevenueInvoice($jobsiteId: String!, $data: InvoiceData!) {
  jobsiteAddRevenueInvoice(jobsiteId: $jobsiteId, data: $data) {
    ...JobsiteInvoicesSnippet
  }
}
    ${JobsiteInvoicesSnippetFragmentDoc}`;
function useJobsiteAddRevenueInvoiceMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteAddRevenueInvoiceDocument, options);
}
const JobsiteArchiveDocument = gql`
    mutation JobsiteArchive($id: ID!) {
  jobsiteArchive(id: $id) {
    _id
  }
}
    `;
function useJobsiteArchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteArchiveDocument, options);
}
const JobsiteUpdateContractDocument = gql`
    mutation JobsiteUpdateContract($id: ID!, $data: JobsiteContractData!) {
  jobsiteContract(id: $id, data: $data) {
    _id
    contract {
      ...JobsiteContractSnippet
    }
  }
}
    ${JobsiteContractSnippetFragmentDoc}`;
function useJobsiteUpdateContractMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteUpdateContractDocument, options);
}
const JobsiteCreateDocument = gql`
    mutation JobsiteCreate($data: JobsiteCreateData!) {
  jobsiteCreate(data: $data) {
    ...JobsiteFullSnippet
  }
}
    ${JobsiteFullSnippetFragmentDoc}`;
function useJobsiteCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteCreateDocument, options);
}
const JobsiteUpdateLocationDocument = gql`
    mutation JobsiteUpdateLocation($id: ID!, $data: JobsiteLocationData!) {
  jobsiteLocation(id: $id, data: $data) {
    _id
    location {
      longitude
      latitude
    }
  }
}
    `;
function useJobsiteUpdateLocationMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteUpdateLocationDocument, options);
}
const JobsiteMaterialAddInvoiceDocument = gql`
    mutation JobsiteMaterialAddInvoice($id: ID!, $data: InvoiceData!) {
  jobsiteMaterialAddInvoice(jobsiteMaterialId: $id, data: $data) {
    ...JobsiteMaterialInvoiceSnippet
  }
}
    ${JobsiteMaterialInvoiceSnippetFragmentDoc}`;
function useJobsiteMaterialAddInvoiceMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteMaterialAddInvoiceDocument, options);
}
const JobsiteMaterialRemoveDocument = gql`
    mutation JobsiteMaterialRemove($id: ID!) {
  jobsiteMaterialRemove(id: $id)
}
    `;
function useJobsiteMaterialRemoveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteMaterialRemoveDocument, options);
}
const JobsiteMaterialScenarioAddDocument = gql`
    mutation JobsiteMaterialScenarioAdd($id: ID!, $data: RateScenarioData!) {
  jobsiteMaterialScenarioAdd(id: $id, data: $data) {
    ...JobsiteMaterialCardSnippet
  }
}
    ${JobsiteMaterialCardSnippetFragmentDoc}`;
function useJobsiteMaterialScenarioAddMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteMaterialScenarioAddDocument, options);
}
const JobsiteMaterialScenarioRemoveDocument = gql`
    mutation JobsiteMaterialScenarioRemove($id: ID!, $scenarioId: ID!) {
  jobsiteMaterialScenarioRemove(id: $id, scenarioId: $scenarioId) {
    ...JobsiteMaterialCardSnippet
  }
}
    ${JobsiteMaterialCardSnippetFragmentDoc}`;
function useJobsiteMaterialScenarioRemoveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteMaterialScenarioRemoveDocument, options);
}
const JobsiteMaterialScenarioUpdateDocument = gql`
    mutation JobsiteMaterialScenarioUpdate($id: ID!, $scenarioId: ID!, $data: RateScenarioData!) {
  jobsiteMaterialScenarioUpdate(id: $id, scenarioId: $scenarioId, data: $data) {
    ...JobsiteMaterialCardSnippet
  }
}
    ${JobsiteMaterialCardSnippetFragmentDoc}`;
function useJobsiteMaterialScenarioUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteMaterialScenarioUpdateDocument, options);
}
const JobsiteMaterialUpdateDocument = gql`
    mutation JobsiteMaterialUpdate($id: String!, $data: JobsiteMaterialUpdateData!) {
  jobsiteMaterialUpdate(id: $id, data: $data) {
    ...JobsiteMaterialCardSnippet
  }
}
    ${JobsiteMaterialCardSnippetFragmentDoc}`;
function useJobsiteMaterialUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteMaterialUpdateDocument, options);
}
const JobsiteRemoveDocument = gql`
    mutation JobsiteRemove($id: ID!, $transferJobsiteId: ID) {
  jobsiteRemove(id: $id, transferJobsiteId: $transferJobsiteId)
}
    `;
function useJobsiteRemoveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteRemoveDocument, options);
}
const JobsiteRemoveFileObjectDocument = gql`
    mutation JobsiteRemoveFileObject($id: ID!, $fileObjectId: ID!) {
  jobsiteRemoveFileObject(id: $id, fileObjectId: $fileObjectId) {
    ...JobsiteFullSnippet
  }
}
    ${JobsiteFullSnippetFragmentDoc}`;
function useJobsiteRemoveFileObjectMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteRemoveFileObjectDocument, options);
}
const JobsiteRequestReportGenerationDocument = gql`
    mutation JobsiteRequestReportGeneration($id: ID!) {
  jobsiteRequestReportGeneration(id: $id) {
    _id
  }
}
    `;
function useJobsiteRequestReportGenerationMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteRequestReportGenerationDocument, options);
}
const JobsiteSetAllEmptyTruckingRatesDocument = gql`
    mutation JobsiteSetAllEmptyTruckingRates {
  jobsiteSetAllEmptyTruckingRates {
    _id
  }
}
    `;
function useJobsiteSetAllEmptyTruckingRatesMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteSetAllEmptyTruckingRatesDocument, options);
}
const JobsiteSetTruckingRatesDocument = gql`
    mutation JobsiteSetTruckingRates($id: String!, $data: [TruckingTypeRateData!]!) {
  jobsiteSetTruckingRates(id: $id, data: $data) {
    ...JobsiteFullSnippet
  }
}
    ${JobsiteFullSnippetFragmentDoc}`;
function useJobsiteSetTruckingRatesMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteSetTruckingRatesDocument, options);
}
const JobsiteUnarchiveDocument = gql`
    mutation JobsiteUnarchive($id: ID!) {
  jobsiteUnarchive(id: $id) {
    _id
  }
}
    `;
function useJobsiteUnarchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteUnarchiveDocument, options);
}
const JobsiteUpdateDocument = gql`
    mutation JobsiteUpdate($id: ID!, $data: JobsiteUpdateData!) {
  jobsiteUpdate(id: $id, data: $data) {
    ...JobsiteCardSnippet
  }
}
    ${JobsiteCardSnippetFragmentDoc}`;
function useJobsiteUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteUpdateDocument, options);
}
const JobsiteUpdateEnrichedFileRoleDocument = gql`
    mutation JobsiteUpdateEnrichedFileRole($id: ID!, $fileObjectId: ID!, $minRole: UserRoles!) {
  jobsiteUpdateEnrichedFileRole(
    id: $id
    fileObjectId: $fileObjectId
    minRole: $minRole
  ) {
    _id
    enrichedFiles {
      _id
      minRole
      enrichedFile {
        _id
        documentType
        summaryStatus
        summaryError
        pageCount
        summary {
          overview
          documentType
          keyTopics
        }
        file {
          _id
          mimetype
          description
        }
      }
    }
  }
}
    `;
function useJobsiteUpdateEnrichedFileRoleMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(JobsiteUpdateEnrichedFileRoleDocument, options);
}
const LoginDocument = gql`
    mutation Login($data: LoginData!) {
  login(data: $data)
}
    `;
function useLoginMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(LoginDocument, options);
}
const MaterialArchiveDocument = gql`
    mutation MaterialArchive($id: ID!) {
  materialArchive(id: $id) {
    _id
  }
}
    `;
function useMaterialArchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(MaterialArchiveDocument, options);
}
const MaterialCreateDocument = gql`
    mutation MaterialCreate($data: MaterialCreateData!) {
  materialCreate(data: $data) {
    ...MaterialFullSnippet
  }
}
    ${MaterialFullSnippetFragmentDoc}`;
function useMaterialCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(MaterialCreateDocument, options);
}
const MaterialRemoveDocument = gql`
    mutation MaterialRemove($id: ID!) {
  materialRemove(id: $id)
}
    `;
function useMaterialRemoveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(MaterialRemoveDocument, options);
}
const MaterialShipmentCreateDocument = gql`
    mutation MaterialShipmentCreate($dailyReportId: String!, $data: [MaterialShipmentCreateData!]!) {
  materialShipmentCreate(dailyReportId: $dailyReportId, data: $data) {
    ...MaterialShipmentCardSnippet
  }
}
    ${MaterialShipmentCardSnippetFragmentDoc}`;
function useMaterialShipmentCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(MaterialShipmentCreateDocument, options);
}
const MaterialShipmentDeleteDocument = gql`
    mutation MaterialShipmentDelete($id: String!) {
  materialShipmentDelete(id: $id)
}
    `;
function useMaterialShipmentDeleteMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(MaterialShipmentDeleteDocument, options);
}
const MaterialShipmentUpdateDocument = gql`
    mutation MaterialShipmentUpdate($id: String!, $data: MaterialShipmentUpdateData!) {
  materialShipmentUpdate(id: $id, data: $data) {
    ...MaterialShipmentCardSnippet
  }
}
    ${MaterialShipmentCardSnippetFragmentDoc}`;
function useMaterialShipmentUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(MaterialShipmentUpdateDocument, options);
}
const MaterialUpdateDocument = gql`
    mutation MaterialUpdate($id: ID!, $data: MaterialUpdateData!) {
  materialUpdate(id: $id, data: $data) {
    ...MaterialFullSnippet
  }
}
    ${MaterialFullSnippetFragmentDoc}`;
function useMaterialUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(MaterialUpdateDocument, options);
}
const OperatorDailyReportCreateDocument = gql`
    mutation OperatorDailyReportCreate($vehicleId: ID!, $data: OperatorDailyReportCreateData!) {
  operatorDailyReportCreate(vehicleId: $vehicleId, data: $data) {
    _id
  }
}
    `;
function useOperatorDailyReportCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(OperatorDailyReportCreateDocument, options);
}
const ProductionCreateDocument = gql`
    mutation ProductionCreate($dailyReportId: String!, $data: ProductionCreateData!) {
  productionCreate(dailyReportId: $dailyReportId, data: $data) {
    ...ProductionCardSnippet
  }
}
    ${ProductionCardSnippetFragmentDoc}`;
function useProductionCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(ProductionCreateDocument, options);
}
const ProductionDeleteDocument = gql`
    mutation ProductionDelete($id: String!) {
  productionDelete(id: $id)
}
    `;
function useProductionDeleteMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(ProductionDeleteDocument, options);
}
const ProductionUpdateDocument = gql`
    mutation ProductionUpdate($id: String!, $data: ProductionUpdateData!) {
  productionUpdate(id: $id, data: $data) {
    ...ProductionCardSnippet
  }
}
    ${ProductionCardSnippetFragmentDoc}`;
function useProductionUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(ProductionUpdateDocument, options);
}
const PublicDocumentCreateDocument = gql`
    mutation PublicDocumentCreate($data: PublicDocumentCreateData!) {
  publicDocumentCreate(data: $data) {
    ...PublicDocumentSnippet
  }
}
    ${PublicDocumentSnippetFragmentDoc}`;
function usePublicDocumentCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(PublicDocumentCreateDocument, options);
}
const PublicDocumentDeleteDocument = gql`
    mutation PublicDocumentDelete($id: String!) {
  publicDocumentDelete(id: $id)
}
    `;
function usePublicDocumentDeleteMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(PublicDocumentDeleteDocument, options);
}
const PublicDocumentUpdateDocument = gql`
    mutation PublicDocumentUpdate($id: String!, $data: PublicDocumentUpdateData!) {
  publicDocumentUpdate(id: $id, data: $data) {
    ...PublicDocumentSnippet
  }
}
    ${PublicDocumentSnippetFragmentDoc}`;
function usePublicDocumentUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(PublicDocumentUpdateDocument, options);
}
const ReportNoteRemoveFileDocument = gql`
    mutation ReportNoteRemoveFile($reportNoteId: String!, $fileId: String!) {
  reportNoteRemoveFile(reportNoteId: $reportNoteId, fileId: $fileId) {
    ...ReportNoteFullSnippet
  }
}
    ${ReportNoteFullSnippetFragmentDoc}`;
function useReportNoteRemoveFileMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(ReportNoteRemoveFileDocument, options);
}
const SignupDocument = gql`
    mutation Signup($signupId: String!, $data: SignupData!) {
  signup(signupId: $signupId, data: $data)
}
    `;
function useSignupMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SignupDocument, options);
}
const SignupCreateDocument = gql`
    mutation SignupCreate($employeeId: String!) {
  signupCreate(employeeId: $employeeId) {
    _id
  }
}
    `;
function useSignupCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SignupCreateDocument, options);
}
const SystemAddSpecFileDocument = gql`
    mutation SystemAddSpecFile($fileId: ID!) {
  systemAddSpecFile(fileId: $fileId) {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemAddSpecFileMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SystemAddSpecFileDocument, options);
}
const SystemRemoveSpecFileDocument = gql`
    mutation SystemRemoveSpecFile($fileObjectId: ID!) {
  systemRemoveSpecFile(fileObjectId: $fileObjectId) {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemRemoveSpecFileMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SystemRemoveSpecFileDocument, options);
}
const SystemRetrySpecFileDocument = gql`
    mutation SystemRetrySpecFile($fileObjectId: ID!) {
  systemRetrySpecFile(fileObjectId: $fileObjectId) {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemRetrySpecFileMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SystemRetrySpecFileDocument, options);
}
const SystemUpdateCompanyVehicleTypeDefaultsDocument = gql`
    mutation SystemUpdateCompanyVehicleTypeDefaults($data: [DefaultRateData!]!) {
  systemUpdateCompanyVehicleTypeDefaults(data: $data) {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemUpdateCompanyVehicleTypeDefaultsMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SystemUpdateCompanyVehicleTypeDefaultsDocument, options);
}
const SystemUpdateFluidTypesDocument = gql`
    mutation SystemUpdateFluidTypes($data: [String!]!) {
  systemUpdateFluidTypes(data: $data) {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemUpdateFluidTypesMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SystemUpdateFluidTypesDocument, options);
}
const SystemUpdateInternalExpenseOverheadRateDocument = gql`
    mutation SystemUpdateInternalExpenseOverheadRate($data: [RatesData!]!) {
  systemUpdateInternalExpenseOverheadRate(data: $data) {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemUpdateInternalExpenseOverheadRateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SystemUpdateInternalExpenseOverheadRateDocument, options);
}
const SystemUpdateLaborTypesDocument = gql`
    mutation SystemUpdateLaborTypes($data: [String!]!) {
  systemUpdateLaborTypes(data: $data) {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemUpdateLaborTypesMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SystemUpdateLaborTypesDocument, options);
}
const SystemUpdateMaterialShipmentVehicleTypeDefaultsDocument = gql`
    mutation SystemUpdateMaterialShipmentVehicleTypeDefaults($data: [DefaultRateData!]!) {
  systemUpdateMaterialShipmentVehicleTypeDefaults(data: $data) {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemUpdateMaterialShipmentVehicleTypeDefaultsMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SystemUpdateMaterialShipmentVehicleTypeDefaultsDocument, options);
}
const SystemUpdateUnitDefaultsDocument = gql`
    mutation SystemUpdateUnitDefaults($data: [String!]!) {
  systemUpdateUnitDefaults(data: $data) {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemUpdateUnitDefaultsMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(SystemUpdateUnitDefaultsDocument, options);
}
const UserDeleteDocument = gql`
    mutation UserDelete($userId: String!) {
  userDelete(userId: $userId)
}
    `;
function useUserDeleteMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(UserDeleteDocument, options);
}
const UserPasswordResetDocument = gql`
    mutation UserPasswordReset($password: String!, $token: String!) {
  userPasswordReset(password: $password, token: $token)
}
    `;
function useUserPasswordResetMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(UserPasswordResetDocument, options);
}
const UserPasswordResetRequestDocument = gql`
    mutation UserPasswordResetRequest($email: String!) {
  userPasswordResetRequest(email: $email)
}
    `;
function useUserPasswordResetRequestMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(UserPasswordResetRequestDocument, options);
}
const UserUpdateHomeViewDocument = gql`
    mutation UserUpdateHomeView($homeView: UserHomeViewSettings!) {
  userUpdateHomeView(homeView: $homeView) {
    _id
  }
}
    `;
function useUserUpdateHomeViewMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(UserUpdateHomeViewDocument, options);
}
const UserUpdateRoleDocument = gql`
    mutation UserUpdateRole($id: String!, $role: UserRoles!) {
  userUpdateRole(id: $id, role: $role) {
    ...UserCardSnippet
  }
}
    ${UserCardSnippetFragmentDoc}`;
function useUserUpdateRoleMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(UserUpdateRoleDocument, options);
}
const UserUpdateSubscribedPrioritiesDocument = gql`
    mutation UserUpdateSubscribedPriorities($priorities: [VehicleIssuePriority!]!) {
  userUpdateSubscribedPriorities(priorities: $priorities) {
    ...UserCardSnippet
  }
}
    ${UserCardSnippetFragmentDoc}`;
function useUserUpdateSubscribedPrioritiesMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(UserUpdateSubscribedPrioritiesDocument, options);
}
const UserUpdateTypesDocument = gql`
    mutation UserUpdateTypes($id: String!, $types: [UserTypes!]!) {
  userUpdateTypes(id: $id, types: $types) {
    ...UserCardSnippet
  }
}
    ${UserCardSnippetFragmentDoc}`;
function useUserUpdateTypesMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(UserUpdateTypesDocument, options);
}
const VehicleArchiveDocument = gql`
    mutation VehicleArchive($id: ID!) {
  vehicleArchive(id: $id) {
    _id
  }
}
    `;
function useVehicleArchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleArchiveDocument, options);
}
const VehicleCreateDocument = gql`
    mutation VehicleCreate($data: VehicleCreateData!, $crewId: String) {
  vehicleCreate(data: $data, crewId: $crewId) {
    ...VehicleCardSnippet
  }
}
    ${VehicleCardSnippetFragmentDoc}`;
function useVehicleCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleCreateDocument, options);
}
const VehicleIssueAssignedToUpdateDocument = gql`
    mutation VehicleIssueAssignedToUpdate($id: ID!, $assignedTo: ID) {
  vehicleIssueAssignedToUpdate(id: $id, assignedTo: $assignedTo) {
    ...VehicleIssueFullSnippet
  }
}
    ${VehicleIssueFullSnippetFragmentDoc}`;
function useVehicleIssueAssignedToUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleIssueAssignedToUpdateDocument, options);
}
const VehicleIssueCloseDocument = gql`
    mutation VehicleIssueClose($id: ID!) {
  vehicleIssueClose(id: $id) {
    ...VehicleIssueFullSnippet
  }
}
    ${VehicleIssueFullSnippetFragmentDoc}`;
function useVehicleIssueCloseMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleIssueCloseDocument, options);
}
const VehicleIssueCreateDocument = gql`
    mutation VehicleIssueCreate($vehicleId: ID!, $data: VehicleIssueCreateData!) {
  vehicleIssueCreate(vehicleId: $vehicleId, data: $data) {
    _id
  }
}
    `;
function useVehicleIssueCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleIssueCreateDocument, options);
}
const VehicleUnarchiveDocument = gql`
    mutation VehicleUnarchive($id: ID!) {
  vehicleUnarchive(id: $id) {
    _id
  }
}
    `;
function useVehicleUnarchiveMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleUnarchiveDocument, options);
}
const VehicleUpdateDocument = gql`
    mutation VehicleUpdate($id: ID!, $data: VehicleUpdateData!) {
  vehicleUpdate(id: $id, data: $data) {
    ...VehicleFullSnippet
  }
}
    ${VehicleFullSnippetFragmentDoc}`;
function useVehicleUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleUpdateDocument, options);
}
const VehicleUpdateRatesDocument = gql`
    mutation VehicleUpdateRates($id: String!, $data: [RatesData!]!) {
  vehicleUpdateRates(id: $id, data: $data) {
    ...VehicleCardSnippet
  }
}
    ${VehicleCardSnippetFragmentDoc}`;
function useVehicleUpdateRatesMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleUpdateRatesDocument, options);
}
const VehicleWorkCreateDocument = gql`
    mutation VehicleWorkCreate($dailyReportId: String!, $data: [VehicleWorkCreateData!]!) {
  vehicleWorkCreate(dailyReportId: $dailyReportId, data: $data) {
    ...VehicleWorkCardSnippet
  }
}
    ${VehicleWorkCardSnippetFragmentDoc}`;
function useVehicleWorkCreateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleWorkCreateDocument, options);
}
const VehicleWorkDeleteDocument = gql`
    mutation VehicleWorkDelete($id: String!) {
  vehicleWorkDelete(id: $id)
}
    `;
function useVehicleWorkDeleteMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleWorkDeleteDocument, options);
}
const VehicleWorkUpdateDocument = gql`
    mutation VehicleWorkUpdate($id: String!, $data: VehicleWorkUpdateData!) {
  vehicleWorkUpdate(id: $id, data: $data) {
    ...VehicleWorkCardSnippet
  }
}
    ${VehicleWorkCardSnippetFragmentDoc}`;
function useVehicleWorkUpdateMutation(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useMutation(VehicleWorkUpdateDocument, options);
}
const ArchivedEmployeesDocument = gql`
    query ArchivedEmployees($options: ListOptionData) {
  archivedEmployees(options: $options) {
    ...EmployeeCardSnippet
  }
}
    ${EmployeeCardSnippetFragmentDoc}`;
function useArchivedEmployeesQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(ArchivedEmployeesDocument, options);
}
function useArchivedEmployeesLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(ArchivedEmployeesDocument, options);
}
const ArchivedVehiclesDocument = gql`
    query ArchivedVehicles($options: ListOptionData) {
  archivedVehicles(options: $options) {
    ...VehicleCardSnippet
  }
}
    ${VehicleCardSnippetFragmentDoc}`;
function useArchivedVehiclesQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(ArchivedVehiclesDocument, options);
}
function useArchivedVehiclesLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(ArchivedVehiclesDocument, options);
}
const CompaniesDocument = gql`
    query Companies($options: ListOptionData) {
  companies(options: $options) {
    ...CompanyCardSnippet
  }
}
    ${CompanyCardSnippetFragmentDoc}`;
function useCompaniesQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CompaniesDocument, options);
}
function useCompaniesLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CompaniesDocument, options);
}
const CompanySearchDocument = gql`
    query CompanySearch($searchString: String!, $options: SearchOptions) {
  companySearch(searchString: $searchString, options: $options) {
    ...CompanyCardSnippet
  }
}
    ${CompanyCardSnippetFragmentDoc}`;
function useCompanySearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CompanySearchDocument, options);
}
function useCompanySearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CompanySearchDocument, options);
}
const CompanyCardDocument = gql`
    query CompanyCard($id: ID!) {
  company(id: $id) {
    ...CompanyCardSnippet
  }
}
    ${CompanyCardSnippetFragmentDoc}`;
function useCompanyCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CompanyCardDocument, options);
}
function useCompanyCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CompanyCardDocument, options);
}
const CompanyFullDocument = gql`
    query CompanyFull($id: ID!) {
  company(id: $id) {
    ...CompanyFullSnippet
  }
}
    ${CompanyFullSnippetFragmentDoc}`;
function useCompanyFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CompanyFullDocument, options);
}
function useCompanyFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CompanyFullDocument, options);
}
const CrewLocationsDocument = gql`
    query CrewLocations($startTime: DateTime, $endTime: DateTime) {
  crewLocations(startTime: $startTime, endTime: $endTime) {
    ...CrewLocationSnippet
  }
}
    ${CrewLocationSnippetFragmentDoc}`;
function useCrewLocationsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CrewLocationsDocument, options);
}
function useCrewLocationsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CrewLocationsDocument, options);
}
const CrewLocationsExcelDocument = gql`
    query CrewLocationsExcel($startTime: DateTime!, $endTime: DateTime!) {
  crewLocationsExcel(startTime: $startTime, endTime: $endTime)
}
    `;
function useCrewLocationsExcelQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CrewLocationsExcelDocument, options);
}
function useCrewLocationsExcelLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CrewLocationsExcelDocument, options);
}
const CrewSearchDocument = gql`
    query CrewSearch($searchString: String!, $options: SearchOptions) {
  crewSearch(searchString: $searchString, options: $options) {
    ...CrewCardSnippet
  }
}
    ${CrewCardSnippetFragmentDoc}`;
function useCrewSearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CrewSearchDocument, options);
}
function useCrewSearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CrewSearchDocument, options);
}
const CrewCardDocument = gql`
    query CrewCard($id: String!) {
  crew(id: $id) {
    ...CrewCardSnippet
  }
}
    ${CrewCardSnippetFragmentDoc}`;
function useCrewCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CrewCardDocument, options);
}
function useCrewCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CrewCardDocument, options);
}
const CrewFullDocument = gql`
    query CrewFull($id: String!) {
  crew(id: $id) {
    ...CrewFullSnippet
  }
}
    ${CrewFullSnippetFragmentDoc}`;
function useCrewFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CrewFullDocument, options);
}
function useCrewFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CrewFullDocument, options);
}
const CrewSsrDocument = gql`
    query CrewSSR($id: String!) {
  crew(id: $id) {
    ...CrewSSRSnippet
  }
}
    ${CrewSsrSnippetFragmentDoc}`;
function useCrewSsrQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CrewSsrDocument, options);
}
function useCrewSsrLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CrewSsrDocument, options);
}
const CurrentUserDocument = gql`
    query CurrentUser {
  currentUser {
    ...FullUserSnippet
  }
}
    ${FullUserSnippetFragmentDoc}`;
function useCurrentUserQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(CurrentUserDocument, options);
}
function useCurrentUserLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(CurrentUserDocument, options);
}
const DailyReportCardDocument = gql`
    query DailyReportCard($id: String!) {
  dailyReport(id: $id) {
    ...DailyReportCardSnippet
  }
}
    ${DailyReportCardSnippetFragmentDoc}`;
function useDailyReportCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(DailyReportCardDocument, options);
}
function useDailyReportCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(DailyReportCardDocument, options);
}
const DailyReportFullDocument = gql`
    query DailyReportFull($id: String!) {
  dailyReport(id: $id) {
    ...DailyReportFullSnippet
  }
}
    ${DailyReportFullSnippetFragmentDoc}`;
function useDailyReportFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(DailyReportFullDocument, options);
}
function useDailyReportFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(DailyReportFullDocument, options);
}
const DailyReportPdfDocument = gql`
    query DailyReportPDF($id: String!) {
  dailyReport(id: $id) {
    ...DailyReportPDFSnippet
  }
}
    ${DailyReportPdfSnippetFragmentDoc}`;
function useDailyReportPdfQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(DailyReportPdfDocument, options);
}
function useDailyReportPdfLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(DailyReportPdfDocument, options);
}
const DailyReportSsrDocument = gql`
    query DailyReportSSR($id: String!) {
  dailyReport(id: $id) {
    ...DailyReportSSRSnippet
  }
}
    ${DailyReportSsrSnippetFragmentDoc}`;
function useDailyReportSsrQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(DailyReportSsrDocument, options);
}
function useDailyReportSsrLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(DailyReportSsrDocument, options);
}
const DailyReportsDocument = gql`
    query DailyReports($options: DailyReportListOptionData) {
  dailyReports(options: $options) {
    ...DailyReportCardSnippet
  }
}
    ${DailyReportCardSnippetFragmentDoc}`;
function useDailyReportsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(DailyReportsDocument, options);
}
function useDailyReportsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(DailyReportsDocument, options);
}
const DailyReportsForJobsiteDocument = gql`
    query DailyReportsForJobsite($jobsiteId: ID!, $options: DailyReportListOptionData) {
  dailyReportsForJobsite(jobsiteId: $jobsiteId, options: $options) {
    _id
  }
}
    `;
function useDailyReportsForJobsiteQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(DailyReportsForJobsiteDocument, options);
}
function useDailyReportsForJobsiteLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(DailyReportsForJobsiteDocument, options);
}
const DashboardOverviewDocument = gql`
    query DashboardOverview($input: DashboardInput!) {
  dashboardOverview(input: $input) {
    totalRevenue
    totalNetIncome
    avgNetMarginPercent
    totalTonnes
    avgTonnesPerHour
    revenueChangePercent
    netIncomeChangePercent
    tonnesChangePercent
    tonnesPerHourChangePercent
    priorRevenue
    priorNetIncome
    priorTonnes
    priorAvgTonnesPerHour
    jobsites {
      jobsiteId
      jobsiteName
      jobcode
      totalRevenue
      totalDirectCost
      netIncome
      netMarginPercent
      totalTonnes
      tonnesPerHour
    }
  }
}
    `;
function useDashboardOverviewQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(DashboardOverviewDocument, options);
}
function useDashboardOverviewLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(DashboardOverviewDocument, options);
}
const DashboardFinancialDocument = gql`
    query DashboardFinancial($input: DashboardInput!) {
  dashboardFinancial(input: $input) {
    totalRevenue
    totalDirectCost
    totalNetIncome
    avgNetMarginPercent
    jobsites {
      jobsiteId
      jobsiteName
      jobcode
      totalRevenue
      employeeCost
      vehicleCost
      materialCost
      truckingCost
      expenseInvoiceCost
      totalDirectCost
      netIncome
      netMarginPercent
      totalTonnes
      tonnesPerHour
    }
  }
}
    `;
function useDashboardFinancialQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(DashboardFinancialDocument, options);
}
function useDashboardFinancialLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(DashboardFinancialDocument, options);
}
const DashboardProductivityDocument = gql`
    query DashboardProductivity($input: DashboardProductivityInput!) {
  dashboardProductivity(input: $input) {
    averageTonnesPerHour
    averageTonnesPerManHour
    totalTonnes
    totalCrewHours
    totalManHours
    jobsiteCount
    availableMaterials {
      materialName
      crewType
      jobTitle
      key
      totalTonnes
      shipmentCount
    }
    jobsites {
      jobsiteId
      jobsiteName
      jobcode
      totalTonnes
      totalCrewHours
      tonnesPerHour
      totalManHours
      tonnesPerManHour
      totalM3
      m3PerHour
      shipmentCount
      percentFromAverage
      expectedTonnesPerHour
      percentFromExpected
    }
    crews {
      crewId
      crewName
      crewType
      totalTonnes
      totalCrewHours
      tonnesPerHour
      totalManHours
      tonnesPerManHour
      totalM3
      m3PerHour
      dayCount
      jobsiteCount
      percentFromAverage
    }
    regression {
      intercept
      slope
    }
  }
}
    `;
function useDashboardProductivityQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(DashboardProductivityDocument, options);
}
function useDashboardProductivityLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(DashboardProductivityDocument, options);
}
const EmployeeHourReportsDocument = gql`
    query EmployeeHourReports($id: ID!, $startTime: DateTime!, $endTime: DateTime!) {
  employeeHourReports(id: $id, startTime: $startTime, endTime: $endTime) {
    days {
      date
      hours
    }
  }
}
    `;
function useEmployeeHourReportsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(EmployeeHourReportsDocument, options);
}
function useEmployeeHourReportsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(EmployeeHourReportsDocument, options);
}
const EmployeeSearchDocument = gql`
    query EmployeeSearch($searchString: String!, $options: SearchOptions) {
  employeeSearch(searchString: $searchString, options: $options) {
    ...EmployeeCardSnippet
  }
}
    ${EmployeeCardSnippetFragmentDoc}`;
function useEmployeeSearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(EmployeeSearchDocument, options);
}
function useEmployeeSearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(EmployeeSearchDocument, options);
}
const EmployeeFullDocument = gql`
    query EmployeeFull($id: String!) {
  employee(id: $id) {
    ...EmployeeFullSnippet
  }
}
    ${EmployeeFullSnippetFragmentDoc}`;
function useEmployeeFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(EmployeeFullDocument, options);
}
function useEmployeeFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(EmployeeFullDocument, options);
}
const EmployeeSsrDocument = gql`
    query EmployeeSSR($id: String!) {
  employee(id: $id) {
    ...EmployeeSSRSnippet
  }
}
    ${EmployeeSsrSnippetFragmentDoc}`;
function useEmployeeSsrQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(EmployeeSsrDocument, options);
}
function useEmployeeSsrLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(EmployeeSsrDocument, options);
}
const EmployeeFetchSearchDocument = gql`
    query EmployeeFetchSearch($id: String!) {
  employee(id: $id) {
    ...EmployeeSearchSnippet
  }
}
    ${EmployeeSearchSnippetFragmentDoc}`;
function useEmployeeFetchSearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(EmployeeFetchSearchDocument, options);
}
function useEmployeeFetchSearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(EmployeeFetchSearchDocument, options);
}
const EmployeesDocument = gql`
    query Employees($options: ListOptionData) {
  employees(options: $options) {
    ...EmployeeCardSnippet
  }
}
    ${EmployeeCardSnippetFragmentDoc}`;
function useEmployeesQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(EmployeesDocument, options);
}
function useEmployeesLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(EmployeesDocument, options);
}
const FileFullDocument = gql`
    query FileFull($id: String!) {
  file(id: $id) {
    ...FileFullSnippet
  }
}
    ${FileFullSnippetFragmentDoc}`;
function useFileFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(FileFullDocument, options);
}
function useFileFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(FileFullDocument, options);
}
const FinancialPerformanceDocument = gql`
    query FinancialPerformance($input: FinancialPerformanceInput!) {
  financialPerformance(input: $input) {
    year
    totalRevenue
    totalDirectCost
    totalNetIncome
    averageNetMarginPercent
    correlationResidualThMargin
    jobsites {
      jobsiteId
      jobsiteName
      jobcode
      totalRevenue
      employeeCost
      vehicleCost
      materialCost
      truckingCost
      expenseInvoiceCost
      totalDirectCost
      netIncome
      netMarginPercent
      totalTonnes
      totalCrewHours
      tonnesPerHour
      expectedTonnesPerHour
      residualTonnesPerHourPercent
    }
  }
}
    `;
function useFinancialPerformanceQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(FinancialPerformanceDocument, options);
}
function useFinancialPerformanceLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(FinancialPerformanceDocument, options);
}
const JobsiteDayReportsFetchDocument = gql`
    query JobsiteDayReportsFetch($ids: [ID!]!) {
  jobsiteDayReports(ids: $ids) {
    ...JobsiteDayReportFetchSnippet
  }
}
    ${JobsiteDayReportFetchSnippetFragmentDoc}`;
function useJobsiteDayReportsFetchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteDayReportsFetchDocument, options);
}
function useJobsiteDayReportsFetchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteDayReportsFetchDocument, options);
}
const JobsiteMasterExcelReportByDateDocument = gql`
    query JobsiteMasterExcelReportByDate($startTime: DateTime!, $endTime: DateTime!) {
  jobsiteMasterExcelReportByDate(startTime: $startTime, endTime: $endTime)
}
    `;
function useJobsiteMasterExcelReportByDateQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteMasterExcelReportByDateDocument, options);
}
function useJobsiteMasterExcelReportByDateLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteMasterExcelReportByDateDocument, options);
}
const JobsiteMaterialInvoicesDocument = gql`
    query JobsiteMaterialInvoices($id: String!) {
  jobsiteMaterial(id: $id) {
    ...JobsiteMaterialInvoiceSnippet
  }
}
    ${JobsiteMaterialInvoiceSnippetFragmentDoc}`;
function useJobsiteMaterialInvoicesQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteMaterialInvoicesDocument, options);
}
function useJobsiteMaterialInvoicesLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteMaterialInvoicesDocument, options);
}
const JobsiteMonthReportCardDocument = gql`
    query JobsiteMonthReportCard($id: ID!) {
  jobsiteMonthReport(id: $id) {
    ...JobsiteMonthReportCardSnippet
  }
}
    ${JobsiteMonthReportCardSnippetFragmentDoc}`;
function useJobsiteMonthReportCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteMonthReportCardDocument, options);
}
function useJobsiteMonthReportCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteMonthReportCardDocument, options);
}
const JobsiteMonthReportFullDocument = gql`
    query JobsiteMonthReportFull($id: ID!) {
  jobsiteMonthReport(id: $id) {
    ...JobsiteMonthReportNoFetchSnippet
  }
}
    ${JobsiteMonthReportNoFetchSnippetFragmentDoc}`;
function useJobsiteMonthReportFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteMonthReportFullDocument, options);
}
function useJobsiteMonthReportFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteMonthReportFullDocument, options);
}
const JobsiteProductivityDocument = gql`
    query JobsiteProductivity($jobsiteMongoId: String!, $dateRange: DateRangeInput!, $includeCrewHoursDetail: Boolean, $materialGrouping: MaterialGrouping) {
  jobsiteProductivity(
    jobsiteMongoId: $jobsiteMongoId
    dateRange: $dateRange
    includeCrewHoursDetail: $includeCrewHoursDetail
    materialGrouping: $materialGrouping
  ) {
    jobsiteId
    jobsiteName
    jobcode
    startDate
    endDate
    laborTypeHours {
      jobTitle
      crewType
      totalManHours
      avgHoursPerDay
      dayCount
      employeeCount
    }
    materialProductivity {
      materialName
      crewType
      jobTitle
      totalTonnes
      totalCrewHours
      tonnesPerHour
      totalManHours
      tonnesPerManHour
      totalM3
      m3PerHour
      shipmentCount
      dailyReports {
        id
        date
      }
      dailyBreakdown {
        date
        dailyReportId
        tonnes
        crewHours
        tonnesPerHour
        manHours
        tonnesPerManHour
        rawM3
        m3PerHour
      }
    }
    overallTonnesPerHour
    totalTonnes
    totalCrewHours
    totalManHours
    overallTonnesPerManHour
    crewHoursDetail {
      date
      crewType
      avgCrewHours
      totalManHours
      totalEmployees
      crewCount
    }
  }
}
    `;
function useJobsiteProductivityQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteProductivityDocument, options);
}
function useJobsiteProductivityLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteProductivityDocument, options);
}
const JobsiteReportDocument = gql`
    query JobsiteReport($jobsiteMongoId: String!, $startDate: DateTime!, $endDate: DateTime!) {
  jobsiteReport(
    jobsiteMongoId: $jobsiteMongoId
    startDate: $startDate
    endDate: $endDate
  ) {
    _id
    startDate
    endDate
    jobsite {
      _id
      name
      jobcode
    }
    crewTypes
    summary {
      externalExpenseInvoiceValue
      internalExpenseInvoiceValue
      accrualExpenseInvoiceValue
      externalRevenueInvoiceValue
      internalRevenueInvoiceValue
      accrualRevenueInvoiceValue
    }
    dayReports {
      id
      date
      crewTypes
      summary {
        employeeHours
        employeeCost
        vehicleHours
        vehicleCost
        materialQuantity
        materialCost
        nonCostedMaterialQuantity
        truckingQuantity
        truckingHours
        truckingCost
        crewTypeSummaries {
          crewType
          employeeHours
          employeeCost
          vehicleHours
          vehicleCost
          materialQuantity
          materialCost
          nonCostedMaterialQuantity
          truckingQuantity
          truckingHours
          truckingCost
        }
      }
      employees {
        id
        employeeId
        employeeName
        hours
        cost
        crewType
      }
      vehicles {
        id
        vehicleId
        vehicleName
        vehicleCode
        hours
        cost
        crewType
      }
      materials {
        id
        materialName
        supplierName
        quantity
        unit
        rate
        cost
        estimated
        crewType
      }
      nonCostedMaterials {
        id
        materialName
        supplierName
        quantity
        unit
        crewType
      }
      trucking {
        id
        truckingType
        quantity
        hours
        rate
        rateType
        cost
        crewType
      }
    }
    expenseInvoices {
      id
      invoiceNumber
      companyName
      amount
      description
      invoiceType
      date
    }
    revenueInvoices {
      id
      invoiceNumber
      companyName
      amount
      description
      invoiceType
      date
    }
    issues {
      type
      entityId
      entityName
      count
    }
  }
}
    `;
function useJobsiteReportQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteReportDocument, options);
}
function useJobsiteReportLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteReportDocument, options);
}
const JobsiteSearchDocument = gql`
    query JobsiteSearch($searchString: String!, $options: SearchOptions) {
  jobsiteSearch(searchString: $searchString, options: $options) {
    ...JobsiteCardSnippet
  }
}
    ${JobsiteCardSnippetFragmentDoc}`;
function useJobsiteSearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteSearchDocument, options);
}
function useJobsiteSearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteSearchDocument, options);
}
const JobsiteYearMasterReportCurrentDocument = gql`
    query JobsiteYearMasterReportCurrent {
  jobsiteYearMasterReportCurrent {
    ...JobsiteYearMasterReportCardSnippet
  }
}
    ${JobsiteYearMasterReportCardSnippetFragmentDoc}`;
function useJobsiteYearMasterReportCurrentQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteYearMasterReportCurrentDocument, options);
}
function useJobsiteYearMasterReportCurrentLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteYearMasterReportCurrentDocument, options);
}
const JobsiteYearMasterReportCardDocument = gql`
    query JobsiteYearMasterReportCard($id: ID!) {
  jobsiteYearMasterReport(id: $id) {
    ...JobsiteYearMasterReportCardSnippet
  }
}
    ${JobsiteYearMasterReportCardSnippetFragmentDoc}`;
function useJobsiteYearMasterReportCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteYearMasterReportCardDocument, options);
}
function useJobsiteYearMasterReportCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteYearMasterReportCardDocument, options);
}
const JobsiteYearMasterReportFullDocument = gql`
    query JobsiteYearMasterReportFull($id: ID!) {
  jobsiteYearMasterReport(id: $id) {
    ...JobsiteYearMasterReportFullSnippet
  }
}
    ${JobsiteYearMasterReportFullSnippetFragmentDoc}`;
function useJobsiteYearMasterReportFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteYearMasterReportFullDocument, options);
}
function useJobsiteYearMasterReportFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteYearMasterReportFullDocument, options);
}
const JobsiteYearMasterReportsDocument = gql`
    query JobsiteYearMasterReports {
  jobsiteYearMasterReports {
    ...JobsiteYearMasterReportCardSnippet
  }
}
    ${JobsiteYearMasterReportCardSnippetFragmentDoc}`;
function useJobsiteYearMasterReportsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteYearMasterReportsDocument, options);
}
function useJobsiteYearMasterReportsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteYearMasterReportsDocument, options);
}
const JobsiteYearReportCardDocument = gql`
    query JobsiteYearReportCard($id: ID!) {
  jobsiteYearReport(id: $id) {
    ...JobsiteYearReportCardSnippet
  }
}
    ${JobsiteYearReportCardSnippetFragmentDoc}`;
function useJobsiteYearReportCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteYearReportCardDocument, options);
}
function useJobsiteYearReportCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteYearReportCardDocument, options);
}
const JobsiteYearReportFullDocument = gql`
    query JobsiteYearReportFull($id: ID!) {
  jobsiteYearReport(id: $id) {
    ...JobsiteYearReportNoFetchSnippet
  }
}
    ${JobsiteYearReportNoFetchSnippetFragmentDoc}`;
function useJobsiteYearReportFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteYearReportFullDocument, options);
}
function useJobsiteYearReportFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteYearReportFullDocument, options);
}
const JobsiteYearReportSummaryDocument = gql`
    query JobsiteYearReportSummary($id: ID!) {
  jobsiteYearReport(id: $id) {
    ...JobsiteYearReportSummarySnippet
  }
}
    ${JobsiteYearReportSummarySnippetFragmentDoc}`;
function useJobsiteYearReportSummaryQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteYearReportSummaryDocument, options);
}
function useJobsiteYearReportSummaryLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteYearReportSummaryDocument, options);
}
const JobsiteAllDataDocument = gql`
    query JobsiteAllData($id: String!) {
  jobsite(id: $id) {
    ...JobsiteAllDataSnippet
  }
}
    ${JobsiteAllDataSnippetFragmentDoc}`;
function useJobsiteAllDataQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteAllDataDocument, options);
}
function useJobsiteAllDataLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteAllDataDocument, options);
}
const JobsiteCurrentYearDocument = gql`
    query JobsiteCurrentYear($id: String!) {
  jobsite(id: $id) {
    ...JobsiteCurrentYearSnippet
  }
}
    ${JobsiteCurrentYearSnippetFragmentDoc}`;
function useJobsiteCurrentYearQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteCurrentYearDocument, options);
}
function useJobsiteCurrentYearLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteCurrentYearDocument, options);
}
const JobsiteFullDocument = gql`
    query JobsiteFull($id: String!) {
  jobsite(id: $id) {
    ...JobsiteFullSnippet
  }
}
    ${JobsiteFullSnippetFragmentDoc}`;
function useJobsiteFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteFullDocument, options);
}
function useJobsiteFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteFullDocument, options);
}
const JobsitesMaterialsDocument = gql`
    query JobsitesMaterials($id: String!) {
  jobsite(id: $id) {
    ...JobsiteMaterialsSnippet
  }
}
    ${JobsiteMaterialsSnippetFragmentDoc}`;
function useJobsitesMaterialsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsitesMaterialsDocument, options);
}
function useJobsitesMaterialsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsitesMaterialsDocument, options);
}
const JobsitesNonCostedMaterialsDocument = gql`
    query JobsitesNonCostedMaterials($id: String!) {
  jobsite(id: $id) {
    ...JobsiteNonCostedMaterialsSnippet
  }
}
    ${JobsiteNonCostedMaterialsSnippetFragmentDoc}`;
function useJobsitesNonCostedMaterialsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsitesNonCostedMaterialsDocument, options);
}
function useJobsitesNonCostedMaterialsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsitesNonCostedMaterialsDocument, options);
}
const JobsiteSsrDocument = gql`
    query JobsiteSSR($id: String!) {
  jobsite(id: $id) {
    ...JobsiteSSRSnippet
  }
}
    ${JobsiteSsrSnippetFragmentDoc}`;
function useJobsiteSsrQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteSsrDocument, options);
}
function useJobsiteSsrLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteSsrDocument, options);
}
const JobsiteFetchSearchDocument = gql`
    query JobsiteFetchSearch($id: String!) {
  jobsite(id: $id) {
    ...JobsiteSearchSnippet
  }
}
    ${JobsiteSearchSnippetFragmentDoc}`;
function useJobsiteFetchSearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsiteFetchSearchDocument, options);
}
function useJobsiteFetchSearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsiteFetchSearchDocument, options);
}
const JobsitesYearNonCostedMaterialsDocument = gql`
    query JobsitesYearNonCostedMaterials($id: String!) {
  jobsite(id: $id) {
    ...JobsiteYearNonCostedMaterialsSnippet
  }
}
    ${JobsiteYearNonCostedMaterialsSnippetFragmentDoc}`;
function useJobsitesYearNonCostedMaterialsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsitesYearNonCostedMaterialsDocument, options);
}
function useJobsitesYearNonCostedMaterialsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsitesYearNonCostedMaterialsDocument, options);
}
const JobsitesDocument = gql`
    query Jobsites($options: ListOptionData) {
  jobsites(options: $options) {
    ...JobsiteCardSnippet
  }
}
    ${JobsiteCardSnippetFragmentDoc}`;
function useJobsitesQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsitesDocument, options);
}
function useJobsitesLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsitesDocument, options);
}
const JobsitesTruckingRateDocument = gql`
    query JobsitesTruckingRate($options: ListOptionData) {
  jobsites(options: $options) {
    ...JobsiteTruckingRatesSnippet
  }
}
    ${JobsiteTruckingRatesSnippetFragmentDoc}`;
function useJobsitesTruckingRateQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(JobsitesTruckingRateDocument, options);
}
function useJobsitesTruckingRateLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(JobsitesTruckingRateDocument, options);
}
const MaterialSearchDocument = gql`
    query MaterialSearch($searchString: String!, $options: SearchOptions) {
  materialSearch(searchString: $searchString, options: $options) {
    ...MaterialCardSnippet
  }
}
    ${MaterialCardSnippetFragmentDoc}`;
function useMaterialSearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(MaterialSearchDocument, options);
}
function useMaterialSearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(MaterialSearchDocument, options);
}
const MaterialCardDocument = gql`
    query MaterialCard($id: String!) {
  material(id: $id) {
    ...MaterialCardSnippet
  }
}
    ${MaterialCardSnippetFragmentDoc}`;
function useMaterialCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(MaterialCardDocument, options);
}
function useMaterialCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(MaterialCardDocument, options);
}
const MaterialsCardDocument = gql`
    query MaterialsCard($options: ListOptionData) {
  materials(options: $options) {
    ...MaterialCardSnippet
  }
}
    ${MaterialCardSnippetFragmentDoc}`;
function useMaterialsCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(MaterialsCardDocument, options);
}
function useMaterialsCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(MaterialsCardDocument, options);
}
const MaterialsFullDocument = gql`
    query MaterialsFull($options: ListOptionData) {
  materials(options: $options) {
    ...MaterialFullSnippet
  }
}
    ${MaterialFullSnippetFragmentDoc}`;
function useMaterialsFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(MaterialsFullDocument, options);
}
function useMaterialsFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(MaterialsFullDocument, options);
}
const MechanicsDocument = gql`
    query Mechanics {
  mechanics {
    ...EmployeeCardSnippet
  }
}
    ${EmployeeCardSnippetFragmentDoc}`;
function useMechanicsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(MechanicsDocument, options);
}
function useMechanicsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(MechanicsDocument, options);
}
const OperatorDailyReportCardDocument = gql`
    query OperatorDailyReportCard($id: ID!) {
  operatorDailyReport(id: $id) {
    ...OperatorDailyReportCardSnippet
  }
}
    ${OperatorDailyReportCardSnippetFragmentDoc}`;
function useOperatorDailyReportCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(OperatorDailyReportCardDocument, options);
}
function useOperatorDailyReportCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(OperatorDailyReportCardDocument, options);
}
const OperatorDailyReportFullDocument = gql`
    query OperatorDailyReportFull($id: ID!) {
  operatorDailyReport(id: $id) {
    ...OperatorDailyReportFullSnippet
  }
}
    ${OperatorDailyReportFullSnippetFragmentDoc}`;
function useOperatorDailyReportFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(OperatorDailyReportFullDocument, options);
}
function useOperatorDailyReportFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(OperatorDailyReportFullDocument, options);
}
const OperatorDailyReportsDocument = gql`
    query OperatorDailyReports($options: ListOptionData) {
  operatorDailyReports(options: $options) {
    ...OperatorDailyReportCardSnippet
  }
}
    ${OperatorDailyReportCardSnippetFragmentDoc}`;
function useOperatorDailyReportsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(OperatorDailyReportsDocument, options);
}
function useOperatorDailyReportsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(OperatorDailyReportsDocument, options);
}
const ProductivityBenchmarksDocument = gql`
    query ProductivityBenchmarks($input: ProductivityBenchmarkInput!) {
  productivityBenchmarks(input: $input) {
    year
    averageTonnesPerHour
    totalTonnes
    totalCrewHours
    jobsiteCount
    availableMaterials {
      materialName
      crewType
      jobTitle
      key
      totalTonnes
      shipmentCount
    }
    jobsites {
      jobsiteId
      jobsiteName
      jobcode
      totalTonnes
      totalCrewHours
      tonnesPerHour
      shipmentCount
      percentFromAverage
      expectedTonnesPerHour
      percentFromExpected
    }
    crews {
      crewId
      crewName
      crewType
      totalTonnes
      totalCrewHours
      tonnesPerHour
      dayCount
      jobsiteCount
      percentFromAverage
    }
    regression {
      intercept
      slope
    }
  }
}
    `;
function useProductivityBenchmarksQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(ProductivityBenchmarksDocument, options);
}
function useProductivityBenchmarksLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(ProductivityBenchmarksDocument, options);
}
const PublicDocumentsDocument = gql`
    query PublicDocuments {
  publicDocuments {
    ...PublicDocumentSnippet
  }
}
    ${PublicDocumentSnippetFragmentDoc}`;
function usePublicDocumentsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(PublicDocumentsDocument, options);
}
function usePublicDocumentsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(PublicDocumentsDocument, options);
}
const SearchDocument = gql`
    query Search($searchString: String!) {
  search(searchString: $searchString) {
    ...SearchSnippet
  }
}
    ${SearchSnippetFragmentDoc}`;
function useSearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(SearchDocument, options);
}
function useSearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(SearchDocument, options);
}
const SignupSsrDocument = gql`
    query SignupSSR($id: String!) {
  signup(id: $id) {
    ...SignupFullSnippet
  }
}
    ${SignupFullSnippetFragmentDoc}`;
function useSignupSsrQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(SignupSsrDocument, options);
}
function useSignupSsrLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(SignupSsrDocument, options);
}
const SystemDocument = gql`
    query System {
  system {
    ...SystemSnippet
  }
}
    ${SystemSnippetFragmentDoc}`;
function useSystemQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(SystemDocument, options);
}
function useSystemLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(SystemDocument, options);
}
const UserCrewDocument = gql`
    query UserCrew($query: UserQuery!) {
  user(query: $query) {
    ...UserCrewSnippet
  }
}
    ${UserCrewSnippetFragmentDoc}`;
function useUserCrewQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(UserCrewDocument, options);
}
function useUserCrewLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(UserCrewDocument, options);
}
const UserForPasswordResetDocument = gql`
    query UserForPasswordReset($query: UserQuery!) {
  user(query: $query) {
    _id
    name
  }
}
    `;
function useUserForPasswordResetQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(UserForPasswordResetDocument, options);
}
function useUserForPasswordResetLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(UserForPasswordResetDocument, options);
}
const UsersDocument = gql`
    query Users($options: ListOptionData) {
  users(options: $options) {
    ...UserCardSnippet
  }
}
    ${UserCardSnippetFragmentDoc}`;
function useUsersQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(UsersDocument, options);
}
function useUsersLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(UsersDocument, options);
}
const VehicleHourReportsDocument = gql`
    query VehicleHourReports($id: ID!) {
  vehicleHourReports(id: $id) {
    years {
      year
      hours
    }
  }
}
    `;
function useVehicleHourReportsQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(VehicleHourReportsDocument, options);
}
function useVehicleHourReportsLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(VehicleHourReportsDocument, options);
}
const VehicleIssueDocument = gql`
    query VehicleIssue($id: ID!) {
  vehicleIssue(id: $id) {
    ...VehicleIssueFullSnippet
  }
}
    ${VehicleIssueFullSnippetFragmentDoc}`;
function useVehicleIssueQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(VehicleIssueDocument, options);
}
function useVehicleIssueLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(VehicleIssueDocument, options);
}
const VehicleIssueCardDocument = gql`
    query VehicleIssueCard($id: ID!) {
  vehicleIssue(id: $id) {
    ...VehicleIssueCardSnippet
  }
}
    ${VehicleIssueCardSnippetFragmentDoc}`;
function useVehicleIssueCardQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(VehicleIssueCardDocument, options);
}
function useVehicleIssueCardLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(VehicleIssueCardDocument, options);
}
const VehicleIssuesDocument = gql`
    query VehicleIssues($options: ListOptionData) {
  vehicleIssues(options: $options) {
    ...VehicleIssueCardSnippet
  }
}
    ${VehicleIssueCardSnippetFragmentDoc}`;
function useVehicleIssuesQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(VehicleIssuesDocument, options);
}
function useVehicleIssuesLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(VehicleIssuesDocument, options);
}
const VehicleSearchDocument = gql`
    query VehicleSearch($searchString: String!, $options: SearchOptions) {
  vehicleSearch(searchString: $searchString, options: $options) {
    ...VehicleSearchSnippet
  }
}
    ${VehicleSearchSnippetFragmentDoc}`;
function useVehicleSearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(VehicleSearchDocument, options);
}
function useVehicleSearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(VehicleSearchDocument, options);
}
const VehicleFullDocument = gql`
    query VehicleFull($id: String!) {
  vehicle(id: $id) {
    ...VehicleFullSnippet
  }
}
    ${VehicleFullSnippetFragmentDoc}`;
function useVehicleFullQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(VehicleFullDocument, options);
}
function useVehicleFullLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(VehicleFullDocument, options);
}
const VehicleSsrDocument = gql`
    query VehicleSSR($id: String!) {
  vehicle(id: $id) {
    ...VehicleSSRSnippet
  }
}
    ${VehicleSsrSnippetFragmentDoc}`;
function useVehicleSsrQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(VehicleSsrDocument, options);
}
function useVehicleSsrLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(VehicleSsrDocument, options);
}
const VehicleFetchSearchDocument = gql`
    query VehicleFetchSearch($id: String!) {
  vehicle(id: $id) {
    ...VehicleSearchSnippet
  }
}
    ${VehicleSearchSnippetFragmentDoc}`;
function useVehicleFetchSearchQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(VehicleFetchSearchDocument, options);
}
function useVehicleFetchSearchLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(VehicleFetchSearchDocument, options);
}
const VehiclesDocument = gql`
    query Vehicles($options: ListOptionData) {
  vehicles(options: $options) {
    ...VehicleCardSnippet
  }
}
    ${VehicleCardSnippetFragmentDoc}`;
function useVehiclesQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useQuery(VehiclesDocument, options);
}
function useVehiclesLazyQuery(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useLazyQuery(VehiclesDocument, options);
}
const JobsiteMonthReportSubDocument = gql`
    subscription JobsiteMonthReportSub($id: ID!) {
  jobsiteMonthReportSub(id: $id) {
    ...JobsiteMonthReportNoFetchSnippet
  }
}
    ${JobsiteMonthReportNoFetchSnippetFragmentDoc}`;
function useJobsiteMonthReportSubSubscription(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useSubscription(JobsiteMonthReportSubDocument, options);
}
const JobsiteYearMasterReportSubDocument = gql`
    subscription JobsiteYearMasterReportSub($id: ID!) {
  jobsiteYearMasterReportSub(id: $id) {
    ...JobsiteYearMasterReportFullSnippet
  }
}
    ${JobsiteYearMasterReportFullSnippetFragmentDoc}`;
function useJobsiteYearMasterReportSubSubscription(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useSubscription(JobsiteYearMasterReportSubDocument, options);
}
const JobsiteYearReportSubDocument = gql`
    subscription JobsiteYearReportSub($id: ID!) {
  jobsiteYearReportSub(id: $id) {
    ...JobsiteYearReportNoFetchSnippet
  }
}
    ${JobsiteYearReportNoFetchSnippetFragmentDoc}`;
function useJobsiteYearReportSubSubscription(baseOptions) {
  const options = { ...defaultOptions, ...baseOptions };
  return useSubscription(JobsiteYearReportSubDocument, options);
}

"use strict";
const isEmpty = (value) => value === void 0 || value === null || typeof value === "object" && Object.keys(value).length === 0 || typeof value === "string" && value.trim().length === 0;

"use strict";
const officeNumber = "+14039387920";

"use strict";
const ContactOffice = ({ text = "office" }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: `tel:${officeNumber}`, children: text });
};

"use strict";
const FormContainer = ({ children, ...props }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { backgroundColor: "gray.200", borderRadius: 4, p: 2, m: 2, ...props, children });
};

"use strict";
const Select = React.forwardRef(
  ({ options, errorMessage, helperText, label, error, ...rest }, ref) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      FormControl,
      {
        id: rest.name,
        isRequired: rest.isRequired,
        isDisabled: rest.isDisabled,
        isInvalid: !!errorMessage,
        isReadOnly: rest.isReadOnly,
        children: [
          label && /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { fontWeight: "bold", mb: 0, mt: 1, ml: 1, children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select$1, { ref, backgroundColor: "white", ...rest, children: options.map((option, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option.value, children: option.title }, index)) }),
          errorMessage && /* @__PURE__ */ jsxRuntimeExports.jsx(FormErrorMessage, { children: errorMessage }),
          helperText && /* @__PURE__ */ jsxRuntimeExports.jsx(FormHelperText, { children: helperText })
        ]
      }
    );
  }
);
Select.displayName = "Select";

var dayjs_min$1 = {exports: {}};

var dayjs_min = dayjs_min$1.exports;

var hasRequiredDayjs_min;

function requireDayjs_min () {
	if (hasRequiredDayjs_min) return dayjs_min$1.exports;
	hasRequiredDayjs_min = 1;
	(function (module, exports$1) {
		!function(t,e){"object"=='object'&&"undefined"!='object'?module.exports=e():"function"==typeof undefined&&undefined.amd?undefined(e):(t="undefined"!=typeof globalThis?globalThis:t||self).dayjs=e();}(dayjs_min,(function(){"use strict";var t=1e3,e=6e4,n=36e5,r="millisecond",i="second",s="minute",u="hour",a="day",o="week",f="month",h="quarter",c="year",d="date",l="Invalid Date",$=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,y=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,M={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(t){var e=["th","st","nd","rd"],n=t%100;return "["+t+(e[(n-20)%10]||e[n]||e[0])+"]"}},m=function(t,e,n){var r=String(t);return !r||r.length>=e?t:""+Array(e+1-r.length).join(n)+t},v={s:m,z:function(t){var e=-t.utcOffset(),n=Math.abs(e),r=Math.floor(n/60),i=n%60;return (e<=0?"+":"-")+m(r,2,"0")+":"+m(i,2,"0")},m:function t(e,n){if(e.date()<n.date())return -t(n,e);var r=12*(n.year()-e.year())+(n.month()-e.month()),i=e.clone().add(r,f),s=n-i<0,u=e.clone().add(r+(s?-1:1),f);return +(-(r+(n-i)/(s?i-u:u-i))||0)},a:function(t){return t<0?Math.ceil(t)||0:Math.floor(t)},p:function(t){return {M:f,y:c,w:o,d:a,D:d,h:u,m:s,s:i,ms:r,Q:h}[t]||String(t||"").toLowerCase().replace(/s$/,"")},u:function(t){return void 0===t}},g="en",D={};D[g]=M;var p=function(t){return t instanceof _},S=function t(e,n,r){var i;if(!e)return g;if("string"==typeof e){var s=e.toLowerCase();D[s]&&(i=s),n&&(D[s]=n,i=s);var u=e.split("-");if(!i&&u.length>1)return t(u[0])}else {var a=e.name;D[a]=e,i=a;}return !r&&i&&(g=i),i||!r&&g},w=function(t,e){if(p(t))return t.clone();var n="object"==typeof e?e:{};return n.date=t,n.args=arguments,new _(n)},O=v;O.l=S,O.i=p,O.w=function(t,e){return w(t,{locale:e.$L,utc:e.$u,x:e.$x,$offset:e.$offset})};var _=function(){function M(t){this.$L=S(t.locale,null,!0),this.parse(t);}var m=M.prototype;return m.parse=function(t){this.$d=function(t){var e=t.date,n=t.utc;if(null===e)return new Date(NaN);if(O.u(e))return new Date;if(e instanceof Date)return new Date(e);if("string"==typeof e&&!/Z$/i.test(e)){var r=e.match($);if(r){var i=r[2]-1||0,s=(r[7]||"0").substring(0,3);return n?new Date(Date.UTC(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)):new Date(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)}}return new Date(e)}(t),this.$x=t.x||{},this.init();},m.init=function(){var t=this.$d;this.$y=t.getFullYear(),this.$M=t.getMonth(),this.$D=t.getDate(),this.$W=t.getDay(),this.$H=t.getHours(),this.$m=t.getMinutes(),this.$s=t.getSeconds(),this.$ms=t.getMilliseconds();},m.$utils=function(){return O},m.isValid=function(){return !(this.$d.toString()===l)},m.isSame=function(t,e){var n=w(t);return this.startOf(e)<=n&&n<=this.endOf(e)},m.isAfter=function(t,e){return w(t)<this.startOf(e)},m.isBefore=function(t,e){return this.endOf(e)<w(t)},m.$g=function(t,e,n){return O.u(t)?this[e]:this.set(n,t)},m.unix=function(){return Math.floor(this.valueOf()/1e3)},m.valueOf=function(){return this.$d.getTime()},m.startOf=function(t,e){var n=this,r=!!O.u(e)||e,h=O.p(t),l=function(t,e){var i=O.w(n.$u?Date.UTC(n.$y,e,t):new Date(n.$y,e,t),n);return r?i:i.endOf(a)},$=function(t,e){return O.w(n.toDate()[t].apply(n.toDate("s"),(r?[0,0,0,0]:[23,59,59,999]).slice(e)),n)},y=this.$W,M=this.$M,m=this.$D,v="set"+(this.$u?"UTC":"");switch(h){case c:return r?l(1,0):l(31,11);case f:return r?l(1,M):l(0,M+1);case o:var g=this.$locale().weekStart||0,D=(y<g?y+7:y)-g;return l(r?m-D:m+(6-D),M);case a:case d:return $(v+"Hours",0);case u:return $(v+"Minutes",1);case s:return $(v+"Seconds",2);case i:return $(v+"Milliseconds",3);default:return this.clone()}},m.endOf=function(t){return this.startOf(t,!1)},m.$set=function(t,e){var n,o=O.p(t),h="set"+(this.$u?"UTC":""),l=(n={},n[a]=h+"Date",n[d]=h+"Date",n[f]=h+"Month",n[c]=h+"FullYear",n[u]=h+"Hours",n[s]=h+"Minutes",n[i]=h+"Seconds",n[r]=h+"Milliseconds",n)[o],$=o===a?this.$D+(e-this.$W):e;if(o===f||o===c){var y=this.clone().set(d,1);y.$d[l]($),y.init(),this.$d=y.set(d,Math.min(this.$D,y.daysInMonth())).$d;}else l&&this.$d[l]($);return this.init(),this},m.set=function(t,e){return this.clone().$set(t,e)},m.get=function(t){return this[O.p(t)]()},m.add=function(r,h){var d,l=this;r=Number(r);var $=O.p(h),y=function(t){var e=w(l);return O.w(e.date(e.date()+Math.round(t*r)),l)};if($===f)return this.set(f,this.$M+r);if($===c)return this.set(c,this.$y+r);if($===a)return y(1);if($===o)return y(7);var M=(d={},d[s]=e,d[u]=n,d[i]=t,d)[$]||1,m=this.$d.getTime()+r*M;return O.w(m,this)},m.subtract=function(t,e){return this.add(-1*t,e)},m.format=function(t){var e=this,n=this.$locale();if(!this.isValid())return n.invalidDate||l;var r=t||"YYYY-MM-DDTHH:mm:ssZ",i=O.z(this),s=this.$H,u=this.$m,a=this.$M,o=n.weekdays,f=n.months,h=function(t,n,i,s){return t&&(t[n]||t(e,r))||i[n].slice(0,s)},c=function(t){return O.s(s%12||12,t,"0")},d=n.meridiem||function(t,e,n){var r=t<12?"AM":"PM";return n?r.toLowerCase():r},$={YY:String(this.$y).slice(-2),YYYY:this.$y,M:a+1,MM:O.s(a+1,2,"0"),MMM:h(n.monthsShort,a,f,3),MMMM:h(f,a),D:this.$D,DD:O.s(this.$D,2,"0"),d:String(this.$W),dd:h(n.weekdaysMin,this.$W,o,2),ddd:h(n.weekdaysShort,this.$W,o,3),dddd:o[this.$W],H:String(s),HH:O.s(s,2,"0"),h:c(1),hh:c(2),a:d(s,u,!0),A:d(s,u,!1),m:String(u),mm:O.s(u,2,"0"),s:String(this.$s),ss:O.s(this.$s,2,"0"),SSS:O.s(this.$ms,3,"0"),Z:i};return r.replace(y,(function(t,e){return e||$[t]||i.replace(":","")}))},m.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},m.diff=function(r,d,l){var $,y=O.p(d),M=w(r),m=(M.utcOffset()-this.utcOffset())*e,v=this-M,g=O.m(this,M);return g=($={},$[c]=g/12,$[f]=g,$[h]=g/3,$[o]=(v-m)/6048e5,$[a]=(v-m)/864e5,$[u]=v/n,$[s]=v/e,$[i]=v/t,$)[y]||v,l?g:O.a(g)},m.daysInMonth=function(){return this.endOf(f).$D},m.$locale=function(){return D[this.$L]},m.locale=function(t,e){if(!t)return this.$L;var n=this.clone(),r=S(t,e,!0);return r&&(n.$L=r),n},m.clone=function(){return O.w(this.$d,this)},m.toDate=function(){return new Date(this.valueOf())},m.toJSON=function(){return this.isValid()?this.toISOString():null},m.toISOString=function(){return this.$d.toISOString()},m.toString=function(){return this.$d.toUTCString()},M}(),T=_.prototype;return w.prototype=T,[["$ms",r],["$s",i],["$m",s],["$H",u],["$W",a],["$M",f],["$y",c],["$D",d]].forEach((function(t){T[t[1]]=function(e){return this.$g(e,t[0],t[1])};})),w.extend=function(t,e){return t.$i||(t(e,_,w),t.$i=!0),w},w.locale=S,w.isDayjs=p,w.unix=function(t){return w(1e3*t)},w.en=D[g],w.Ls=D,w.p={},w})); 
	} (dayjs_min$1, dayjs_min$1.exports));
	return dayjs_min$1.exports;
}

var dayjs_minExports = requireDayjs_min();
const dayjs = /*@__PURE__*/getDefaultExportFromCjs(dayjs_minExports);

"use strict";
const TextField = React.forwardRef(
  ({
    label,
    errorMessage,
    helperText,
    inputLeftAddon,
    inputLeftElement,
    inputRightAddon,
    inputRightElement,
    inputRightElementProps,
    ...props
  }, ref) => {
    let value = props.value;
    if (props.type === "date" && value) {
      value = dayjs(value.toString()).format("YYYY-MM-DD");
    } else if (props.type === "time" && value && new Date(value.toString()).toString() !== "Invalid Date") {
      value = dayjs(value.toString()).format("HH:mm");
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { isInvalid: !!errorMessage, margin: "auto", children: [
      label && /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { fontWeight: "bold", mb: 0, mt: 1, ml: 1, children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
        inputLeftElement && /* @__PURE__ */ jsxRuntimeExports.jsx(InputLeftElement, { h: "auto", children: inputLeftElement }),
        inputLeftAddon && /* @__PURE__ */ jsxRuntimeExports.jsx(InputLeftAddon, { children: inputLeftAddon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { ref, backgroundColor: "white", ...props, value }),
        inputRightElement && /* @__PURE__ */ jsxRuntimeExports.jsx(InputRightElement, { ...inputRightElementProps, children: inputRightElement }),
        inputRightAddon && /* @__PURE__ */ jsxRuntimeExports.jsx(InputRightAddon, { children: inputRightAddon })
      ] }),
      errorMessage && /* @__PURE__ */ jsxRuntimeExports.jsx(FormErrorMessage, { children: errorMessage }),
      helperText && /* @__PURE__ */ jsxRuntimeExports.jsx(FormHelperText, { children: helperText })
    ] });
  }
);
TextField.displayName = "TextField";

"use strict";
const isObjectId = (val) => val.match(/^[a-f\d]{24}$/i);

var link$1 = {};

var router$1 = {};

var normalizeTrailingSlash = {};

var hasRequiredNormalizeTrailingSlash;

function requireNormalizeTrailingSlash () {
	if (hasRequiredNormalizeTrailingSlash) return normalizeTrailingSlash;
	hasRequiredNormalizeTrailingSlash = 1;
	"use strict";
	var define_process_env_default = {};
	Object.defineProperty(normalizeTrailingSlash, "__esModule", {
	  value: true
	});
	normalizeTrailingSlash.removePathTrailingSlash = removePathTrailingSlash;
	normalizeTrailingSlash.normalizePathTrailingSlash = void 0;
	function removePathTrailingSlash(path) {
	  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
	}
	const normalizePathTrailingSlash = define_process_env_default.__NEXT_TRAILING_SLASH ? (path) => {
	  if (/\.[^/]+\/?$/.test(path)) {
	    return removePathTrailingSlash(path);
	  } else if (path.endsWith("/")) {
	    return path;
	  } else {
	    return path + "/";
	  }
	} : removePathTrailingSlash;
	normalizeTrailingSlash.normalizePathTrailingSlash = normalizePathTrailingSlash;
	return normalizeTrailingSlash;
}

var routeLoader = {};

var getAssetPathFromRoute = {};

var hasRequiredGetAssetPathFromRoute;

function requireGetAssetPathFromRoute () {
	if (hasRequiredGetAssetPathFromRoute) return getAssetPathFromRoute;
	hasRequiredGetAssetPathFromRoute = 1;
	"use strict";
	Object.defineProperty(getAssetPathFromRoute, "__esModule", {
	    value: true
	});
	getAssetPathFromRoute.default = getAssetPathFromRoute$1;
	function getAssetPathFromRoute$1(route, ext = '') {
	    const path = route === '/' ? '/index' : /^\/index(\/|$)/.test(route) ? `/index${route}` : `${route}`;
	    return path + ext;
	}

	
	return getAssetPathFromRoute;
}

var requestIdleCallback = {};

var hasRequiredRequestIdleCallback;

function requireRequestIdleCallback () {
	if (hasRequiredRequestIdleCallback) return requestIdleCallback;
	hasRequiredRequestIdleCallback = 1;
	"use strict";
	Object.defineProperty(requestIdleCallback, "__esModule", {
	    value: true
	});
	requestIdleCallback.cancelIdleCallback = requestIdleCallback.requestIdleCallback = void 0;
	const requestIdleCallback$1 = typeof self !== 'undefined' && self.requestIdleCallback && self.requestIdleCallback.bind(window) || function(cb) {
	    let start = Date.now();
	    return setTimeout(function() {
	        cb({
	            didTimeout: false,
	            timeRemaining: function() {
	                return Math.max(0, 50 - (Date.now() - start));
	            }
	        });
	    }, 1);
	};
	requestIdleCallback.requestIdleCallback = requestIdleCallback$1;
	const cancelIdleCallback = typeof self !== 'undefined' && self.cancelIdleCallback && self.cancelIdleCallback.bind(window) || function(id) {
	    return clearTimeout(id);
	};
	requestIdleCallback.cancelIdleCallback = cancelIdleCallback;

	
	return requestIdleCallback;
}

var hasRequiredRouteLoader;

function requireRouteLoader () {
	if (hasRequiredRouteLoader) return routeLoader;
	hasRequiredRouteLoader = 1;
	"use strict";
	var define_process_env_default = {};
	Object.defineProperty(routeLoader, "__esModule", {
	  value: true
	});
	routeLoader.markAssetError = markAssetError;
	routeLoader.isAssetError = isAssetError;
	routeLoader.getClientBuildManifest = getClientBuildManifest;
	routeLoader.getMiddlewareManifest = getMiddlewareManifest;
	routeLoader.createRouteLoader = createRouteLoader;
	var _getAssetPathFromRoute = _interopRequireDefault(requireGetAssetPathFromRoute());
	var _requestIdleCallback = requireRequestIdleCallback();
	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : {
	    default: obj
	  };
	}
	const MS_MAX_IDLE_DELAY = 3800;
	function withFuture(key, map, generator) {
	  let entry = map.get(key);
	  if (entry) {
	    if ("future" in entry) {
	      return entry.future;
	    }
	    return Promise.resolve(entry);
	  }
	  let resolver;
	  const prom = new Promise((resolve) => {
	    resolver = resolve;
	  });
	  map.set(key, entry = {
	    resolve: resolver,
	    future: prom
	  });
	  return generator ? generator().then(
	    (value) => (resolver(value), value)
	  ).catch((err) => {
	    map.delete(key);
	    throw err;
	  }) : prom;
	}
	function hasPrefetch(link) {
	  try {
	    link = document.createElement("link");
	    return (
	      // detect IE11 since it supports prefetch but isn't detected
	      // with relList.support
	      !!window.MSInputMethodContext && !!document.documentMode || link.relList.supports("prefetch")
	    );
	  } catch (e) {
	    return false;
	  }
	}
	const canPrefetch = hasPrefetch();
	function prefetchViaDom(href, as, link) {
	  return new Promise((res, rej) => {
	    const selector = `
      link[rel="prefetch"][href^="${href}"],
      link[rel="preload"][href^="${href}"],
      script[src^="${href}"]`;
	    if (document.querySelector(selector)) {
	      return res();
	    }
	    link = document.createElement("link");
	    if (as) link.as = as;
	    link.rel = `prefetch`;
	    link.crossOrigin = define_process_env_default.__NEXT_CROSS_ORIGIN;
	    link.onload = res;
	    link.onerror = rej;
	    link.href = href;
	    document.head.appendChild(link);
	  });
	}
	const ASSET_LOAD_ERROR = Symbol("ASSET_LOAD_ERROR");
	function markAssetError(err) {
	  return Object.defineProperty(err, ASSET_LOAD_ERROR, {});
	}
	function isAssetError(err) {
	  return err && ASSET_LOAD_ERROR in err;
	}
	function appendScript(src, script) {
	  return new Promise((resolve, reject) => {
	    script = document.createElement("script");
	    script.onload = resolve;
	    script.onerror = () => reject(markAssetError(new Error(`Failed to load script: ${src}`)));
	    script.crossOrigin = define_process_env_default.__NEXT_CROSS_ORIGIN;
	    script.src = src;
	    document.body.appendChild(script);
	  });
	}
	let devBuildPromise;
	function resolvePromiseWithTimeout(p, ms, err) {
	  return new Promise((resolve, reject) => {
	    let cancelled = false;
	    p.then((r) => {
	      cancelled = true;
	      resolve(r);
	    }).catch(reject);
	    if (false) {
	      (devBuildPromise || Promise.resolve()).then(() => {
	        (0, _requestIdleCallback).requestIdleCallback(
	          () => setTimeout(() => {
	            if (!cancelled) {
	              reject(err);
	            }
	          }, ms)
	        );
	      });
	    }
	    if (true) {
	      (0, _requestIdleCallback).requestIdleCallback(
	        () => setTimeout(() => {
	          if (!cancelled) {
	            reject(err);
	          }
	        }, ms)
	      );
	    }
	  });
	}
	function getClientBuildManifest() {
	  if (self.__BUILD_MANIFEST) {
	    return Promise.resolve(self.__BUILD_MANIFEST);
	  }
	  const onBuildManifest = new Promise((resolve) => {
	    const cb = self.__BUILD_MANIFEST_CB;
	    self.__BUILD_MANIFEST_CB = () => {
	      resolve(self.__BUILD_MANIFEST);
	      cb && cb();
	    };
	  });
	  return resolvePromiseWithTimeout(onBuildManifest, MS_MAX_IDLE_DELAY, markAssetError(new Error("Failed to load client build manifest")));
	}
	function getMiddlewareManifest() {
	  if (self.__MIDDLEWARE_MANIFEST) {
	    return Promise.resolve(self.__MIDDLEWARE_MANIFEST);
	  }
	  const onMiddlewareManifest = new Promise((resolve) => {
	    const cb = self.__MIDDLEWARE_MANIFEST_CB;
	    self.__MIDDLEWARE_MANIFEST_CB = () => {
	      resolve(self.__MIDDLEWARE_MANIFEST);
	      cb && cb();
	    };
	  });
	  return resolvePromiseWithTimeout(onMiddlewareManifest, MS_MAX_IDLE_DELAY, markAssetError(new Error("Failed to load client middleware manifest")));
	}
	function getFilesForRoute(assetPrefix, route) {
	  if (false) {
	    return Promise.resolve({
	      scripts: [
	        assetPrefix + "/_next/static/chunks/pages" + encodeURI((0, _getAssetPathFromRoute).default(route, ".js"))
	      ],
	      // Styles are handled by `style-loader` in development:
	      css: []
	    });
	  }
	  return getClientBuildManifest().then((manifest) => {
	    if (!(route in manifest)) {
	      throw markAssetError(new Error(`Failed to lookup route: ${route}`));
	    }
	    const allFiles = manifest[route].map(
	      (entry) => assetPrefix + "/_next/" + encodeURI(entry)
	    );
	    return {
	      scripts: allFiles.filter(
	        (v) => v.endsWith(".js")
	      ),
	      css: allFiles.filter(
	        (v) => v.endsWith(".css")
	      )
	    };
	  });
	}
	function createRouteLoader(assetPrefix) {
	  const entrypoints = /* @__PURE__ */ new Map();
	  const loadedScripts = /* @__PURE__ */ new Map();
	  const styleSheets = /* @__PURE__ */ new Map();
	  const routes = /* @__PURE__ */ new Map();
	  function maybeExecuteScript(src) {
	    if (true) {
	      let prom = loadedScripts.get(src);
	      if (prom) {
	        return prom;
	      }
	      if (document.querySelector(`script[src^="${src}"]`)) {
	        return Promise.resolve();
	      }
	      loadedScripts.set(src, prom = appendScript(src));
	      return prom;
	    } else {
	      return appendScript(src);
	    }
	  }
	  function fetchStyleSheet(href) {
	    let prom = styleSheets.get(href);
	    if (prom) {
	      return prom;
	    }
	    styleSheets.set(href, prom = fetch(href).then((res) => {
	      if (!res.ok) {
	        throw new Error(`Failed to load stylesheet: ${href}`);
	      }
	      return res.text().then(
	        (text) => ({
	          href,
	          content: text
	        })
	      );
	    }).catch((err) => {
	      throw markAssetError(err);
	    }));
	    return prom;
	  }
	  return {
	    whenEntrypoint(route) {
	      return withFuture(route, entrypoints);
	    },
	    onEntrypoint(route, execute) {
	      (execute ? Promise.resolve().then(
	        () => execute()
	      ).then(
	        (exports2) => ({
	          component: exports2 && exports2.default || exports2,
	          exports: exports2
	        }),
	        (err) => ({
	          error: err
	        })
	      ) : Promise.resolve(void 0)).then((input) => {
	        const old = entrypoints.get(route);
	        if (old && "resolve" in old) {
	          if (input) {
	            entrypoints.set(route, input);
	            old.resolve(input);
	          }
	        } else {
	          if (input) {
	            entrypoints.set(route, input);
	          } else {
	            entrypoints.delete(route);
	          }
	          routes.delete(route);
	        }
	      });
	    },
	    loadRoute(route, prefetch) {
	      return withFuture(route, routes, () => {
	        const routeFilesPromise = getFilesForRoute(assetPrefix, route).then(({ scripts, css }) => {
	          return Promise.all([
	            entrypoints.has(route) ? [] : Promise.all(scripts.map(maybeExecuteScript)),
	            Promise.all(css.map(fetchStyleSheet))
	          ]);
	        }).then((res) => {
	          return this.whenEntrypoint(route).then(
	            (entrypoint) => ({
	              entrypoint,
	              styles: res[1]
	            })
	          );
	        });
	        if (false) {
	          devBuildPromise = new Promise((resolve) => {
	            if (routeFilesPromise) {
	              return routeFilesPromise.finally(() => {
	                resolve();
	              });
	            }
	          });
	        }
	        return resolvePromiseWithTimeout(routeFilesPromise, MS_MAX_IDLE_DELAY, markAssetError(new Error(`Route did not complete loading: ${route}`))).then(({ entrypoint, styles }) => {
	          const res = Object.assign({
	            styles
	          }, entrypoint);
	          return "error" in entrypoint ? entrypoint : res;
	        }).catch((err) => {
	          if (prefetch) {
	            throw err;
	          }
	          return {
	            error: err
	          };
	        });
	      });
	    },
	    prefetch(route) {
	      let cn;
	      if (cn = navigator.connection) {
	        if (cn.saveData || /2g/.test(cn.effectiveType)) return Promise.resolve();
	      }
	      return getFilesForRoute(assetPrefix, route).then(
	        (output) => Promise.all(canPrefetch ? output.scripts.map(
	          (script) => prefetchViaDom(script, "script")
	        ) : [])
	      ).then(() => {
	        (0, _requestIdleCallback).requestIdleCallback(
	          () => this.loadRoute(route, true).catch(() => {
	          })
	        );
	      }).catch(
	        // swallow prefetch errors
	        () => {
	        }
	      );
	    }
	  };
	}
	return routeLoader;
}

var isError = {};

var hasRequiredIsError;

function requireIsError () {
	if (hasRequiredIsError) return isError;
	hasRequiredIsError = 1;
	"use strict";
	Object.defineProperty(isError, "__esModule", {
	    value: true
	});
	isError.default = isError$1;
	function isError$1(err) {
	    return typeof err === 'object' && err !== null && 'name' in err && 'message' in err;
	}

	
	return isError;
}

var denormalizePagePath = {};

var hasRequiredDenormalizePagePath;

function requireDenormalizePagePath () {
	if (hasRequiredDenormalizePagePath) return denormalizePagePath;
	hasRequiredDenormalizePagePath = 1;
	"use strict";
	Object.defineProperty(denormalizePagePath, "__esModule", {
	    value: true
	});
	denormalizePagePath.normalizePathSep = normalizePathSep;
	denormalizePagePath.denormalizePagePath = denormalizePagePath$1;
	function normalizePathSep(path) {
	    return path.replace(/\\/g, '/');
	}
	function denormalizePagePath$1(page) {
	    page = normalizePathSep(page);
	    if (page.startsWith('/index/')) {
	        page = page.slice(6);
	    } else if (page === '/index') {
	        page = '/';
	    }
	    return page;
	}

	
	return denormalizePagePath;
}

var normalizeLocalePath = {};

var hasRequiredNormalizeLocalePath;

function requireNormalizeLocalePath () {
	if (hasRequiredNormalizeLocalePath) return normalizeLocalePath;
	hasRequiredNormalizeLocalePath = 1;
	"use strict";
	Object.defineProperty(normalizeLocalePath, "__esModule", {
	    value: true
	});
	normalizeLocalePath.normalizeLocalePath = normalizeLocalePath$1;
	function normalizeLocalePath$1(pathname, locales) {
	    let detectedLocale;
	    // first item will be empty string from splitting at first char
	    const pathnameParts = pathname.split('/');
	    (locales || []).some((locale)=>{
	        if (pathnameParts[1].toLowerCase() === locale.toLowerCase()) {
	            detectedLocale = locale;
	            pathnameParts.splice(1, 1);
	            pathname = pathnameParts.join('/') || '/';
	            return true;
	        }
	        return false;
	    });
	    return {
	        pathname,
	        detectedLocale
	    };
	}

	
	return normalizeLocalePath;
}

var mitt = {};

var hasRequiredMitt;

function requireMitt () {
	if (hasRequiredMitt) return mitt;
	hasRequiredMitt = 1;
	"use strict";
	Object.defineProperty(mitt, "__esModule", {
	    value: true
	});
	mitt.default = mitt$1;
	function mitt$1() {
	    const all = Object.create(null);
	    return {
	        on (type, handler) {
	            (all[type] || (all[type] = [])).push(handler);
	        },
	        off (type, handler) {
	            if (all[type]) {
	                all[type].splice(all[type].indexOf(handler) >>> 0, 1);
	            }
	        },
	        emit (type, ...evts) {
	            (all[type] || []).slice().map((handler)=>{
	                handler(...evts);
	            });
	        }
	    };
	}

	
	return mitt;
}

var utils = {};

var formatUrl = {};

var querystring = {};

var hasRequiredQuerystring;

function requireQuerystring () {
	if (hasRequiredQuerystring) return querystring;
	hasRequiredQuerystring = 1;
	"use strict";
	Object.defineProperty(querystring, "__esModule", {
	    value: true
	});
	querystring.searchParamsToUrlQuery = searchParamsToUrlQuery;
	querystring.urlQueryToSearchParams = urlQueryToSearchParams;
	querystring.assign = assign;
	function searchParamsToUrlQuery(searchParams) {
	    const query = {
	    };
	    searchParams.forEach((value, key)=>{
	        if (typeof query[key] === 'undefined') {
	            query[key] = value;
	        } else if (Array.isArray(query[key])) {
	            query[key].push(value);
	        } else {
	            query[key] = [
	                query[key],
	                value
	            ];
	        }
	    });
	    return query;
	}
	function stringifyUrlQueryParam(param) {
	    if (typeof param === 'string' || typeof param === 'number' && !isNaN(param) || typeof param === 'boolean') {
	        return String(param);
	    } else {
	        return '';
	    }
	}
	function urlQueryToSearchParams(urlQuery) {
	    const result = new URLSearchParams();
	    Object.entries(urlQuery).forEach(([key, value])=>{
	        if (Array.isArray(value)) {
	            value.forEach((item)=>result.append(key, stringifyUrlQueryParam(item))
	            );
	        } else {
	            result.set(key, stringifyUrlQueryParam(value));
	        }
	    });
	    return result;
	}
	function assign(target, ...searchParamsList) {
	    searchParamsList.forEach((searchParams)=>{
	        Array.from(searchParams.keys()).forEach((key)=>target.delete(key)
	        );
	        searchParams.forEach((value, key)=>target.append(key, value)
	        );
	    });
	    return target;
	}

	
	return querystring;
}

var hasRequiredFormatUrl;

function requireFormatUrl () {
	if (hasRequiredFormatUrl) return formatUrl;
	hasRequiredFormatUrl = 1;
	"use strict";
	Object.defineProperty(formatUrl, "__esModule", {
	    value: true
	});
	formatUrl.formatUrl = formatUrl$1;
	var querystring = _interopRequireWildcard(requireQuerystring());
	function _interopRequireWildcard(obj) {
	    if (obj && obj.__esModule) {
	        return obj;
	    } else {
	        var newObj = {
	        };
	        if (obj != null) {
	            for(var key in obj){
	                if (Object.prototype.hasOwnProperty.call(obj, key)) {
	                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {
	                    };
	                    if (desc.get || desc.set) {
	                        Object.defineProperty(newObj, key, desc);
	                    } else {
	                        newObj[key] = obj[key];
	                    }
	                }
	            }
	        }
	        newObj.default = obj;
	        return newObj;
	    }
	}
	const slashedProtocols = /https?|ftp|gopher|file/;
	function formatUrl$1(urlObj) {
	    let { auth , hostname  } = urlObj;
	    let protocol = urlObj.protocol || '';
	    let pathname = urlObj.pathname || '';
	    let hash = urlObj.hash || '';
	    let query = urlObj.query || '';
	    let host = false;
	    auth = auth ? encodeURIComponent(auth).replace(/%3A/i, ':') + '@' : '';
	    if (urlObj.host) {
	        host = auth + urlObj.host;
	    } else if (hostname) {
	        host = auth + (~hostname.indexOf(':') ? `[${hostname}]` : hostname);
	        if (urlObj.port) {
	            host += ':' + urlObj.port;
	        }
	    }
	    if (query && typeof query === 'object') {
	        query = String(querystring.urlQueryToSearchParams(query));
	    }
	    let search = urlObj.search || query && `?${query}` || '';
	    if (protocol && protocol.substr(-1) !== ':') protocol += ':';
	    if (urlObj.slashes || (!protocol || slashedProtocols.test(protocol)) && host !== false) {
	        host = '//' + (host || '');
	        if (pathname && pathname[0] !== '/') pathname = '/' + pathname;
	    } else if (!host) {
	        host = '';
	    }
	    if (hash && hash[0] !== '#') hash = '#' + hash;
	    if (search && search[0] !== '?') search = '?' + search;
	    pathname = pathname.replace(/[?#]/g, encodeURIComponent);
	    search = search.replace('#', '%23');
	    return `${protocol}${host}${pathname}${search}${hash}`;
	}

	
	return formatUrl;
}

var hasRequiredUtils;

function requireUtils () {
	if (hasRequiredUtils) return utils;
	hasRequiredUtils = 1;
	"use strict";
	Object.defineProperty(utils, "__esModule", {
	  value: true
	});
	utils.execOnce = execOnce;
	utils.getLocationOrigin = getLocationOrigin;
	utils.getURL = getURL;
	utils.getDisplayName = getDisplayName;
	utils.isResSent = isResSent;
	utils.normalizeRepeatedSlashes = normalizeRepeatedSlashes;
	utils.loadGetInitialProps = loadGetInitialProps;
	utils.formatWithValidation = formatWithValidation;
	utils.HtmlContext = utils.ST = utils.SP = utils.urlObjectKeys = void 0;
	var _formatUrl = requireFormatUrl();
	var _react = requireReact();
	function execOnce(fn) {
	  let used = false;
	  let result;
	  return (...args) => {
	    if (!used) {
	      used = true;
	      result = fn(...args);
	    }
	    return result;
	  };
	}
	function getLocationOrigin() {
	  const { protocol, hostname, port } = window.location;
	  return `${protocol}//${hostname}${port ? ":" + port : ""}`;
	}
	function getURL() {
	  const { href } = window.location;
	  const origin = getLocationOrigin();
	  return href.substring(origin.length);
	}
	function getDisplayName(Component) {
	  return typeof Component === "string" ? Component : Component.displayName || Component.name || "Unknown";
	}
	function isResSent(res) {
	  return res.finished || res.headersSent;
	}
	function normalizeRepeatedSlashes(url) {
	  const urlParts = url.split("?");
	  const urlNoQuery = urlParts[0];
	  return urlNoQuery.replace(/\\/g, "/").replace(/\/\/+/g, "/") + (urlParts[1] ? `?${urlParts.slice(1).join("?")}` : "");
	}
	async function loadGetInitialProps(App, ctx) {
	  if (false) {
	    var ref;
	    if ((ref = App.prototype) === null || ref === void 0 ? void 0 : ref.getInitialProps) {
	      const message = `"${getDisplayName(App)}.getInitialProps()" is defined as an instance method - visit https://nextjs.org/docs/messages/get-initial-props-as-an-instance-method for more information.`;
	      throw new Error(message);
	    }
	  }
	  const res = ctx.res || ctx.ctx && ctx.ctx.res;
	  if (!App.getInitialProps) {
	    if (ctx.ctx && ctx.Component) {
	      return {
	        pageProps: await loadGetInitialProps(ctx.Component, ctx.ctx)
	      };
	    }
	    return {};
	  }
	  const props = await App.getInitialProps(ctx);
	  if (res && isResSent(res)) {
	    return props;
	  }
	  if (!props) {
	    const message = `"${getDisplayName(App)}.getInitialProps()" should resolve to an object. But found "${props}" instead.`;
	    throw new Error(message);
	  }
	  if (false) {
	    if (Object.keys(props).length === 0 && !ctx.ctx) {
	      console.warn(`${getDisplayName(App)} returned an empty object from \`getInitialProps\`. This de-optimizes and prevents automatic static optimization. https://nextjs.org/docs/messages/empty-object-getInitialProps`);
	    }
	  }
	  return props;
	}
	const urlObjectKeys = [
	  "auth",
	  "hash",
	  "host",
	  "hostname",
	  "href",
	  "path",
	  "pathname",
	  "port",
	  "protocol",
	  "query",
	  "search",
	  "slashes"
	];
	utils.urlObjectKeys = urlObjectKeys;
	function formatWithValidation(url) {
	  if (false) {
	    if (url !== null && typeof url === "object") {
	      Object.keys(url).forEach((key) => {
	        if (urlObjectKeys.indexOf(key) === -1) {
	          console.warn(`Unknown key passed via urlObject into url.format: ${key}`);
	        }
	      });
	    }
	  }
	  return (0, _formatUrl).formatUrl(url);
	}
	const SP = typeof performance !== "undefined";
	utils.SP = SP;
	const ST = SP && typeof performance.mark === "function" && typeof performance.measure === "function";
	utils.ST = ST;
	class DecodeError extends Error {
	}
	utils.DecodeError = DecodeError;
	const HtmlContext = (0, _react).createContext(null);
	utils.HtmlContext = HtmlContext;
	if (false) {
	  HtmlContext.displayName = "HtmlContext";
	}
	return utils;
}

var isDynamic = {};

var hasRequiredIsDynamic;

function requireIsDynamic () {
	if (hasRequiredIsDynamic) return isDynamic;
	hasRequiredIsDynamic = 1;
	"use strict";
	Object.defineProperty(isDynamic, "__esModule", {
	    value: true
	});
	isDynamic.isDynamicRoute = isDynamicRoute;
	// Identify /[param]/ in route string
	const TEST_ROUTE = /\/\[[^/]+?\](?=\/|$)/;
	function isDynamicRoute(route) {
	    return TEST_ROUTE.test(route);
	}

	
	return isDynamic;
}

var parseRelativeUrl = {};

var hasRequiredParseRelativeUrl;

function requireParseRelativeUrl () {
	if (hasRequiredParseRelativeUrl) return parseRelativeUrl;
	hasRequiredParseRelativeUrl = 1;
	"use strict";
	Object.defineProperty(parseRelativeUrl, "__esModule", {
	    value: true
	});
	parseRelativeUrl.parseRelativeUrl = parseRelativeUrl$1;
	var _utils = requireUtils();
	var _querystring = requireQuerystring();
	function parseRelativeUrl$1(url, base) {
	    const globalBase = new URL(typeof window === 'undefined' ? 'http://n' : (0, _utils).getLocationOrigin());
	    const resolvedBase = base ? new URL(base, globalBase) : globalBase;
	    const { pathname , searchParams , search , hash , href , origin  } = new URL(url, resolvedBase);
	    if (origin !== globalBase.origin) {
	        throw new Error(`invariant: invalid relative URL, router received ${url}`);
	    }
	    return {
	        pathname,
	        query: (0, _querystring).searchParamsToUrlQuery(searchParams),
	        search,
	        hash,
	        href: href.slice(globalBase.origin.length)
	    };
	}

	
	return parseRelativeUrl;
}

var resolveRewrites = {};

var pathMatch = {};

var pathToRegexp = {};

var hasRequiredPathToRegexp;

function requirePathToRegexp () {
	if (hasRequiredPathToRegexp) return pathToRegexp;
	hasRequiredPathToRegexp = 1;
	"use strict";
	Object.defineProperty(pathToRegexp, "__esModule", { value: true });
	/**
	 * Tokenize input string.
	 */
	function lexer(str) {
	    var tokens = [];
	    var i = 0;
	    while (i < str.length) {
	        var char = str[i];
	        if (char === "*" || char === "+" || char === "?") {
	            tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
	            continue;
	        }
	        if (char === "\\") {
	            tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
	            continue;
	        }
	        if (char === "{") {
	            tokens.push({ type: "OPEN", index: i, value: str[i++] });
	            continue;
	        }
	        if (char === "}") {
	            tokens.push({ type: "CLOSE", index: i, value: str[i++] });
	            continue;
	        }
	        if (char === ":") {
	            var name = "";
	            var j = i + 1;
	            while (j < str.length) {
	                var code = str.charCodeAt(j);
	                if (
	                // `0-9`
	                (code >= 48 && code <= 57) ||
	                    // `A-Z`
	                    (code >= 65 && code <= 90) ||
	                    // `a-z`
	                    (code >= 97 && code <= 122) ||
	                    // `_`
	                    code === 95) {
	                    name += str[j++];
	                    continue;
	                }
	                break;
	            }
	            if (!name)
	                throw new TypeError("Missing parameter name at " + i);
	            tokens.push({ type: "NAME", index: i, value: name });
	            i = j;
	            continue;
	        }
	        if (char === "(") {
	            var count = 1;
	            var pattern = "";
	            var j = i + 1;
	            if (str[j] === "?") {
	                throw new TypeError("Pattern cannot start with \"?\" at " + j);
	            }
	            while (j < str.length) {
	                if (str[j] === "\\") {
	                    pattern += str[j++] + str[j++];
	                    continue;
	                }
	                if (str[j] === ")") {
	                    count--;
	                    if (count === 0) {
	                        j++;
	                        break;
	                    }
	                }
	                else if (str[j] === "(") {
	                    count++;
	                    if (str[j + 1] !== "?") {
	                        throw new TypeError("Capturing groups are not allowed at " + j);
	                    }
	                }
	                pattern += str[j++];
	            }
	            if (count)
	                throw new TypeError("Unbalanced pattern at " + i);
	            if (!pattern)
	                throw new TypeError("Missing pattern at " + i);
	            tokens.push({ type: "PATTERN", index: i, value: pattern });
	            i = j;
	            continue;
	        }
	        tokens.push({ type: "CHAR", index: i, value: str[i++] });
	    }
	    tokens.push({ type: "END", index: i, value: "" });
	    return tokens;
	}
	/**
	 * Parse a string for the raw tokens.
	 */
	function parse(str, options) {
	    if (options === void 0) { options = {}; }
	    var tokens = lexer(str);
	    var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
	    var defaultPattern = "[^" + escapeString(options.delimiter || "/#?") + "]+?";
	    var result = [];
	    var key = 0;
	    var i = 0;
	    var path = "";
	    var tryConsume = function (type) {
	        if (i < tokens.length && tokens[i].type === type)
	            return tokens[i++].value;
	    };
	    var mustConsume = function (type) {
	        var value = tryConsume(type);
	        if (value !== undefined)
	            return value;
	        var _a = tokens[i], nextType = _a.type, index = _a.index;
	        throw new TypeError("Unexpected " + nextType + " at " + index + ", expected " + type);
	    };
	    var consumeText = function () {
	        var result = "";
	        var value;
	        // tslint:disable-next-line
	        while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
	            result += value;
	        }
	        return result;
	    };
	    while (i < tokens.length) {
	        var char = tryConsume("CHAR");
	        var name = tryConsume("NAME");
	        var pattern = tryConsume("PATTERN");
	        if (name || pattern) {
	            var prefix = char || "";
	            if (prefixes.indexOf(prefix) === -1) {
	                path += prefix;
	                prefix = "";
	            }
	            if (path) {
	                result.push(path);
	                path = "";
	            }
	            result.push({
	                name: name || key++,
	                prefix: prefix,
	                suffix: "",
	                pattern: pattern || defaultPattern,
	                modifier: tryConsume("MODIFIER") || ""
	            });
	            continue;
	        }
	        var value = char || tryConsume("ESCAPED_CHAR");
	        if (value) {
	            path += value;
	            continue;
	        }
	        if (path) {
	            result.push(path);
	            path = "";
	        }
	        var open = tryConsume("OPEN");
	        if (open) {
	            var prefix = consumeText();
	            var name_1 = tryConsume("NAME") || "";
	            var pattern_1 = tryConsume("PATTERN") || "";
	            var suffix = consumeText();
	            mustConsume("CLOSE");
	            result.push({
	                name: name_1 || (pattern_1 ? key++ : ""),
	                pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
	                prefix: prefix,
	                suffix: suffix,
	                modifier: tryConsume("MODIFIER") || ""
	            });
	            continue;
	        }
	        mustConsume("END");
	    }
	    return result;
	}
	pathToRegexp.parse = parse;
	/**
	 * Compile a string to a template function for the path.
	 */
	function compile(str, options) {
	    return tokensToFunction(parse(str, options), options);
	}
	pathToRegexp.compile = compile;
	/**
	 * Expose a method for transforming tokens into the path function.
	 */
	function tokensToFunction(tokens, options) {
	    if (options === void 0) { options = {}; }
	    var reFlags = flags(options);
	    var _a = options.encode, encode = _a === void 0 ? function (x) { return x; } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
	    // Compile all the tokens into regexps.
	    var matches = tokens.map(function (token) {
	        if (typeof token === "object") {
	            return new RegExp("^(?:" + token.pattern + ")$", reFlags);
	        }
	    });
	    return function (data) {
	        var path = "";
	        for (var i = 0; i < tokens.length; i++) {
	            var token = tokens[i];
	            if (typeof token === "string") {
	                path += token;
	                continue;
	            }
	            var value = data ? data[token.name] : undefined;
	            var optional = token.modifier === "?" || token.modifier === "*";
	            var repeat = token.modifier === "*" || token.modifier === "+";
	            if (Array.isArray(value)) {
	                if (!repeat) {
	                    throw new TypeError("Expected \"" + token.name + "\" to not repeat, but got an array");
	                }
	                if (value.length === 0) {
	                    if (optional)
	                        continue;
	                    throw new TypeError("Expected \"" + token.name + "\" to not be empty");
	                }
	                for (var j = 0; j < value.length; j++) {
	                    var segment = encode(value[j], token);
	                    if (validate && !matches[i].test(segment)) {
	                        throw new TypeError("Expected all \"" + token.name + "\" to match \"" + token.pattern + "\", but got \"" + segment + "\"");
	                    }
	                    path += token.prefix + segment + token.suffix;
	                }
	                continue;
	            }
	            if (typeof value === "string" || typeof value === "number") {
	                var segment = encode(String(value), token);
	                if (validate && !matches[i].test(segment)) {
	                    throw new TypeError("Expected \"" + token.name + "\" to match \"" + token.pattern + "\", but got \"" + segment + "\"");
	                }
	                path += token.prefix + segment + token.suffix;
	                continue;
	            }
	            if (optional)
	                continue;
	            var typeOfMessage = repeat ? "an array" : "a string";
	            throw new TypeError("Expected \"" + token.name + "\" to be " + typeOfMessage);
	        }
	        return path;
	    };
	}
	pathToRegexp.tokensToFunction = tokensToFunction;
	/**
	 * Create path match function from `path-to-regexp` spec.
	 */
	function match(str, options) {
	    var keys = [];
	    var re = pathToRegexp$1(str, keys, options);
	    return regexpToFunction(re, keys, options);
	}
	pathToRegexp.match = match;
	/**
	 * Create a path match function from `path-to-regexp` output.
	 */
	function regexpToFunction(re, keys, options) {
	    if (options === void 0) { options = {}; }
	    var _a = options.decode, decode = _a === void 0 ? function (x) { return x; } : _a;
	    return function (pathname) {
	        var m = re.exec(pathname);
	        if (!m)
	            return false;
	        var path = m[0], index = m.index;
	        var params = Object.create(null);
	        var _loop_1 = function (i) {
	            // tslint:disable-next-line
	            if (m[i] === undefined)
	                return "continue";
	            var key = keys[i - 1];
	            if (key.modifier === "*" || key.modifier === "+") {
	                params[key.name] = m[i].split(key.prefix + key.suffix).map(function (value) {
	                    return decode(value, key);
	                });
	            }
	            else {
	                params[key.name] = decode(m[i], key);
	            }
	        };
	        for (var i = 1; i < m.length; i++) {
	            _loop_1(i);
	        }
	        return { path: path, index: index, params: params };
	    };
	}
	pathToRegexp.regexpToFunction = regexpToFunction;
	/**
	 * Escape a regular expression string.
	 */
	function escapeString(str) {
	    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
	}
	/**
	 * Get the flags for a regexp from the options.
	 */
	function flags(options) {
	    return options && options.sensitive ? "" : "i";
	}
	/**
	 * Pull out keys from a regexp.
	 */
	function regexpToRegexp(path, keys) {
	    if (!keys)
	        return path;
	    // Use a negative lookahead to match only capturing groups.
	    var groups = path.source.match(/\((?!\?)/g);
	    if (groups) {
	        for (var i = 0; i < groups.length; i++) {
	            keys.push({
	                name: i,
	                prefix: "",
	                suffix: "",
	                modifier: "",
	                pattern: ""
	            });
	        }
	    }
	    return path;
	}
	/**
	 * Transform an array into a regexp.
	 */
	function arrayToRegexp(paths, keys, options) {
	    var parts = paths.map(function (path) { return pathToRegexp$1(path, keys, options).source; });
	    return new RegExp("(?:" + parts.join("|") + ")", flags(options));
	}
	/**
	 * Create a path regexp from string input.
	 */
	function stringToRegexp(path, keys, options) {
	    return tokensToRegexp(parse(path, options), keys, options);
	}
	/**
	 * Expose a function for taking tokens and returning a RegExp.
	 */
	function tokensToRegexp(tokens, keys, options) {
	    if (options === void 0) { options = {}; }
	    var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function (x) { return x; } : _d;
	    var endsWith = "[" + escapeString(options.endsWith || "") + "]|$";
	    var delimiter = "[" + escapeString(options.delimiter || "/#?") + "]";
	    var route = start ? "^" : "";
	    // Iterate over the tokens and create our regexp string.
	    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
	        var token = tokens_1[_i];
	        if (typeof token === "string") {
	            route += escapeString(encode(token));
	        }
	        else {
	            var prefix = escapeString(encode(token.prefix));
	            var suffix = escapeString(encode(token.suffix));
	            if (token.pattern) {
	                if (keys)
	                    keys.push(token);
	                if (prefix || suffix) {
	                    if (token.modifier === "+" || token.modifier === "*") {
	                        var mod = token.modifier === "*" ? "?" : "";
	                        route += "(?:" + prefix + "((?:" + token.pattern + ")(?:" + suffix + prefix + "(?:" + token.pattern + "))*)" + suffix + ")" + mod;
	                    }
	                    else {
	                        route += "(?:" + prefix + "(" + token.pattern + ")" + suffix + ")" + token.modifier;
	                    }
	                }
	                else {
	                    route += "(" + token.pattern + ")" + token.modifier;
	                }
	            }
	            else {
	                route += "(?:" + prefix + suffix + ")" + token.modifier;
	            }
	        }
	    }
	    if (end) {
	        if (!strict)
	            route += delimiter + "?";
	        route += !options.endsWith ? "$" : "(?=" + endsWith + ")";
	    }
	    else {
	        var endToken = tokens[tokens.length - 1];
	        var isEndDelimited = typeof endToken === "string"
	            ? delimiter.indexOf(endToken[endToken.length - 1]) > -1
	            : // tslint:disable-next-line
	                endToken === undefined;
	        if (!strict) {
	            route += "(?:" + delimiter + "(?=" + endsWith + "))?";
	        }
	        if (!isEndDelimited) {
	            route += "(?=" + delimiter + "|" + endsWith + ")";
	        }
	    }
	    return new RegExp(route, flags(options));
	}
	pathToRegexp.tokensToRegexp = tokensToRegexp;
	/**
	 * Normalize the given path string, returning a regular expression.
	 *
	 * An empty array can be passed in for the keys, which will hold the
	 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
	 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
	 */
	function pathToRegexp$1(path, keys, options) {
	    if (path instanceof RegExp)
	        return regexpToRegexp(path, keys);
	    if (Array.isArray(path))
	        return arrayToRegexp(path, keys, options);
	    return stringToRegexp(path, keys, options);
	}
	pathToRegexp.pathToRegexp = pathToRegexp$1;
	
	return pathToRegexp;
}

var hasRequiredPathMatch;

function requirePathMatch () {
	if (hasRequiredPathMatch) return pathMatch;
	hasRequiredPathMatch = 1;
	"use strict";
	Object.defineProperty(pathMatch, "__esModule", {
	    value: true
	});
	pathMatch.default = pathMatch.customRouteMatcherOptions = pathMatch.matcherOptions = pathMatch.pathToRegexp = void 0;
	var pathToRegexp = _interopRequireWildcard(requirePathToRegexp());
	function _interopRequireWildcard(obj) {
	    if (obj && obj.__esModule) {
	        return obj;
	    } else {
	        var newObj = {
	        };
	        if (obj != null) {
	            for(var key in obj){
	                if (Object.prototype.hasOwnProperty.call(obj, key)) {
	                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {
	                    };
	                    if (desc.get || desc.set) {
	                        Object.defineProperty(newObj, key, desc);
	                    } else {
	                        newObj[key] = obj[key];
	                    }
	                }
	            }
	        }
	        newObj.default = obj;
	        return newObj;
	    }
	}
	pathMatch.pathToRegexp = pathToRegexp;
	const matcherOptions = {
	    sensitive: false,
	    delimiter: '/'
	};
	pathMatch.matcherOptions = matcherOptions;
	const customRouteMatcherOptions = {
	    ...matcherOptions,
	    strict: true
	};
	pathMatch.customRouteMatcherOptions = customRouteMatcherOptions;
	var _default = (customRoute = false)=>{
	    return (path, regexModifier)=>{
	        const keys = [];
	        let matcherRegex = pathToRegexp.pathToRegexp(path, keys, customRoute ? customRouteMatcherOptions : matcherOptions);
	        if (regexModifier) {
	            const regexSource = regexModifier(matcherRegex.source);
	            matcherRegex = new RegExp(regexSource, matcherRegex.flags);
	        }
	        const matcher = pathToRegexp.regexpToFunction(matcherRegex, keys);
	        return (pathname, params)=>{
	            const res = pathname == null ? false : matcher(pathname);
	            if (!res) {
	                return false;
	            }
	            if (customRoute) {
	                for (const key of keys){
	                    // unnamed params should be removed as they
	                    // are not allowed to be used in the destination
	                    if (typeof key.name === 'number') {
	                        delete res.params[key.name];
	                    }
	                }
	            }
	            return {
	                ...params,
	                ...res.params
	            };
	        };
	    };
	};
	pathMatch.default = _default;

	
	return pathMatch;
}

var prepareDestination = {};

var parseUrl = {};

var hasRequiredParseUrl;

function requireParseUrl () {
	if (hasRequiredParseUrl) return parseUrl;
	hasRequiredParseUrl = 1;
	"use strict";
	Object.defineProperty(parseUrl, "__esModule", {
	    value: true
	});
	parseUrl.parseUrl = parseUrl$1;
	var _querystring = requireQuerystring();
	var _parseRelativeUrl = requireParseRelativeUrl();
	function parseUrl$1(url) {
	    if (url.startsWith('/')) {
	        return (0, _parseRelativeUrl).parseRelativeUrl(url);
	    }
	    const parsedURL = new URL(url);
	    return {
	        hash: parsedURL.hash,
	        hostname: parsedURL.hostname,
	        href: parsedURL.href,
	        pathname: parsedURL.pathname,
	        port: parsedURL.port,
	        protocol: parsedURL.protocol,
	        query: (0, _querystring).searchParamsToUrlQuery(parsedURL.searchParams),
	        search: parsedURL.search
	    };
	}

	
	return parseUrl;
}

var hasRequiredPrepareDestination;

function requirePrepareDestination () {
	if (hasRequiredPrepareDestination) return prepareDestination;
	hasRequiredPrepareDestination = 1;
	"use strict";
	Object.defineProperty(prepareDestination, "__esModule", {
	    value: true
	});
	prepareDestination.matchHas = matchHas;
	prepareDestination.compileNonPath = compileNonPath;
	prepareDestination.default = prepareDestination$1;
	prepareDestination.getSafeParamName = void 0;
	var _parseUrl = requireParseUrl();
	var pathToRegexp = _interopRequireWildcard(requirePathToRegexp());
	function _interopRequireWildcard(obj) {
	    if (obj && obj.__esModule) {
	        return obj;
	    } else {
	        var newObj = {
	        };
	        if (obj != null) {
	            for(var key in obj){
	                if (Object.prototype.hasOwnProperty.call(obj, key)) {
	                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {
	                    };
	                    if (desc.get || desc.set) {
	                        Object.defineProperty(newObj, key, desc);
	                    } else {
	                        newObj[key] = obj[key];
	                    }
	                }
	            }
	        }
	        newObj.default = obj;
	        return newObj;
	    }
	}
	const getSafeParamName = (paramName)=>{
	    let newParamName = '';
	    for(let i = 0; i < paramName.length; i++){
	        const charCode = paramName.charCodeAt(i);
	        if (charCode > 64 && charCode < 91 || charCode > 96 && charCode < 123 // a-z
	        ) {
	            newParamName += paramName[i];
	        }
	    }
	    return newParamName;
	};
	prepareDestination.getSafeParamName = getSafeParamName;
	function matchHas(req, has, query) {
	    const params = {
	    };
	    const allMatch = has.every((hasItem)=>{
	        let value;
	        let key = hasItem.key;
	        switch(hasItem.type){
	            case 'header':
	                {
	                    key = key.toLowerCase();
	                    value = req.headers[key];
	                    break;
	                }
	            case 'cookie':
	                {
	                    value = req.cookies[hasItem.key];
	                    break;
	                }
	            case 'query':
	                {
	                    value = query[key];
	                    break;
	                }
	            case 'host':
	                {
	                    const { host  } = (req === null || req === void 0 ? void 0 : req.headers) || {
	                    };
	                    // remove port from host if present
	                    const hostname = host === null || host === void 0 ? void 0 : host.split(':')[0].toLowerCase();
	                    value = hostname;
	                    break;
	                }
	            default:
	                {
	                    break;
	                }
	        }
	        if (!hasItem.value && value) {
	            params[getSafeParamName(key)] = value;
	            return true;
	        } else if (value) {
	            const matcher = new RegExp(`^${hasItem.value}$`);
	            const matches = Array.isArray(value) ? value.slice(-1)[0].match(matcher) : value.match(matcher);
	            if (matches) {
	                if (Array.isArray(matches)) {
	                    if (matches.groups) {
	                        Object.keys(matches.groups).forEach((groupKey)=>{
	                            params[groupKey] = matches.groups[groupKey];
	                        });
	                    } else if (hasItem.type === 'host' && matches[0]) {
	                        params.host = matches[0];
	                    }
	                }
	                return true;
	            }
	        }
	        return false;
	    });
	    if (allMatch) {
	        return params;
	    }
	    return false;
	}
	function compileNonPath(value, params) {
	    if (!value.includes(':')) {
	        return value;
	    }
	    for (const key of Object.keys(params)){
	        if (value.includes(`:${key}`)) {
	            value = value.replace(new RegExp(`:${key}\\*`, 'g'), `:${key}--ESCAPED_PARAM_ASTERISKS`).replace(new RegExp(`:${key}\\?`, 'g'), `:${key}--ESCAPED_PARAM_QUESTION`).replace(new RegExp(`:${key}\\+`, 'g'), `:${key}--ESCAPED_PARAM_PLUS`).replace(new RegExp(`:${key}(?!\\w)`, 'g'), `--ESCAPED_PARAM_COLON${key}`);
	        }
	    }
	    value = value.replace(/(:|\*|\?|\+|\(|\)|\{|\})/g, '\\$1').replace(/--ESCAPED_PARAM_PLUS/g, '+').replace(/--ESCAPED_PARAM_COLON/g, ':').replace(/--ESCAPED_PARAM_QUESTION/g, '?').replace(/--ESCAPED_PARAM_ASTERISKS/g, '*');
	    // the value needs to start with a forward-slash to be compiled
	    // correctly
	    return pathToRegexp.compile(`/${value}`, {
	        validate: false
	    })(params).substr(1);
	}
	const escapeSegment = (str, segmentName)=>str.replace(new RegExp(`:${segmentName}`, 'g'), `__ESC_COLON_${segmentName}`)
	;
	const unescapeSegments = (str)=>str.replace(/__ESC_COLON_/gi, ':')
	;
	function prepareDestination$1(destination, params, query, appendParamsToQuery) {
	    // clone query so we don't modify the original
	    query = Object.assign({
	    }, query);
	    const hadLocale = query.__nextLocale;
	    delete query.__nextLocale;
	    delete query.__nextDefaultLocale;
	    let escapedDestination = destination;
	    for (const param of Object.keys({
	        ...params,
	        ...query
	    })){
	        escapedDestination = escapeSegment(escapedDestination, param);
	    }
	    const parsedDestination = (0, _parseUrl).parseUrl(escapedDestination);
	    const destQuery = parsedDestination.query;
	    const destPath = unescapeSegments(`${parsedDestination.pathname}${parsedDestination.hash || ''}`);
	    const destHostname = unescapeSegments(parsedDestination.hostname || '');
	    const destPathParamKeys = [];
	    const destHostnameParamKeys = [];
	    pathToRegexp.pathToRegexp(destPath, destPathParamKeys);
	    pathToRegexp.pathToRegexp(destHostname, destHostnameParamKeys);
	    const destParams = [];
	    destPathParamKeys.forEach((key)=>destParams.push(key.name)
	    );
	    destHostnameParamKeys.forEach((key)=>destParams.push(key.name)
	    );
	    const destPathCompiler = pathToRegexp.compile(destPath, // we don't validate while compiling the destination since we should
	    // have already validated before we got to this point and validating
	    // breaks compiling destinations with named pattern params from the source
	    // e.g. /something:hello(.*) -> /another/:hello is broken with validation
	    // since compile validation is meant for reversing and not for inserting
	    // params from a separate path-regex into another
	    {
	        validate: false
	    });
	    const destHostnameCompiler = pathToRegexp.compile(destHostname, {
	        validate: false
	    });
	    let newUrl;
	    // update any params in query values
	    for (const [key, strOrArray] of Object.entries(destQuery)){
	        // the value needs to start with a forward-slash to be compiled
	        // correctly
	        if (Array.isArray(strOrArray)) {
	            destQuery[key] = strOrArray.map((value)=>compileNonPath(unescapeSegments(value), params)
	            );
	        } else {
	            destQuery[key] = compileNonPath(unescapeSegments(strOrArray), params);
	        }
	    }
	    // add path params to query if it's not a redirect and not
	    // already defined in destination query or path
	    let paramKeys = Object.keys(params);
	    // remove internal param for i18n
	    if (hadLocale) {
	        paramKeys = paramKeys.filter((name)=>name !== 'nextInternalLocale'
	        );
	    }
	    if (appendParamsToQuery && !paramKeys.some((key)=>destParams.includes(key)
	    )) {
	        for (const key of paramKeys){
	            if (!(key in destQuery)) {
	                destQuery[key] = params[key];
	            }
	        }
	    }
	    try {
	        newUrl = destPathCompiler(params);
	        const [pathname, hash] = newUrl.split('#');
	        parsedDestination.hostname = destHostnameCompiler(params);
	        parsedDestination.pathname = pathname;
	        parsedDestination.hash = `${hash ? '#' : ''}${hash || ''}`;
	        delete parsedDestination.search;
	    } catch (err) {
	        if (err.message.match(/Expected .*? to not repeat, but got an array/)) {
	            throw new Error(`To use a multi-match in the destination you must add \`*\` at the end of the param name to signify it should repeat. https://nextjs.org/docs/messages/invalid-multi-match`);
	        }
	        throw err;
	    }
	    // Query merge order lowest priority to highest
	    // 1. initial URL query values
	    // 2. path segment values
	    // 3. destination specified query values
	    parsedDestination.query = {
	        ...query,
	        ...parsedDestination.query
	    };
	    return {
	        newUrl,
	        parsedDestination
	    };
	}

	
	return prepareDestination;
}

var hasRequiredResolveRewrites;

function requireResolveRewrites () {
	if (hasRequiredResolveRewrites) return resolveRewrites;
	hasRequiredResolveRewrites = 1;
	"use strict";
	Object.defineProperty(resolveRewrites, "__esModule", {
	    value: true
	});
	resolveRewrites.default = resolveRewrites$1;
	var _pathMatch = _interopRequireDefault(requirePathMatch());
	var _prepareDestination = _interopRequireWildcard(requirePrepareDestination());
	var _normalizeTrailingSlash = requireNormalizeTrailingSlash();
	var _normalizeLocalePath = requireNormalizeLocalePath();
	var _parseRelativeUrl = requireParseRelativeUrl();
	var _router = requireRouter$1();
	function _interopRequireDefault(obj) {
	    return obj && obj.__esModule ? obj : {
	        default: obj
	    };
	}
	function _interopRequireWildcard(obj) {
	    if (obj && obj.__esModule) {
	        return obj;
	    } else {
	        var newObj = {
	        };
	        if (obj != null) {
	            for(var key in obj){
	                if (Object.prototype.hasOwnProperty.call(obj, key)) {
	                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {
	                    };
	                    if (desc.get || desc.set) {
	                        Object.defineProperty(newObj, key, desc);
	                    } else {
	                        newObj[key] = obj[key];
	                    }
	                }
	            }
	        }
	        newObj.default = obj;
	        return newObj;
	    }
	}
	const customRouteMatcher = (0, _pathMatch).default(true);
	function resolveRewrites$1(asPath, pages, rewrites, query, resolveHref, locales) {
	    let matchedPage = false;
	    let parsedAs = (0, _parseRelativeUrl).parseRelativeUrl(asPath);
	    let fsPathname = (0, _normalizeTrailingSlash).removePathTrailingSlash((0, _normalizeLocalePath).normalizeLocalePath((0, _router).delBasePath(parsedAs.pathname), locales).pathname);
	    let resolvedHref;
	    const handleRewrite = (rewrite)=>{
	        const matcher = customRouteMatcher(rewrite.source);
	        let params = matcher(parsedAs.pathname);
	        if (rewrite.has && params) {
	            const hasParams = (0, _prepareDestination).matchHas({
	                headers: {
	                    host: document.location.hostname
	                },
	                cookies: document.cookie.split('; ').reduce((acc, item)=>{
	                    const [key, ...value] = item.split('=');
	                    acc[key] = value.join('=');
	                    return acc;
	                }, {
	                })
	            }, rewrite.has, parsedAs.query);
	            if (hasParams) {
	                Object.assign(params, hasParams);
	            } else {
	                params = false;
	            }
	        }
	        if (params) {
	            if (!rewrite.destination) {
	                // this is a proxied rewrite which isn't handled on the client
	                return true;
	            }
	            const destRes = (0, _prepareDestination).default(rewrite.destination, params, query, true);
	            parsedAs = destRes.parsedDestination;
	            asPath = destRes.newUrl;
	            Object.assign(query, destRes.parsedDestination.query);
	            fsPathname = (0, _normalizeTrailingSlash).removePathTrailingSlash((0, _normalizeLocalePath).normalizeLocalePath((0, _router).delBasePath(asPath), locales).pathname);
	            if (pages.includes(fsPathname)) {
	                // check if we now match a page as this means we are done
	                // resolving the rewrites
	                matchedPage = true;
	                resolvedHref = fsPathname;
	                return true;
	            }
	            // check if we match a dynamic-route, if so we break the rewrites chain
	            resolvedHref = resolveHref(fsPathname);
	            if (resolvedHref !== asPath && pages.includes(resolvedHref)) {
	                matchedPage = true;
	                return true;
	            }
	        }
	    };
	    let finished = false;
	    for(let i = 0; i < rewrites.beforeFiles.length; i++){
	        // we don't end after match in beforeFiles to allow
	        // continuing through all beforeFiles rewrites
	        handleRewrite(rewrites.beforeFiles[i]);
	    }
	    matchedPage = pages.includes(fsPathname);
	    if (!matchedPage) {
	        if (!finished) {
	            for(let i = 0; i < rewrites.afterFiles.length; i++){
	                if (handleRewrite(rewrites.afterFiles[i])) {
	                    finished = true;
	                    break;
	                }
	            }
	        }
	        // check dynamic route before processing fallback rewrites
	        if (!finished) {
	            resolvedHref = resolveHref(fsPathname);
	            matchedPage = pages.includes(resolvedHref);
	            finished = matchedPage;
	        }
	        if (!finished) {
	            for(let i = 0; i < rewrites.fallback.length; i++){
	                if (handleRewrite(rewrites.fallback[i])) {
	                    finished = true;
	                    break;
	                }
	            }
	        }
	    }
	    return {
	        asPath,
	        parsedAs,
	        matchedPage,
	        resolvedHref
	    };
	}

	
	return resolveRewrites;
}

var routeMatcher = {};

var hasRequiredRouteMatcher;

function requireRouteMatcher () {
	if (hasRequiredRouteMatcher) return routeMatcher;
	hasRequiredRouteMatcher = 1;
	"use strict";
	Object.defineProperty(routeMatcher, "__esModule", {
	    value: true
	});
	routeMatcher.getRouteMatcher = getRouteMatcher;
	var _utils = requireUtils();
	function getRouteMatcher(routeRegex) {
	    const { re , groups  } = routeRegex;
	    return (pathname)=>{
	        const routeMatch = re.exec(pathname);
	        if (!routeMatch) {
	            return false;
	        }
	        const decode = (param)=>{
	            try {
	                return decodeURIComponent(param);
	            } catch (_) {
	                throw new _utils.DecodeError('failed to decode param');
	            }
	        };
	        const params = {
	        };
	        Object.keys(groups).forEach((slugName)=>{
	            const g = groups[slugName];
	            const m = routeMatch[g.pos];
	            if (m !== undefined) {
	                params[slugName] = ~m.indexOf('/') ? m.split('/').map((entry)=>decode(entry)
	                ) : g.repeat ? [
	                    decode(m)
	                ] : decode(m);
	            }
	        });
	        return params;
	    };
	}

	
	return routeMatcher;
}

var routeRegex = {};

var hasRequiredRouteRegex;

function requireRouteRegex () {
	if (hasRequiredRouteRegex) return routeRegex;
	hasRequiredRouteRegex = 1;
	"use strict";
	Object.defineProperty(routeRegex, "__esModule", {
	    value: true
	});
	routeRegex.getParametrizedRoute = getParametrizedRoute;
	routeRegex.getRouteRegex = getRouteRegex;
	// this isn't importing the escape-string-regex module
	// to reduce bytes
	function escapeRegex(str) {
	    return str.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
	}
	function parseParameter(param) {
	    const optional = param.startsWith('[') && param.endsWith(']');
	    if (optional) {
	        param = param.slice(1, -1);
	    }
	    const repeat = param.startsWith('...');
	    if (repeat) {
	        param = param.slice(3);
	    }
	    return {
	        key: param,
	        repeat,
	        optional
	    };
	}
	function getParametrizedRoute(route) {
	    const segments = (route.replace(/\/$/, '') || '/').slice(1).split('/');
	    const groups = {
	    };
	    let groupIndex = 1;
	    const parameterizedRoute = segments.map((segment)=>{
	        if (segment.startsWith('[') && segment.endsWith(']')) {
	            const { key , optional , repeat  } = parseParameter(segment.slice(1, -1));
	            groups[key] = {
	                pos: groupIndex++,
	                repeat,
	                optional
	            };
	            return repeat ? optional ? '(?:/(.+?))?' : '/(.+?)' : '/([^/]+?)';
	        } else {
	            return `/${escapeRegex(segment)}`;
	        }
	    }).join('');
	    // dead code eliminate for browser since it's only needed
	    // while generating routes-manifest
	    if (typeof window === 'undefined') {
	        let routeKeyCharCode = 97;
	        let routeKeyCharLength = 1;
	        // builds a minimal routeKey using only a-z and minimal number of characters
	        const getSafeRouteKey = ()=>{
	            let routeKey = '';
	            for(let i = 0; i < routeKeyCharLength; i++){
	                routeKey += String.fromCharCode(routeKeyCharCode);
	                routeKeyCharCode++;
	                if (routeKeyCharCode > 122) {
	                    routeKeyCharLength++;
	                    routeKeyCharCode = 97;
	                }
	            }
	            return routeKey;
	        };
	        const routeKeys = {
	        };
	        let namedParameterizedRoute = segments.map((segment)=>{
	            if (segment.startsWith('[') && segment.endsWith(']')) {
	                const { key , optional , repeat  } = parseParameter(segment.slice(1, -1));
	                // replace any non-word characters since they can break
	                // the named regex
	                let cleanedKey = key.replace(/\W/g, '');
	                let invalidKey = false;
	                // check if the key is still invalid and fallback to using a known
	                // safe key
	                if (cleanedKey.length === 0 || cleanedKey.length > 30) {
	                    invalidKey = true;
	                }
	                if (!isNaN(parseInt(cleanedKey.substr(0, 1)))) {
	                    invalidKey = true;
	                }
	                if (invalidKey) {
	                    cleanedKey = getSafeRouteKey();
	                }
	                routeKeys[cleanedKey] = key;
	                return repeat ? optional ? `(?:/(?<${cleanedKey}>.+?))?` : `/(?<${cleanedKey}>.+?)` : `/(?<${cleanedKey}>[^/]+?)`;
	            } else {
	                return `/${escapeRegex(segment)}`;
	            }
	        }).join('');
	        return {
	            parameterizedRoute,
	            namedParameterizedRoute,
	            groups,
	            routeKeys
	        };
	    }
	    return {
	        parameterizedRoute,
	        groups
	    };
	}
	function getRouteRegex(normalizedRoute) {
	    const result = getParametrizedRoute(normalizedRoute);
	    if ('routeKeys' in result) {
	        return {
	            re: new RegExp(`^${result.parameterizedRoute}(?:/)?$`),
	            groups: result.groups,
	            routeKeys: result.routeKeys,
	            namedRegex: `^${result.namedParameterizedRoute}(?:/)?$`
	        };
	    }
	    return {
	        re: new RegExp(`^${result.parameterizedRoute}(?:/)?$`),
	        groups: result.groups
	    };
	}

	
	return routeRegex;
}

var getMiddlewareRegex = {};

var hasRequiredGetMiddlewareRegex;

function requireGetMiddlewareRegex () {
	if (hasRequiredGetMiddlewareRegex) return getMiddlewareRegex;
	hasRequiredGetMiddlewareRegex = 1;
	"use strict";
	Object.defineProperty(getMiddlewareRegex, "__esModule", {
	    value: true
	});
	getMiddlewareRegex.getMiddlewareRegex = getMiddlewareRegex$1;
	var _routeRegex = requireRouteRegex();
	function getMiddlewareRegex$1(normalizedRoute, catchAll = true) {
	    const result = (0, _routeRegex).getParametrizedRoute(normalizedRoute);
	    let catchAllRegex = catchAll ? '(?!_next).*' : '';
	    let catchAllGroupedRegex = catchAll ? '(?:(/.*)?)' : '';
	    if ('routeKeys' in result) {
	        if (result.parameterizedRoute === '/') {
	            return {
	                groups: {
	                },
	                namedRegex: `^/${catchAllRegex}$`,
	                re: new RegExp(`^/${catchAllRegex}$`),
	                routeKeys: {
	                }
	            };
	        }
	        return {
	            groups: result.groups,
	            namedRegex: `^${result.namedParameterizedRoute}${catchAllGroupedRegex}$`,
	            re: new RegExp(`^${result.parameterizedRoute}${catchAllGroupedRegex}$`),
	            routeKeys: result.routeKeys
	        };
	    }
	    if (result.parameterizedRoute === '/') {
	        return {
	            groups: {
	            },
	            re: new RegExp(`^/${catchAllRegex}$`)
	        };
	    }
	    return {
	        groups: {
	        },
	        re: new RegExp(`^${result.parameterizedRoute}${catchAllGroupedRegex}$`)
	    };
	}

	
	return getMiddlewareRegex;
}

var detectDomainLocale = {};

var hasRequiredDetectDomainLocale;

function requireDetectDomainLocale () {
	if (hasRequiredDetectDomainLocale) return detectDomainLocale;
	hasRequiredDetectDomainLocale = 1;
	"use strict";
	Object.defineProperty(detectDomainLocale, "__esModule", {
	    value: true
	});
	detectDomainLocale.detectDomainLocale = detectDomainLocale$1;
	function detectDomainLocale$1(domainItems, hostname, detectedLocale) {
	    let domainItem;
	    if (domainItems) {
	        if (detectedLocale) {
	            detectedLocale = detectedLocale.toLowerCase();
	        }
	        for (const item of domainItems){
	            var ref, ref1;
	            // remove port if present
	            const domainHostname = (ref = item.domain) === null || ref === void 0 ? void 0 : ref.split(':')[0].toLowerCase();
	            if (hostname === domainHostname || detectedLocale === item.defaultLocale.toLowerCase() || ((ref1 = item.locales) === null || ref1 === void 0 ? void 0 : ref1.some((locale)=>locale.toLowerCase() === detectedLocale
	            ))) {
	                domainItem = item;
	                break;
	            }
	        }
	    }
	    return domainItem;
	}

	
	return detectDomainLocale;
}

var hasRequiredRouter$1;

function requireRouter$1 () {
	if (hasRequiredRouter$1) return router$1;
	hasRequiredRouter$1 = 1;
	"use strict";
	var define_process_env_default = {};
	Object.defineProperty(router$1, "__esModule", {
	  value: true
	});
	router$1.getDomainLocale = getDomainLocale;
	router$1.addLocale = addLocale;
	router$1.delLocale = delLocale;
	router$1.hasBasePath = hasBasePath;
	router$1.addBasePath = addBasePath;
	router$1.delBasePath = delBasePath;
	router$1.isLocalURL = isLocalURL;
	router$1.interpolateAs = interpolateAs;
	router$1.resolveHref = resolveHref;
	router$1.default = void 0;
	var _normalizeTrailingSlash = requireNormalizeTrailingSlash();
	var _routeLoader = requireRouteLoader();
	var _isError = _interopRequireDefault(requireIsError());
	var _denormalizePagePath = requireDenormalizePagePath();
	var _normalizeLocalePath = requireNormalizeLocalePath();
	var _mitt = _interopRequireDefault(requireMitt());
	var _utils = requireUtils();
	var _isDynamic = requireIsDynamic();
	var _parseRelativeUrl = requireParseRelativeUrl();
	var _querystring = requireQuerystring();
	var _resolveRewrites = _interopRequireDefault(requireResolveRewrites());
	var _routeMatcher = requireRouteMatcher();
	var _routeRegex = requireRouteRegex();
	var _getMiddlewareRegex = requireGetMiddlewareRegex();
	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : {
	    default: obj
	  };
	}
	let detectDomainLocale;
	if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	  detectDomainLocale = requireDetectDomainLocale().detectDomainLocale;
	}
	const basePath = define_process_env_default.__NEXT_ROUTER_BASEPATH || "";
	function buildCancellationError() {
	  return Object.assign(new Error("Route Cancelled"), {
	    cancelled: true
	  });
	}
	function addPathPrefix(path, prefix) {
	  if (!path.startsWith("/") || !prefix) {
	    return path;
	  }
	  const pathname = pathNoQueryHash(path);
	  return (0, _normalizeTrailingSlash).normalizePathTrailingSlash(`${prefix}${pathname}`) + path.substr(pathname.length);
	}
	function getDomainLocale(path, locale, locales, domainLocales) {
	  if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	    locale = locale || (0, _normalizeLocalePath).normalizeLocalePath(path, locales).detectedLocale;
	    const detectedDomain = detectDomainLocale(domainLocales, void 0, locale);
	    if (detectedDomain) {
	      return `http${detectedDomain.http ? "" : "s"}://${detectedDomain.domain}${basePath || ""}${locale === detectedDomain.defaultLocale ? "" : `/${locale}`}${path}`;
	    }
	    return false;
	  } else {
	    return false;
	  }
	}
	function addLocale(path, locale, defaultLocale) {
	  if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	    const pathname = pathNoQueryHash(path);
	    const pathLower = pathname.toLowerCase();
	    const localeLower = locale && locale.toLowerCase();
	    return locale && locale !== defaultLocale && !pathLower.startsWith("/" + localeLower + "/") && pathLower !== "/" + localeLower ? addPathPrefix(path, "/" + locale) : path;
	  }
	  return path;
	}
	function delLocale(path, locale) {
	  if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	    const pathname = pathNoQueryHash(path);
	    const pathLower = pathname.toLowerCase();
	    const localeLower = locale && locale.toLowerCase();
	    return locale && (pathLower.startsWith("/" + localeLower + "/") || pathLower === "/" + localeLower) ? (pathname.length === locale.length + 1 ? "/" : "") + path.substr(locale.length + 1) : path;
	  }
	  return path;
	}
	function pathNoQueryHash(path) {
	  const queryIndex = path.indexOf("?");
	  const hashIndex = path.indexOf("#");
	  if (queryIndex > -1 || hashIndex > -1) {
	    path = path.substring(0, queryIndex > -1 ? queryIndex : hashIndex);
	  }
	  return path;
	}
	function hasBasePath(path) {
	  path = pathNoQueryHash(path);
	  return path === basePath || path.startsWith(basePath + "/");
	}
	function addBasePath(path) {
	  return addPathPrefix(path, basePath);
	}
	function delBasePath(path) {
	  path = path.slice(basePath.length);
	  if (!path.startsWith("/")) path = `/${path}`;
	  return path;
	}
	function isLocalURL(url) {
	  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("?")) return true;
	  try {
	    const locationOrigin = (0, _utils).getLocationOrigin();
	    const resolved = new URL(url, locationOrigin);
	    return resolved.origin === locationOrigin && hasBasePath(resolved.pathname);
	  } catch (_) {
	    return false;
	  }
	}
	function interpolateAs(route, asPathname, query) {
	  let interpolatedRoute = "";
	  const dynamicRegex = (0, _routeRegex).getRouteRegex(route);
	  const dynamicGroups = dynamicRegex.groups;
	  const dynamicMatches = (
	    // Try to match the dynamic route against the asPath
	    (asPathname !== route ? (0, _routeMatcher).getRouteMatcher(dynamicRegex)(asPathname) : "") || // Fall back to reading the values from the href
	    // TODO: should this take priority; also need to change in the router.
	    query
	  );
	  interpolatedRoute = route;
	  const params = Object.keys(dynamicGroups);
	  if (!params.every((param) => {
	    let value = dynamicMatches[param] || "";
	    const { repeat, optional } = dynamicGroups[param];
	    let replaced = `[${repeat ? "..." : ""}${param}]`;
	    if (optional) {
	      replaced = `${!value ? "/" : ""}[${replaced}]`;
	    }
	    if (repeat && !Array.isArray(value)) value = [
	      value
	    ];
	    return (optional || param in dynamicMatches) && // Interpolate group into data URL if present
	    (interpolatedRoute = interpolatedRoute.replace(replaced, repeat ? value.map(
	      // these values should be fully encoded instead of just
	      // path delimiter escaped since they are being inserted
	      // into the URL and we expect URL encoded segments
	      // when parsing dynamic route params
	      (segment) => encodeURIComponent(segment)
	    ).join("/") : encodeURIComponent(value)) || "/");
	  })) {
	    interpolatedRoute = "";
	  }
	  return {
	    params,
	    result: interpolatedRoute
	  };
	}
	function omitParmsFromQuery(query, params) {
	  const filteredQuery = {};
	  Object.keys(query).forEach((key) => {
	    if (!params.includes(key)) {
	      filteredQuery[key] = query[key];
	    }
	  });
	  return filteredQuery;
	}
	function resolveHref(router, href, resolveAs) {
	  let base;
	  let urlAsString = typeof href === "string" ? href : (0, _utils).formatWithValidation(href);
	  const urlProtoMatch = urlAsString.match(/^[a-zA-Z]{1,}:\/\//);
	  const urlAsStringNoProto = urlProtoMatch ? urlAsString.substr(urlProtoMatch[0].length) : urlAsString;
	  const urlParts = urlAsStringNoProto.split("?");
	  if ((urlParts[0] || "").match(/(\/\/|\\)/)) {
	    console.error(`Invalid href passed to next/router: ${urlAsString}, repeated forward-slashes (//) or backslashes \\ are not valid in the href`);
	    const normalizedUrl = (0, _utils).normalizeRepeatedSlashes(urlAsStringNoProto);
	    urlAsString = (urlProtoMatch ? urlProtoMatch[0] : "") + normalizedUrl;
	  }
	  if (!isLocalURL(urlAsString)) {
	    return resolveAs ? [
	      urlAsString
	    ] : urlAsString;
	  }
	  try {
	    base = new URL(urlAsString.startsWith("#") ? router.asPath : router.pathname, "http://n");
	  } catch (_) {
	    base = new URL("/", "http://n");
	  }
	  try {
	    const finalUrl = new URL(urlAsString, base);
	    finalUrl.pathname = (0, _normalizeTrailingSlash).normalizePathTrailingSlash(finalUrl.pathname);
	    let interpolatedAs = "";
	    if ((0, _isDynamic).isDynamicRoute(finalUrl.pathname) && finalUrl.searchParams && resolveAs) {
	      const query = (0, _querystring).searchParamsToUrlQuery(finalUrl.searchParams);
	      const { result, params } = interpolateAs(finalUrl.pathname, finalUrl.pathname, query);
	      if (result) {
	        interpolatedAs = (0, _utils).formatWithValidation({
	          pathname: result,
	          hash: finalUrl.hash,
	          query: omitParmsFromQuery(query, params)
	        });
	      }
	    }
	    const resolvedHref = finalUrl.origin === base.origin ? finalUrl.href.slice(finalUrl.origin.length) : finalUrl.href;
	    return resolveAs ? [
	      resolvedHref,
	      interpolatedAs || resolvedHref
	    ] : resolvedHref;
	  } catch (_1) {
	    return resolveAs ? [
	      urlAsString
	    ] : urlAsString;
	  }
	}
	function stripOrigin(url) {
	  const origin = (0, _utils).getLocationOrigin();
	  return url.startsWith(origin) ? url.substring(origin.length) : url;
	}
	function prepareUrlAs(router, url, as) {
	  let [resolvedHref, resolvedAs] = resolveHref(router, url, true);
	  const origin = (0, _utils).getLocationOrigin();
	  const hrefHadOrigin = resolvedHref.startsWith(origin);
	  const asHadOrigin = resolvedAs && resolvedAs.startsWith(origin);
	  resolvedHref = stripOrigin(resolvedHref);
	  resolvedAs = resolvedAs ? stripOrigin(resolvedAs) : resolvedAs;
	  const preparedUrl = hrefHadOrigin ? resolvedHref : addBasePath(resolvedHref);
	  const preparedAs = as ? stripOrigin(resolveHref(router, as)) : resolvedAs || resolvedHref;
	  return {
	    url: preparedUrl,
	    as: asHadOrigin ? preparedAs : addBasePath(preparedAs)
	  };
	}
	function resolveDynamicRoute(pathname, pages) {
	  const cleanPathname = (0, _normalizeTrailingSlash).removePathTrailingSlash((0, _denormalizePagePath).denormalizePagePath(pathname));
	  if (cleanPathname === "/404" || cleanPathname === "/_error") {
	    return pathname;
	  }
	  if (!pages.includes(cleanPathname)) {
	    pages.some((page) => {
	      if ((0, _isDynamic).isDynamicRoute(page) && (0, _routeRegex).getRouteRegex(page).re.test(cleanPathname)) {
	        pathname = page;
	        return true;
	      }
	    });
	  }
	  return (0, _normalizeTrailingSlash).removePathTrailingSlash(pathname);
	}
	const manualScrollRestoration = define_process_env_default.__NEXT_SCROLL_RESTORATION && typeof window !== "undefined" && "scrollRestoration" in window.history && !!(function() {
	  try {
	    let v = "__next";
	    return sessionStorage.setItem(v, v), sessionStorage.removeItem(v), true;
	  } catch (n) {
	  }
	})();
	const SSG_DATA_NOT_FOUND = Symbol("SSG_DATA_NOT_FOUND");
	function fetchRetry(url, attempts, opts) {
	  return fetch(url, {
	    // Cookies are required to be present for Next.js' SSG "Preview Mode".
	    // Cookies may also be required for `getServerSideProps`.
	    //
	    // > `fetch` won’t send cookies, unless you set the credentials init
	    // > option.
	    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
	    //
	    // > For maximum browser compatibility when it comes to sending &
	    // > receiving cookies, always supply the `credentials: 'same-origin'`
	    // > option instead of relying on the default.
	    // https://github.com/github/fetch#caveats
	    credentials: "same-origin"
	  }).then((res) => {
	    if (!res.ok) {
	      if (attempts > 1 && res.status >= 500) {
	        return fetchRetry(url, attempts - 1, opts);
	      }
	      if (res.status === 404) {
	        return res.json().then((data) => {
	          if (data.notFound) {
	            return {
	              notFound: SSG_DATA_NOT_FOUND
	            };
	          }
	          throw new Error(`Failed to load static props`);
	        });
	      }
	      throw new Error(`Failed to load static props`);
	    }
	    return opts.text ? res.text() : res.json();
	  });
	}
	function fetchNextData(dataHref, isServerRender, text, inflightCache, persistCache) {
	  const { href: cacheKey } = new URL(dataHref, window.location.href);
	  if (inflightCache[cacheKey] !== void 0) {
	    return inflightCache[cacheKey];
	  }
	  return inflightCache[cacheKey] = fetchRetry(dataHref, isServerRender ? 3 : 1, {
	    text
	  }).catch((err) => {
	    if (!isServerRender) {
	      (0, _routeLoader).markAssetError(err);
	    }
	    throw err;
	  }).then((data) => {
	    if (!persistCache || false) {
	      delete inflightCache[cacheKey];
	    }
	    return data;
	  }).catch((err) => {
	    delete inflightCache[cacheKey];
	    throw err;
	  });
	}
	class Router {
	  constructor(pathname, query, as, { initialProps, pageLoader, App, wrapApp, Component, err, subscription, isFallback, locale, locales, defaultLocale, domainLocales, isPreview }) {
	    this.sdc = {};
	    this.sdr = {};
	    this.sde = {};
	    this._idx = 0;
	    this.onPopState = (e) => {
	      const state = e.state;
	      if (!state) {
	        const { pathname: pathname3, query: query2 } = this;
	        this.changeState("replaceState", (0, _utils).formatWithValidation({
	          pathname: addBasePath(pathname3),
	          query: query2
	        }), (0, _utils).getURL());
	        return;
	      }
	      if (!state.__N) {
	        return;
	      }
	      let forcedScroll;
	      const { url, as: as2, options, idx } = state;
	      if (define_process_env_default.__NEXT_SCROLL_RESTORATION) {
	        if (manualScrollRestoration) {
	          if (this._idx !== idx) {
	            try {
	              sessionStorage.setItem("__next_scroll_" + this._idx, JSON.stringify({
	                x: self.pageXOffset,
	                y: self.pageYOffset
	              }));
	            } catch {
	            }
	            try {
	              const v = sessionStorage.getItem("__next_scroll_" + idx);
	              forcedScroll = JSON.parse(v);
	            } catch {
	              forcedScroll = {
	                x: 0,
	                y: 0
	              };
	            }
	          }
	        }
	      }
	      this._idx = idx;
	      const { pathname: pathname2 } = (0, _parseRelativeUrl).parseRelativeUrl(url);
	      if (this.isSsr && as2 === this.asPath && pathname2 === this.pathname) {
	        return;
	      }
	      if (this._bps && !this._bps(state)) {
	        return;
	      }
	      this.change("replaceState", url, as2, Object.assign({}, options, {
	        shallow: options.shallow && this._shallow,
	        locale: options.locale || this.defaultLocale
	      }), forcedScroll);
	    };
	    this.route = (0, _normalizeTrailingSlash).removePathTrailingSlash(pathname);
	    this.components = {};
	    if (pathname !== "/_error") {
	      var ref;
	      this.components[this.route] = {
	        Component,
	        initial: true,
	        props: initialProps,
	        err,
	        __N_SSG: initialProps && initialProps.__N_SSG,
	        __N_SSP: initialProps && initialProps.__N_SSP,
	        __N_RSC: !!((ref = Component) === null || ref === void 0 ? void 0 : ref.__next_rsc__)
	      };
	    }
	    this.components["/_app"] = {
	      Component: App,
	      styleSheets: []
	    };
	    this.events = Router.events;
	    this.pageLoader = pageLoader;
	    this.pathname = pathname;
	    this.query = query;
	    const autoExportDynamic = (0, _isDynamic).isDynamicRoute(pathname) && self.__NEXT_DATA__.autoExport;
	    this.asPath = autoExportDynamic ? pathname : as;
	    this.basePath = basePath;
	    this.sub = subscription;
	    this.clc = null;
	    this._wrapApp = wrapApp;
	    this.isSsr = true;
	    this.isFallback = isFallback;
	    this.isReady = !!(self.__NEXT_DATA__.gssp || self.__NEXT_DATA__.gip || self.__NEXT_DATA__.appGip && !self.__NEXT_DATA__.gsp || !autoExportDynamic && !self.location.search && !define_process_env_default.__NEXT_HAS_REWRITES);
	    this.isPreview = !!isPreview;
	    this.isLocaleDomain = false;
	    if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	      this.locale = locale;
	      this.locales = locales;
	      this.defaultLocale = defaultLocale;
	      this.domainLocales = domainLocales;
	      this.isLocaleDomain = !!detectDomainLocale(domainLocales, self.location.hostname);
	    }
	    if (typeof window !== "undefined") {
	      if (as.substr(0, 2) !== "//") {
	        const options = {
	          locale
	        };
	        options._shouldResolveHref = as !== pathname;
	        this.changeState("replaceState", (0, _utils).formatWithValidation({
	          pathname: addBasePath(pathname),
	          query
	        }), (0, _utils).getURL(), options);
	      }
	      window.addEventListener("popstate", this.onPopState);
	      if (define_process_env_default.__NEXT_SCROLL_RESTORATION) {
	        if (manualScrollRestoration) {
	          window.history.scrollRestoration = "manual";
	        }
	      }
	    }
	  }
	  reload() {
	    window.location.reload();
	  }
	  /**
	  * Go back in history
	  */
	  back() {
	    window.history.back();
	  }
	  /**
	  * Performs a `pushState` with arguments
	  * @param url of the route
	  * @param as masks `url` for the browser
	  * @param options object you can define `shallow` and other options
	  */
	  push(url, as, options = {}) {
	    if (define_process_env_default.__NEXT_SCROLL_RESTORATION) {
	      if (manualScrollRestoration) {
	        try {
	          sessionStorage.setItem("__next_scroll_" + this._idx, JSON.stringify({
	            x: self.pageXOffset,
	            y: self.pageYOffset
	          }));
	        } catch {
	        }
	      }
	    }
	    ({ url, as } = prepareUrlAs(this, url, as));
	    return this.change("pushState", url, as, options);
	  }
	  /**
	  * Performs a `replaceState` with arguments
	  * @param url of the route
	  * @param as masks `url` for the browser
	  * @param options object you can define `shallow` and other options
	  */
	  replace(url, as, options = {}) {
	    ({ url, as } = prepareUrlAs(this, url, as));
	    return this.change("replaceState", url, as, options);
	  }
	  async change(method, url, as, options, forcedScroll) {
	    if (!isLocalURL(url)) {
	      window.location.href = url;
	      return false;
	    }
	    const shouldResolveHref = options._h || options._shouldResolveHref || pathNoQueryHash(url) === pathNoQueryHash(as);
	    if (options._h) {
	      this.isReady = true;
	    }
	    const prevLocale = this.locale;
	    if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	      this.locale = options.locale === false ? this.defaultLocale : options.locale || this.locale;
	      if (typeof options.locale === "undefined") {
	        options.locale = this.locale;
	      }
	      const parsedAs = (0, _parseRelativeUrl).parseRelativeUrl(hasBasePath(as) ? delBasePath(as) : as);
	      const localePathResult = (0, _normalizeLocalePath).normalizeLocalePath(parsedAs.pathname, this.locales);
	      if (localePathResult.detectedLocale) {
	        this.locale = localePathResult.detectedLocale;
	        parsedAs.pathname = addBasePath(parsedAs.pathname);
	        as = (0, _utils).formatWithValidation(parsedAs);
	        url = addBasePath((0, _normalizeLocalePath).normalizeLocalePath(hasBasePath(url) ? delBasePath(url) : url, this.locales).pathname);
	      }
	      let didNavigate = false;
	      if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	        var ref;
	        if (!((ref = this.locales) === null || ref === void 0 ? void 0 : ref.includes(this.locale))) {
	          parsedAs.pathname = addLocale(parsedAs.pathname, this.locale);
	          window.location.href = (0, _utils).formatWithValidation(parsedAs);
	          didNavigate = true;
	        }
	      }
	      const detectedDomain = detectDomainLocale(this.domainLocales, void 0, this.locale);
	      if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	        if (!didNavigate && detectedDomain && this.isLocaleDomain && self.location.hostname !== detectedDomain.domain) {
	          const asNoBasePath = delBasePath(as);
	          window.location.href = `http${detectedDomain.http ? "" : "s"}://${detectedDomain.domain}${addBasePath(`${this.locale === detectedDomain.defaultLocale ? "" : `/${this.locale}`}${asNoBasePath === "/" ? "" : asNoBasePath}` || "/")}`;
	          didNavigate = true;
	        }
	      }
	      if (didNavigate) {
	        return new Promise(() => {
	        });
	      }
	    }
	    if (!options._h) {
	      this.isSsr = false;
	    }
	    if (_utils.ST) {
	      performance.mark("routeChange");
	    }
	    const { shallow = false } = options;
	    const routeProps = {
	      shallow
	    };
	    if (this._inFlightRoute) {
	      this.abortComponentLoad(this._inFlightRoute, routeProps);
	    }
	    as = addBasePath(addLocale(hasBasePath(as) ? delBasePath(as) : as, options.locale, this.defaultLocale));
	    const cleanedAs = delLocale(hasBasePath(as) ? delBasePath(as) : as, this.locale);
	    this._inFlightRoute = as;
	    let localeChange = prevLocale !== this.locale;
	    if (!options._h && this.onlyAHashChange(cleanedAs) && !localeChange) {
	      this.asPath = cleanedAs;
	      Router.events.emit("hashChangeStart", as, routeProps);
	      this.changeState(method, url, as, options);
	      this.scrollToHash(cleanedAs);
	      this.notify(this.components[this.route], null);
	      Router.events.emit("hashChangeComplete", as, routeProps);
	      return true;
	    }
	    let parsed = (0, _parseRelativeUrl).parseRelativeUrl(url);
	    let { pathname, query } = parsed;
	    let pages, rewrites;
	    try {
	      [pages, { __rewrites: rewrites }] = await Promise.all([
	        this.pageLoader.getPageList(),
	        (0, _routeLoader).getClientBuildManifest(),
	        this.pageLoader.getMiddlewareList()
	      ]);
	    } catch (err) {
	      window.location.href = as;
	      return false;
	    }
	    if (!this.urlIsNew(cleanedAs) && !localeChange) {
	      method = "replaceState";
	    }
	    let resolvedAs = as;
	    pathname = pathname ? (0, _normalizeTrailingSlash).removePathTrailingSlash(delBasePath(pathname)) : pathname;
	    if (shouldResolveHref && pathname !== "/_error") {
	      options._shouldResolveHref = true;
	      if (define_process_env_default.__NEXT_HAS_REWRITES && as.startsWith("/")) {
	        const rewritesResult = (0, _resolveRewrites).default(
	          addBasePath(addLocale(cleanedAs, this.locale)),
	          pages,
	          rewrites,
	          query,
	          (p) => resolveDynamicRoute(p, pages),
	          this.locales
	        );
	        resolvedAs = rewritesResult.asPath;
	        if (rewritesResult.matchedPage && rewritesResult.resolvedHref) {
	          pathname = rewritesResult.resolvedHref;
	          parsed.pathname = addBasePath(pathname);
	          url = (0, _utils).formatWithValidation(parsed);
	        }
	      } else {
	        parsed.pathname = resolveDynamicRoute(pathname, pages);
	        if (parsed.pathname !== pathname) {
	          pathname = parsed.pathname;
	          parsed.pathname = addBasePath(pathname);
	          url = (0, _utils).formatWithValidation(parsed);
	        }
	      }
	    }
	    if (!isLocalURL(as)) {
	      if (false) {
	        throw new Error(`Invalid href: "${url}" and as: "${as}", received relative href and external as
	See more info: https://nextjs.org/docs/messages/invalid-relative-url-external-as`);
	      }
	      window.location.href = as;
	      return false;
	    }
	    resolvedAs = delLocale(delBasePath(resolvedAs), this.locale);
	    const effect = await this._preflightRequest({
	      as,
	      cache: true,
	      pages,
	      pathname,
	      query
	    });
	    if (effect.type === "rewrite") {
	      query = {
	        ...query,
	        ...effect.parsedAs.query
	      };
	      resolvedAs = effect.asPath;
	      pathname = effect.resolvedHref;
	      parsed.pathname = effect.resolvedHref;
	      url = (0, _utils).formatWithValidation(parsed);
	    } else if (effect.type === "redirect" && effect.newAs) {
	      return this.change(method, effect.newUrl, effect.newAs, options);
	    } else if (effect.type === "redirect" && effect.destination) {
	      window.location.href = effect.destination;
	      return new Promise(() => {
	      });
	    } else if (effect.type === "refresh") {
	      window.location.href = as;
	      return new Promise(() => {
	      });
	    }
	    const route = (0, _normalizeTrailingSlash).removePathTrailingSlash(pathname);
	    if ((0, _isDynamic).isDynamicRoute(route)) {
	      const parsedAs = (0, _parseRelativeUrl).parseRelativeUrl(resolvedAs);
	      const asPathname = parsedAs.pathname;
	      const routeRegex = (0, _routeRegex).getRouteRegex(route);
	      const routeMatch = (0, _routeMatcher).getRouteMatcher(routeRegex)(asPathname);
	      const shouldInterpolate = route === asPathname;
	      const interpolatedAs = shouldInterpolate ? interpolateAs(route, asPathname, query) : {};
	      if (!routeMatch || shouldInterpolate && !interpolatedAs.result) {
	        const missingParams = Object.keys(routeRegex.groups).filter(
	          (param) => !query[param]
	        );
	        if (missingParams.length > 0) {
	          if (false) {
	            console.warn(`${shouldInterpolate ? `Interpolating href` : `Mismatching \`as\` and \`href\``} failed to manually provide the params: ${missingParams.join(", ")} in the \`href\`'s \`query\``);
	          }
	          throw new Error((shouldInterpolate ? `The provided \`href\` (${url}) value is missing query values (${missingParams.join(", ")}) to be interpolated properly. ` : `The provided \`as\` value (${asPathname}) is incompatible with the \`href\` value (${route}). `) + `Read more: https://nextjs.org/docs/messages/${shouldInterpolate ? "href-interpolation-failed" : "incompatible-href-as"}`);
	        }
	      } else if (shouldInterpolate) {
	        as = (0, _utils).formatWithValidation(Object.assign({}, parsedAs, {
	          pathname: interpolatedAs.result,
	          query: omitParmsFromQuery(query, interpolatedAs.params)
	        }));
	      } else {
	        Object.assign(query, routeMatch);
	      }
	    }
	    Router.events.emit("routeChangeStart", as, routeProps);
	    try {
	      var ref, ref1;
	      let routeInfo = await this.getRouteInfo(route, pathname, query, as, resolvedAs, routeProps);
	      let { error, props, __N_SSG, __N_SSP } = routeInfo;
	      if ((__N_SSG || __N_SSP) && props) {
	        if (props.pageProps && props.pageProps.__N_REDIRECT) {
	          const destination = props.pageProps.__N_REDIRECT;
	          if (destination.startsWith("/") && props.pageProps.__N_REDIRECT_BASE_PATH !== false) {
	            const parsedHref = (0, _parseRelativeUrl).parseRelativeUrl(destination);
	            parsedHref.pathname = resolveDynamicRoute(parsedHref.pathname, pages);
	            const { url: newUrl, as: newAs } = prepareUrlAs(this, destination, destination);
	            return this.change(method, newUrl, newAs, options);
	          }
	          window.location.href = destination;
	          return new Promise(() => {
	          });
	        }
	        this.isPreview = !!props.__N_PREVIEW;
	        if (props.notFound === SSG_DATA_NOT_FOUND) {
	          let notFoundRoute;
	          try {
	            await this.fetchComponent("/404");
	            notFoundRoute = "/404";
	          } catch (_) {
	            notFoundRoute = "/_error";
	          }
	          routeInfo = await this.getRouteInfo(notFoundRoute, notFoundRoute, query, as, resolvedAs, {
	            shallow: false
	          });
	        }
	      }
	      Router.events.emit("beforeHistoryChange", as, routeProps);
	      this.changeState(method, url, as, options);
	      if (options._h && pathname === "/_error" && ((ref = self.__NEXT_DATA__.props) === null || ref === void 0 ? void 0 : (ref1 = ref.pageProps) === null || ref1 === void 0 ? void 0 : ref1.statusCode) === 500 && (props === null || props === void 0 ? void 0 : props.pageProps)) {
	        props.pageProps.statusCode = 500;
	      }
	      const isValidShallowRoute = options.shallow && this.route === route;
	      var _scroll;
	      const shouldScroll = (_scroll = options.scroll) !== null && _scroll !== void 0 ? _scroll : !isValidShallowRoute;
	      const resetScroll = shouldScroll ? {
	        x: 0,
	        y: 0
	      } : null;
	      await this.set(route, pathname, query, cleanedAs, routeInfo, forcedScroll !== null && forcedScroll !== void 0 ? forcedScroll : resetScroll).catch((e) => {
	        if (e.cancelled) error = error || e;
	        else throw e;
	      });
	      if (error) {
	        Router.events.emit("routeChangeError", error, cleanedAs, routeProps);
	        throw error;
	      }
	      if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	        if (this.locale) {
	          document.documentElement.lang = this.locale;
	        }
	      }
	      Router.events.emit("routeChangeComplete", as, routeProps);
	      return true;
	    } catch (err1) {
	      if ((0, _isError).default(err1) && err1.cancelled) {
	        return false;
	      }
	      throw err1;
	    }
	  }
	  changeState(method, url, as, options = {}) {
	    if (false) {
	      if (typeof window.history === "undefined") {
	        console.error(`Warning: window.history is not available.`);
	        return;
	      }
	      if (typeof window.history[method] === "undefined") {
	        console.error(`Warning: window.history.${method} is not available`);
	        return;
	      }
	    }
	    if (method !== "pushState" || (0, _utils).getURL() !== as) {
	      this._shallow = options.shallow;
	      window.history[method](
	        {
	          url,
	          as,
	          options,
	          __N: true,
	          idx: this._idx = method !== "pushState" ? this._idx : this._idx + 1
	        },
	        // Most browsers currently ignores this parameter, although they may use it in the future.
	        // Passing the empty string here should be safe against future changes to the method.
	        // https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState
	        "",
	        as
	      );
	    }
	  }
	  async handleRouteInfoError(err, pathname, query, as, routeProps, loadErrorFail) {
	    if (err.cancelled) {
	      throw err;
	    }
	    if ((0, _routeLoader).isAssetError(err) || loadErrorFail) {
	      Router.events.emit("routeChangeError", err, as, routeProps);
	      window.location.href = as;
	      throw buildCancellationError();
	    }
	    try {
	      let Component;
	      let styleSheets;
	      let props;
	      if (typeof Component === "undefined" || typeof styleSheets === "undefined") {
	        ({ page: Component, styleSheets } = await this.fetchComponent("/_error"));
	      }
	      const routeInfo = {
	        props,
	        Component,
	        styleSheets,
	        err,
	        error: err
	      };
	      if (!routeInfo.props) {
	        try {
	          routeInfo.props = await this.getInitialProps(Component, {
	            err,
	            pathname,
	            query
	          });
	        } catch (gipErr) {
	          console.error("Error in error page `getInitialProps`: ", gipErr);
	          routeInfo.props = {};
	        }
	      }
	      return routeInfo;
	    } catch (routeInfoErr) {
	      return this.handleRouteInfoError((0, _isError).default(routeInfoErr) ? routeInfoErr : new Error(routeInfoErr + ""), pathname, query, as, routeProps, true);
	    }
	  }
	  async getRouteInfo(route, pathname, query, as, resolvedAs, routeProps) {
	    try {
	      const existingRouteInfo = this.components[route];
	      if (routeProps.shallow && existingRouteInfo && this.route === route) {
	        return existingRouteInfo;
	      }
	      let cachedRouteInfo = void 0;
	      if (existingRouteInfo && !("initial" in existingRouteInfo)) {
	        cachedRouteInfo = existingRouteInfo;
	      }
	      const routeInfo = cachedRouteInfo || await this.fetchComponent(route).then(
	        (res) => ({
	          Component: res.page,
	          styleSheets: res.styleSheets,
	          __N_SSG: res.mod.__N_SSG,
	          __N_SSP: res.mod.__N_SSP,
	          __N_RSC: !!res.page.__next_rsc__
	        })
	      );
	      const { Component, __N_SSG, __N_SSP, __N_RSC } = routeInfo;
	      if (false) {
	        const { isValidElementType } = require("react-is");
	        if (!isValidElementType(Component)) {
	          throw new Error(`The default export is not a React Component in page: "${pathname}"`);
	        }
	      }
	      let dataHref;
	      if (__N_SSG || __N_SSP || __N_RSC) {
	        dataHref = this.pageLoader.getDataHref({
	          href: (0, _utils).formatWithValidation({
	            pathname,
	            query
	          }),
	          asPath: resolvedAs,
	          ssg: __N_SSG,
	          rsc: __N_RSC,
	          locale: this.locale
	        });
	      }
	      const props = await this._getData(
	        () => __N_SSG || __N_SSP ? fetchNextData(dataHref, this.isSsr, false, __N_SSG ? this.sdc : this.sdr, !!__N_SSG) : this.getInitialProps(
	          Component,
	          // we provide AppTree later so this needs to be `any`
	          {
	            pathname,
	            query,
	            asPath: as,
	            locale: this.locale,
	            locales: this.locales,
	            defaultLocale: this.defaultLocale
	          }
	        )
	      );
	      if (__N_RSC) {
	        const { fresh, data } = await this._getData(
	          () => this._getFlightData(dataHref)
	        );
	        props.pageProps = Object.assign(props.pageProps, {
	          __flight_serialized__: data,
	          __flight_fresh__: fresh
	        });
	      }
	      routeInfo.props = props;
	      this.components[route] = routeInfo;
	      return routeInfo;
	    } catch (err) {
	      return this.handleRouteInfoError((0, _isError).default(err) ? err : new Error(err + ""), pathname, query, as, routeProps);
	    }
	  }
	  set(route, pathname, query, as, data, resetScroll) {
	    this.isFallback = false;
	    this.route = route;
	    this.pathname = pathname;
	    this.query = query;
	    this.asPath = as;
	    return this.notify(data, resetScroll);
	  }
	  /**
	  * Callback to execute before replacing router state
	  * @param cb callback to be executed
	  */
	  beforePopState(cb) {
	    this._bps = cb;
	  }
	  onlyAHashChange(as) {
	    if (!this.asPath) return false;
	    const [oldUrlNoHash, oldHash] = this.asPath.split("#");
	    const [newUrlNoHash, newHash] = as.split("#");
	    if (newHash && oldUrlNoHash === newUrlNoHash && oldHash === newHash) {
	      return true;
	    }
	    if (oldUrlNoHash !== newUrlNoHash) {
	      return false;
	    }
	    return oldHash !== newHash;
	  }
	  scrollToHash(as) {
	    const [, hash] = as.split("#");
	    if (hash === "" || hash === "top") {
	      window.scrollTo(0, 0);
	      return;
	    }
	    const idEl = document.getElementById(hash);
	    if (idEl) {
	      idEl.scrollIntoView();
	      return;
	    }
	    const nameEl = document.getElementsByName(hash)[0];
	    if (nameEl) {
	      nameEl.scrollIntoView();
	    }
	  }
	  urlIsNew(asPath) {
	    return this.asPath !== asPath;
	  }
	  /**
	  * Prefetch page code, you may wait for the data during page rendering.
	  * This feature only works in production!
	  * @param url the href of prefetched page
	  * @param asPath the as path of the prefetched page
	  */
	  async prefetch(url, asPath = url, options = {}) {
	    let parsed = (0, _parseRelativeUrl).parseRelativeUrl(url);
	    let { pathname, query } = parsed;
	    if (define_process_env_default.__NEXT_I18N_SUPPORT) {
	      if (options.locale === false) {
	        pathname = (0, _normalizeLocalePath).normalizeLocalePath(pathname, this.locales).pathname;
	        parsed.pathname = pathname;
	        url = (0, _utils).formatWithValidation(parsed);
	        let parsedAs = (0, _parseRelativeUrl).parseRelativeUrl(asPath);
	        const localePathResult = (0, _normalizeLocalePath).normalizeLocalePath(parsedAs.pathname, this.locales);
	        parsedAs.pathname = localePathResult.pathname;
	        options.locale = localePathResult.detectedLocale || this.defaultLocale;
	        asPath = (0, _utils).formatWithValidation(parsedAs);
	      }
	    }
	    const pages = await this.pageLoader.getPageList();
	    let resolvedAs = asPath;
	    if (define_process_env_default.__NEXT_HAS_REWRITES && asPath.startsWith("/")) {
	      let rewrites;
	      ({ __rewrites: rewrites } = await (0, _routeLoader).getClientBuildManifest());
	      const rewritesResult = (0, _resolveRewrites).default(
	        addBasePath(addLocale(asPath, this.locale)),
	        pages,
	        rewrites,
	        parsed.query,
	        (p) => resolveDynamicRoute(p, pages),
	        this.locales
	      );
	      resolvedAs = delLocale(delBasePath(rewritesResult.asPath), this.locale);
	      if (rewritesResult.matchedPage && rewritesResult.resolvedHref) {
	        pathname = rewritesResult.resolvedHref;
	        parsed.pathname = pathname;
	        url = (0, _utils).formatWithValidation(parsed);
	      }
	    } else {
	      parsed.pathname = resolveDynamicRoute(parsed.pathname, pages);
	      if (parsed.pathname !== pathname) {
	        pathname = parsed.pathname;
	        parsed.pathname = pathname;
	        url = (0, _utils).formatWithValidation(parsed);
	      }
	    }
	    if (false) {
	      return;
	    }
	    const effects = await this._preflightRequest({
	      as: asPath,
	      cache: true,
	      pages,
	      pathname,
	      query
	    });
	    if (effects.type === "rewrite") {
	      parsed.pathname = effects.resolvedHref;
	      pathname = effects.resolvedHref;
	      query = {
	        ...query,
	        ...effects.parsedAs.query
	      };
	      resolvedAs = effects.asPath;
	      url = (0, _utils).formatWithValidation(parsed);
	    }
	    const route = (0, _normalizeTrailingSlash).removePathTrailingSlash(pathname);
	    await Promise.all([
	      this.pageLoader._isSsg(route).then((isSsg) => {
	        return isSsg ? fetchNextData(this.pageLoader.getDataHref({
	          href: url,
	          asPath: resolvedAs,
	          ssg: true,
	          locale: typeof options.locale !== "undefined" ? options.locale : this.locale
	        }), false, false, this.sdc, true) : false;
	      }),
	      this.pageLoader[options.priority ? "loadPage" : "prefetch"](route)
	    ]);
	  }
	  async fetchComponent(route) {
	    let cancelled = false;
	    const cancel = this.clc = () => {
	      cancelled = true;
	    };
	    const handleCancelled = () => {
	      if (cancelled) {
	        const error = new Error(`Abort fetching component for route: "${route}"`);
	        error.cancelled = true;
	        throw error;
	      }
	      if (cancel === this.clc) {
	        this.clc = null;
	      }
	    };
	    try {
	      const componentResult = await this.pageLoader.loadPage(route);
	      handleCancelled();
	      return componentResult;
	    } catch (err) {
	      handleCancelled();
	      throw err;
	    }
	  }
	  _getData(fn) {
	    let cancelled = false;
	    const cancel = () => {
	      cancelled = true;
	    };
	    this.clc = cancel;
	    return fn().then((data) => {
	      if (cancel === this.clc) {
	        this.clc = null;
	      }
	      if (cancelled) {
	        const err = new Error("Loading initial props cancelled");
	        err.cancelled = true;
	        throw err;
	      }
	      return data;
	    });
	  }
	  _getFlightData(dataHref) {
	    const { href: cacheKey } = new URL(dataHref, window.location.href);
	    if (!this.isPreview && this.sdc[cacheKey]) {
	      return Promise.resolve({
	        fresh: false,
	        data: this.sdc[cacheKey]
	      });
	    }
	    return fetchNextData(dataHref, true, true, this.sdc, false).then((serialized) => {
	      this.sdc[cacheKey] = serialized;
	      return {
	        fresh: true,
	        data: serialized
	      };
	    });
	  }
	  async _preflightRequest(options) {
	    var ref;
	    const cleanedAs = delLocale(hasBasePath(options.as) ? delBasePath(options.as) : options.as, this.locale);
	    const fns = await this.pageLoader.getMiddlewareList();
	    const requiresPreflight = fns.some(([middleware, isSSR]) => {
	      return (0, _routeMatcher).getRouteMatcher((0, _getMiddlewareRegex).getMiddlewareRegex(middleware, !isSSR))(cleanedAs);
	    });
	    if (!requiresPreflight) {
	      return {
	        type: "next"
	      };
	    }
	    const preflight = await this._getPreflightData({
	      preflightHref: options.as,
	      shouldCache: options.cache
	    });
	    if ((ref = preflight.rewrite) === null || ref === void 0 ? void 0 : ref.startsWith("/")) {
	      const parsed = (0, _parseRelativeUrl).parseRelativeUrl((0, _normalizeLocalePath).normalizeLocalePath(hasBasePath(preflight.rewrite) ? delBasePath(preflight.rewrite) : preflight.rewrite, this.locales).pathname);
	      const fsPathname = (0, _normalizeTrailingSlash).removePathTrailingSlash(parsed.pathname);
	      let matchedPage;
	      let resolvedHref;
	      if (options.pages.includes(fsPathname)) {
	        matchedPage = true;
	        resolvedHref = fsPathname;
	      } else {
	        resolvedHref = resolveDynamicRoute(fsPathname, options.pages);
	        if (resolvedHref !== parsed.pathname && options.pages.includes(resolvedHref)) {
	          matchedPage = true;
	        }
	      }
	      return {
	        type: "rewrite",
	        asPath: parsed.pathname,
	        parsedAs: parsed,
	        matchedPage,
	        resolvedHref
	      };
	    }
	    if (preflight.redirect) {
	      if (preflight.redirect.startsWith("/")) {
	        const cleanRedirect = (0, _normalizeTrailingSlash).removePathTrailingSlash((0, _normalizeLocalePath).normalizeLocalePath(hasBasePath(preflight.redirect) ? delBasePath(preflight.redirect) : preflight.redirect, this.locales).pathname);
	        const { url: newUrl, as: newAs } = prepareUrlAs(this, cleanRedirect, cleanRedirect);
	        return {
	          type: "redirect",
	          newUrl,
	          newAs
	        };
	      }
	      return {
	        type: "redirect",
	        destination: preflight.redirect
	      };
	    }
	    if (preflight.refresh && !preflight.ssr) {
	      return {
	        type: "refresh"
	      };
	    }
	    return {
	      type: "next"
	    };
	  }
	  _getPreflightData(params) {
	    const { preflightHref, shouldCache = false } = params;
	    const { href: cacheKey } = new URL(preflightHref, window.location.href);
	    if (!this.isPreview && shouldCache && this.sde[cacheKey]) {
	      return Promise.resolve(this.sde[cacheKey]);
	    }
	    return fetch(preflightHref, {
	      method: "HEAD",
	      credentials: "same-origin",
	      headers: {
	        "x-middleware-preflight": "1"
	      }
	    }).then((res) => {
	      if (!res.ok) {
	        throw new Error(`Failed to preflight request`);
	      }
	      return {
	        redirect: res.headers.get("Location"),
	        refresh: res.headers.has("x-middleware-refresh"),
	        rewrite: res.headers.get("x-middleware-rewrite"),
	        ssr: !!res.headers.get("x-middleware-ssr")
	      };
	    }).then((data) => {
	      if (shouldCache) {
	        this.sde[cacheKey] = data;
	      }
	      return data;
	    }).catch((err) => {
	      delete this.sde[cacheKey];
	      throw err;
	    });
	  }
	  getInitialProps(Component, ctx) {
	    const { Component: App } = this.components["/_app"];
	    const AppTree = this._wrapApp(App);
	    ctx.AppTree = AppTree;
	    return (0, _utils).loadGetInitialProps(App, {
	      AppTree,
	      Component,
	      router: this,
	      ctx
	    });
	  }
	  abortComponentLoad(as, routeProps) {
	    if (this.clc) {
	      Router.events.emit("routeChangeError", buildCancellationError(), as, routeProps);
	      this.clc();
	      this.clc = null;
	    }
	  }
	  notify(data, resetScroll) {
	    return this.sub(data, this.components["/_app"].Component, resetScroll);
	  }
	}
	Router.events = (0, _mitt).default();
	router$1.default = Router;
	return router$1;
}

var router = {};

var routerContext = {};

var hasRequiredRouterContext;

function requireRouterContext () {
	if (hasRequiredRouterContext) return routerContext;
	hasRequiredRouterContext = 1;
	"use strict";
	Object.defineProperty(routerContext, "__esModule", {
	  value: true
	});
	routerContext.RouterContext = void 0;
	var _react = _interopRequireDefault(requireReact());
	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : {
	    default: obj
	  };
	}
	const RouterContext = _react.default.createContext(null);
	routerContext.RouterContext = RouterContext;
	if (false) {
	  RouterContext.displayName = "RouterContext";
	}
	return routerContext;
}

var withRouter = {};

var hasRequiredWithRouter;

function requireWithRouter () {
	if (hasRequiredWithRouter) return withRouter;
	hasRequiredWithRouter = 1;
	"use strict";
	Object.defineProperty(withRouter, "__esModule", {
	  value: true
	});
	withRouter.default = withRouter$1;
	var _react = _interopRequireDefault(requireReact());
	var _router = requireRouter();
	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : {
	    default: obj
	  };
	}
	function withRouter$1(ComposedComponent) {
	  function WithRouterWrapper(props) {
	    return /* @__PURE__ */ _react.default.createElement(ComposedComponent, Object.assign({
	      router: (0, _router).useRouter()
	    }, props));
	  }
	  WithRouterWrapper.getInitialProps = ComposedComponent.getInitialProps;
	  WithRouterWrapper.origGetInitialProps = ComposedComponent.origGetInitialProps;
	  if (false) {
	    const name = ComposedComponent.displayName || ComposedComponent.name || "Unknown";
	    WithRouterWrapper.displayName = `withRouter(${name})`;
	  }
	  return WithRouterWrapper;
	}
	return withRouter;
}

var hasRequiredRouter;

function requireRouter () {
	if (hasRequiredRouter) return router;
	hasRequiredRouter = 1;
	(function (exports$1) {
		"use strict";
		Object.defineProperty(exports$1, "__esModule", {
		    value: true
		});
		Object.defineProperty(exports$1, "Router", {
		    enumerable: true,
		    get: function() {
		        return _router.default;
		    }
		});
		Object.defineProperty(exports$1, "withRouter", {
		    enumerable: true,
		    get: function() {
		        return _withRouter.default;
		    }
		});
		exports$1.useRouter = useRouter;
		exports$1.createRouter = createRouter;
		exports$1.makePublicRouterInstance = makePublicRouterInstance;
		exports$1.default = void 0;
		var _react = _interopRequireDefault(requireReact());
		var _router = _interopRequireDefault(requireRouter$1());
		var _routerContext = requireRouterContext();
		var _isError = _interopRequireDefault(requireIsError());
		var _withRouter = _interopRequireDefault(requireWithRouter());
		function _interopRequireDefault(obj) {
		    return obj && obj.__esModule ? obj : {
		        default: obj
		    };
		}
		const singletonRouter = {
		    router: null,
		    readyCallbacks: [],
		    ready (cb) {
		        if (this.router) return cb();
		        if (typeof window !== 'undefined') {
		            this.readyCallbacks.push(cb);
		        }
		    }
		};
		// Create public properties and methods of the router in the singletonRouter
		const urlPropertyFields = [
		    'pathname',
		    'route',
		    'query',
		    'asPath',
		    'components',
		    'isFallback',
		    'basePath',
		    'locale',
		    'locales',
		    'defaultLocale',
		    'isReady',
		    'isPreview',
		    'isLocaleDomain',
		    'domainLocales', 
		];
		const routerEvents = [
		    'routeChangeStart',
		    'beforeHistoryChange',
		    'routeChangeComplete',
		    'routeChangeError',
		    'hashChangeStart',
		    'hashChangeComplete', 
		];
		const coreMethodFields = [
		    'push',
		    'replace',
		    'reload',
		    'back',
		    'prefetch',
		    'beforePopState', 
		];
		// Events is a static property on the router, the router doesn't have to be initialized to use it
		Object.defineProperty(singletonRouter, 'events', {
		    get () {
		        return _router.default.events;
		    }
		});
		urlPropertyFields.forEach((field)=>{
		    // Here we need to use Object.defineProperty because we need to return
		    // the property assigned to the actual router
		    // The value might get changed as we change routes and this is the
		    // proper way to access it
		    Object.defineProperty(singletonRouter, field, {
		        get () {
		            const router = getRouter();
		            return router[field];
		        }
		    });
		});
		coreMethodFields.forEach((field)=>{
		    singletonRouter[field] = (...args)=>{
		        const router = getRouter();
		        return router[field](...args);
		    };
		});
		routerEvents.forEach((event)=>{
		    singletonRouter.ready(()=>{
		        _router.default.events.on(event, (...args)=>{
		            const eventField = `on${event.charAt(0).toUpperCase()}${event.substring(1)}`;
		            const _singletonRouter = singletonRouter;
		            if (_singletonRouter[eventField]) {
		                try {
		                    _singletonRouter[eventField](...args);
		                } catch (err) {
		                    console.error(`Error when running the Router event: ${eventField}`);
		                    console.error((0, _isError).default(err) ? `${err.message}\n${err.stack}` : err + '');
		                }
		            }
		        });
		    });
		});
		function getRouter() {
		    if (!singletonRouter.router) {
		        const message = 'No router instance found.\n' + 'You should only use "next/router" on the client side of your app.\n';
		        throw new Error(message);
		    }
		    return singletonRouter.router;
		}
		var _default = singletonRouter;
		exports$1.default = _default;
		function useRouter() {
		    return _react.default.useContext(_routerContext.RouterContext);
		}
		function createRouter(...args) {
		    singletonRouter.router = new _router.default(...args);
		    singletonRouter.readyCallbacks.forEach((cb)=>cb()
		    );
		    singletonRouter.readyCallbacks = [];
		    return singletonRouter.router;
		}
		function makePublicRouterInstance(router) {
		    const scopedRouter = router;
		    const instance = {
		    };
		    for (const property of urlPropertyFields){
		        if (typeof scopedRouter[property] === 'object') {
		            instance[property] = Object.assign(Array.isArray(scopedRouter[property]) ? [] : {
		            }, scopedRouter[property]) // makes sure query is not stateful
		            ;
		            continue;
		        }
		        instance[property] = scopedRouter[property];
		    }
		    // Events is a static property on the router, the router doesn't have to be initialized to use it
		    instance.events = _router.default.events;
		    coreMethodFields.forEach((field)=>{
		        instance[field] = (...args)=>{
		            return scopedRouter[field](...args);
		        };
		    });
		    return instance;
		}

		
	} (router));
	return router;
}

var useIntersection = {};

var hasRequiredUseIntersection;

function requireUseIntersection () {
	if (hasRequiredUseIntersection) return useIntersection;
	hasRequiredUseIntersection = 1;
	"use strict";
	Object.defineProperty(useIntersection, "__esModule", {
	    value: true
	});
	useIntersection.useIntersection = useIntersection$1;
	var _react = requireReact();
	var _requestIdleCallback = requireRequestIdleCallback();
	const hasIntersectionObserver = typeof IntersectionObserver !== 'undefined';
	function useIntersection$1({ rootMargin , disabled  }) {
	    const isDisabled = disabled || !hasIntersectionObserver;
	    const unobserve = (0, _react).useRef();
	    const [visible, setVisible] = (0, _react).useState(false);
	    const setRef = (0, _react).useCallback((el)=>{
	        if (unobserve.current) {
	            unobserve.current();
	            unobserve.current = undefined;
	        }
	        if (isDisabled || visible) return;
	        if (el && el.tagName) {
	            unobserve.current = observe(el, (isVisible)=>isVisible && setVisible(isVisible)
	            , {
	                rootMargin
	            });
	        }
	    }, [
	        isDisabled,
	        rootMargin,
	        visible
	    ]);
	    (0, _react).useEffect(()=>{
	        if (!hasIntersectionObserver) {
	            if (!visible) {
	                const idleCallback = (0, _requestIdleCallback).requestIdleCallback(()=>setVisible(true)
	                );
	                return ()=>(0, _requestIdleCallback).cancelIdleCallback(idleCallback)
	                ;
	            }
	        }
	    }, [
	        visible
	    ]);
	    return [
	        setRef,
	        visible
	    ];
	}
	function observe(element, callback, options) {
	    const { id , observer , elements  } = createObserver(options);
	    elements.set(element, callback);
	    observer.observe(element);
	    return function unobserve() {
	        elements.delete(element);
	        observer.unobserve(element);
	        // Destroy observer when there's nothing left to watch:
	        if (elements.size === 0) {
	            observer.disconnect();
	            observers.delete(id);
	        }
	    };
	}
	const observers = new Map();
	function createObserver(options) {
	    const id = options.rootMargin || '';
	    let instance = observers.get(id);
	    if (instance) {
	        return instance;
	    }
	    const elements = new Map();
	    const observer = new IntersectionObserver((entries)=>{
	        entries.forEach((entry)=>{
	            const callback = elements.get(entry.target);
	            const isVisible = entry.isIntersecting || entry.intersectionRatio > 0;
	            if (callback && isVisible) {
	                callback(isVisible);
	            }
	        });
	    }, options);
	    observers.set(id, instance = {
	        id,
	        observer,
	        elements
	    });
	    return instance;
	}

	
	return useIntersection;
}

var hasRequiredLink$1;

function requireLink$1 () {
	if (hasRequiredLink$1) return link$1;
	hasRequiredLink$1 = 1;
	"use strict";
	Object.defineProperty(link$1, "__esModule", {
	  value: true
	});
	link$1.default = void 0;
	var _react = _interopRequireDefault(requireReact());
	var _router = requireRouter$1();
	var _router1 = requireRouter();
	var _useIntersection = requireUseIntersection();
	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : {
	    default: obj
	  };
	}
	const prefetched = {};
	function prefetch(router, href, as, options) {
	  if (typeof window === "undefined" || !router) return;
	  if (!(0, _router).isLocalURL(href)) return;
	  router.prefetch(href, as, options).catch((err) => {
	    if (false) {
	      throw err;
	    }
	  });
	  const curLocale = options && typeof options.locale !== "undefined" ? options.locale : router && router.locale;
	  prefetched[href + "%" + as + (curLocale ? "%" + curLocale : "")] = true;
	}
	function isModifiedEvent(event) {
	  const { target } = event.currentTarget;
	  return target && target !== "_self" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.nativeEvent && event.nativeEvent.which === 2;
	}
	function linkClicked(e, router, href, as, replace, shallow, scroll, locale) {
	  const { nodeName } = e.currentTarget;
	  if (nodeName === "A" && (isModifiedEvent(e) || !(0, _router).isLocalURL(href))) {
	    return;
	  }
	  e.preventDefault();
	  if (scroll == null && as.indexOf("#") >= 0) {
	    scroll = false;
	  }
	  router[replace ? "replace" : "push"](href, as, {
	    shallow,
	    locale,
	    scroll
	  });
	}
	function Link(props) {
	  if (false) {
	    let createPropError = function(args) {
	      return new Error(`Failed prop type: The prop \`${args.key}\` expects a ${args.expected} in \`<Link>\`, but got \`${args.actual}\` instead.` + (typeof window !== "undefined" ? "\nOpen your browser's console to view the Component stack trace." : ""));
	    };
	    const requiredPropsGuard = {
	      href: true
	    };
	    const requiredProps = Object.keys(requiredPropsGuard);
	    requiredProps.forEach((key) => {
	      if (key === "href") {
	        if (props[key] == null || typeof props[key] !== "string" && typeof props[key] !== "object") {
	          throw createPropError({
	            key,
	            expected: "`string` or `object`",
	            actual: props[key] === null ? "null" : typeof props[key]
	          });
	        }
	      } else {
	        const _ = key;
	      }
	    });
	    const optionalPropsGuard = {
	      as: true,
	      replace: true,
	      scroll: true,
	      shallow: true,
	      passHref: true,
	      prefetch: true,
	      locale: true
	    };
	    const optionalProps = Object.keys(optionalPropsGuard);
	    optionalProps.forEach((key) => {
	      const valType = typeof props[key];
	      if (key === "as") {
	        if (props[key] && valType !== "string" && valType !== "object") {
	          throw createPropError({
	            key,
	            expected: "`string` or `object`",
	            actual: valType
	          });
	        }
	      } else if (key === "locale") {
	        if (props[key] && valType !== "string") {
	          throw createPropError({
	            key,
	            expected: "`string`",
	            actual: valType
	          });
	        }
	      } else if (key === "replace" || key === "scroll" || key === "shallow" || key === "passHref" || key === "prefetch") {
	        if (props[key] != null && valType !== "boolean") {
	          throw createPropError({
	            key,
	            expected: "`boolean`",
	            actual: valType
	          });
	        }
	      } else {
	        const _ = key;
	      }
	    });
	    const hasWarned = _react.default.useRef(false);
	    if (props.prefetch && !hasWarned.current) {
	      hasWarned.current = true;
	      console.warn("Next.js auto-prefetches automatically based on viewport. The prefetch attribute is no longer needed. More: https://nextjs.org/docs/messages/prefetch-true-deprecated");
	    }
	  }
	  const p = props.prefetch !== false;
	  const router = (0, _router1).useRouter();
	  const { href, as } = _react.default.useMemo(() => {
	    const [resolvedHref, resolvedAs] = (0, _router).resolveHref(router, props.href, true);
	    return {
	      href: resolvedHref,
	      as: props.as ? (0, _router).resolveHref(router, props.as) : resolvedAs || resolvedHref
	    };
	  }, [
	    router,
	    props.href,
	    props.as
	  ]);
	  let { children, replace, shallow, scroll, locale } = props;
	  if (typeof children === "string") {
	    children = /* @__PURE__ */ _react.default.createElement("a", null, children);
	  }
	  let child;
	  if (false) {
	    try {
	      child = _react.default.Children.only(children);
	    } catch (err) {
	      throw new Error(`Multiple children were passed to <Link> with \`href\` of \`${props.href}\` but only one child is supported https://nextjs.org/docs/messages/link-multiple-children` + (typeof window !== "undefined" ? " \nOpen your browser's console to view the Component stack trace." : ""));
	    }
	  } else {
	    child = _react.default.Children.only(children);
	  }
	  const childRef = child && typeof child === "object" && child.ref;
	  const [setIntersectionRef, isVisible] = (0, _useIntersection).useIntersection({
	    rootMargin: "200px"
	  });
	  const setRef = _react.default.useCallback((el) => {
	    setIntersectionRef(el);
	    if (childRef) {
	      if (typeof childRef === "function") childRef(el);
	      else if (typeof childRef === "object") {
	        childRef.current = el;
	      }
	    }
	  }, [
	    childRef,
	    setIntersectionRef
	  ]);
	  _react.default.useEffect(() => {
	    const shouldPrefetch = isVisible && p && (0, _router).isLocalURL(href);
	    const curLocale = typeof locale !== "undefined" ? locale : router && router.locale;
	    const isPrefetched = prefetched[href + "%" + as + (curLocale ? "%" + curLocale : "")];
	    if (shouldPrefetch && !isPrefetched) {
	      prefetch(router, href, as, {
	        locale: curLocale
	      });
	    }
	  }, [
	    as,
	    href,
	    isVisible,
	    locale,
	    p,
	    router
	  ]);
	  const childProps = {
	    ref: setRef,
	    onClick: (e) => {
	      if (child.props && typeof child.props.onClick === "function") {
	        child.props.onClick(e);
	      }
	      if (!e.defaultPrevented) {
	        linkClicked(e, router, href, as, replace, shallow, scroll, locale);
	      }
	    }
	  };
	  childProps.onMouseEnter = (e) => {
	    if (!(0, _router).isLocalURL(href)) return;
	    if (child.props && typeof child.props.onMouseEnter === "function") {
	      child.props.onMouseEnter(e);
	    }
	    prefetch(router, href, as, {
	      priority: true
	    });
	  };
	  if (props.passHref || child.type === "a" && !("href" in child.props)) {
	    const curLocale = typeof locale !== "undefined" ? locale : router && router.locale;
	    const localeDomain = router && router.isLocaleDomain && (0, _router).getDomainLocale(as, curLocale, router && router.locales, router && router.domainLocales);
	    childProps.href = localeDomain || (0, _router).addBasePath((0, _router).addLocale(as, curLocale, router && router.defaultLocale));
	  }
	  return /* @__PURE__ */ _react.default.cloneElement(child, childProps);
	}
	var _default = Link;
	link$1.default = _default;
	return link$1;
}

var link;
var hasRequiredLink;

function requireLink () {
	if (hasRequiredLink) return link;
	hasRequiredLink = 1;
	link = requireLink$1();
	return link;
}

var linkExports = requireLink();
const Link = /*@__PURE__*/getDefaultExportFromCjs(linkExports);

"use strict";
const TextLink = ({
  title,
  link,
  children,
  isExternal,
  newTab,
  ...rest
}) => {
  const linkProps = {
    color: "blue.600"
  };
  const activeAndFocusProps = {
    outline: 0,
    border: "none",
    MozOutlineStyle: "none"
  };
  let newTabProps = {};
  if (newTab) {
    newTabProps = {
      target: "_blank",
      rel: "noopener noreferrer"
    };
  }
  let content = /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { href: link, passHref: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    Link$1,
    {
      _active: activeAndFocusProps,
      _focus: activeAndFocusProps,
      ...linkProps,
      ...newTabProps,
      ...rest,
      children
    }
  ) });
  if (isExternal) {
    content = /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link$1,
      {
        _active: activeAndFocusProps,
        _focus: activeAndFocusProps,
        href: link,
        title,
        isExternal: true,
        ...linkProps,
        ...newTabProps,
        ...rest,
        children
      }
    );
  }
  return content;
};

"use strict";
const Loading = (props) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Center, { ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, { m: "auto" }) });
};

"use strict";
const TextDropdown = ({
  options,
  groupedOptions,
  onOptionSelection,
  handleSubmit,
  containerId,
  dropdownProps,
  selectOptionsWithEnter = false,
  isLoading,
  ...props
}) => {
  const inputRef = React.useRef(null);
  const [dropdown, setDropdown] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState();
  useOutsideClick({
    ref: inputRef,
    handler: () => setDropdown(false)
  });
  const groupedOptionsLengthArray = React.useMemo(() => {
    let array = void 0;
    if (groupedOptions) {
      array = [];
      for (let i = 0; i < Object.values(groupedOptions).length; i++) {
        array.push(Object.values(groupedOptions)[i].length || 0);
      }
    }
    return array;
  }, [groupedOptions]);
  const optionsLength = React.useMemo(() => {
    if (options && options.length > 0) {
      return options.length;
    } else if (groupedOptionsLengthArray) {
      return groupedOptionsLengthArray.reduce((a, b) => a + b);
    } else return 0;
  }, [options, groupedOptionsLengthArray]);
  const handleOptionSelection = React.useCallback(
    (option, extraData) => {
      setDropdown(false);
      onOptionSelection(option, extraData);
    },
    [onOptionSelection]
  );
  const scrollToOption = React.useCallback((index) => {
    if (index !== void 0) {
      const element = document.getElementById(`option-${index - 1}`);
      if (element) element.scrollIntoView();
    }
  }, []);
  const handleKeyDown = (e) => {
    if (optionsLength > 0) {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          let newSelectedIndex = void 0;
          if (selectedIndex === void 0) newSelectedIndex = 0;
          else if (selectedIndex !== optionsLength - 1)
            newSelectedIndex = selectedIndex + 1;
          else newSelectedIndex = optionsLength - 1;
          setSelectedIndex(newSelectedIndex);
          scrollToOption(newSelectedIndex);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (selectedIndex !== void 0) {
            let newIndex = void 0;
            if (selectedIndex !== 0) {
              newIndex = selectedIndex - 1;
            }
            setSelectedIndex(newIndex);
            if (newIndex === void 0) {
              document.getElementById("options-container")?.scrollTo({
                top: 0
              });
            } else scrollToOption(newIndex);
          }
          break;
        }
        case "Enter": {
          if (selectOptionsWithEnter) {
            if (selectedIndex !== void 0) {
              e.preventDefault();
              if (options && options.length > 0) {
                handleOptionSelection(
                  options[selectedIndex],
                  options[selectedIndex].extraData
                );
              } else if (groupedOptionsLengthArray && groupedOptions) {
                let skippedIndices = 0;
                for (let i = 0; i < groupedOptionsLengthArray.length; i++) {
                  if (groupedOptionsLengthArray[i] !== 0 && selectedIndex <= groupedOptionsLengthArray[i] - 1 + skippedIndices) {
                    handleOptionSelection(
                      Object.values(groupedOptions)[i][selectedIndex - skippedIndices],
                      Object.values(groupedOptions)[i][selectedIndex - skippedIndices].extraData
                    );
                    break;
                  } else skippedIndices += groupedOptionsLengthArray[i];
                }
              }
            }
          }
        }
      }
    }
  };
  React.useEffect(() => {
    if (!dropdown) setSelectedIndex(void 0);
  }, [dropdown]);
  React.useEffect(() => {
    setSelectedIndex(void 0);
  }, [options, groupedOptions]);
  const groupedOptionsPopulated = React.useMemo(() => {
    let populated = false;
    if (groupedOptions)
      for (let i = 0; i < Object.values(groupedOptions).length; i++) {
        if (Object.values(groupedOptions)[i] && Object.values(groupedOptions)[i].length > 0)
          populated = true;
      }
    return populated;
  }, [groupedOptions]);
  const dropdownJSX = React.useMemo(() => {
    let rootIndex = 0;
    if (isLoading && (!options || options?.length === 0)) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Box,
        {
          id: "options-container",
          borderRadius: "0 0 0.375rem 0.375rem",
          position: "absolute",
          top: `${(inputRef.current?.getBoundingClientRect().height || 8) / 1.09}px` || "2.25em",
          border: "1px solid",
          borderColor: "inherit",
          borderTop: "none",
          paddingTop: 2,
          zIndex: 9999,
          backgroundColor: "white",
          w: "100%",
          maxH: "25vh",
          minH: "3em",
          overflowY: "scroll",
          ...dropdownProps,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Box,
              {
                h: "1px",
                w: "95%",
                backgroundColor: "gray.400",
                mx: "auto",
                mb: 2
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Loading, { my: "auto" })
          ]
        }
      );
    } else if (dropdown && groupedOptionsPopulated) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Box,
        {
          id: "options-container",
          borderRadius: "0 0 0.375rem 0.375rem",
          position: "absolute",
          top: `${(inputRef.current?.getBoundingClientRect().height || 8) / 1.09}px` || "2.25em",
          border: "1px solid",
          borderColor: "inherit",
          borderTop: "none",
          paddingTop: 2,
          zIndex: 9999,
          backgroundColor: "white",
          w: "100%",
          maxH: "25vh",
          overflowY: "scroll",
          ...dropdownProps,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Box,
              {
                h: "1px",
                w: "95%",
                backgroundColor: "gray.400",
                mx: "auto",
                mb: 2
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { children: Object.values(groupedOptions).map((value, i) => {
              if (value && value.length > 0)
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Heading,
                    {
                      size: "sm",
                      w: "100%",
                      backgroundColor: "gray.300",
                      p: 2,
                      children: Object.keys(groupedOptions)[i].toUpperCase()
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { children: value.map((option) => {
                    const index = rootIndex;
                    rootIndex += 1;
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Box,
                      {
                        id: `option-${index}`,
                        as: "span",
                        cursor: "pointer",
                        onMouseOver: () => {
                          setSelectedIndex(index);
                        },
                        onMouseLeave: () => setSelectedIndex(void 0),
                        padding: 1,
                        paddingLeft: "1rem",
                        onClick: () => {
                          setDropdown(false);
                          handleOptionSelection(option, option.extraData);
                        },
                        fontWeight: index === selectedIndex ? "bold" : "",
                        children: !!option.extraData?.link ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                          TextLink,
                          {
                            link: option.extraData.link || "",
                            color: "black",
                            children: option.label
                          }
                        ) : option.label
                      },
                      index
                    );
                  }) })
                ] }, i);
              else return null;
            }) })
          ]
        }
      );
    } else if (dropdown && options && options.length > 0) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Box,
        {
          id: "options-container",
          borderRadius: "0 0 0.375rem 0.375rem",
          position: "absolute",
          top: `${(inputRef.current?.getBoundingClientRect().height || 8) / 1.09}px` || "2.25em",
          border: "1px solid",
          borderColor: "inherit",
          borderTop: "none",
          paddingTop: 2,
          zIndex: 9999,
          backgroundColor: "white",
          w: "100%",
          maxH: "25vh",
          overflowY: "scroll",
          ...dropdownProps,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Box,
              {
                h: "1px",
                w: "95%",
                backgroundColor: "gray.400",
                mx: "auto",
                mb: 2
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { children: options.map((option, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Box,
              {
                as: "span",
                cursor: "pointer",
                id: `option-${index}`,
                onMouseOver: () => setSelectedIndex(index),
                onMouseLeave: () => setSelectedIndex(void 0),
                padding: 1,
                paddingLeft: "1rem",
                onClick: () => {
                  setDropdown(false);
                  handleOptionSelection(option, option.extraData);
                },
                fontWeight: selectedIndex === index ? "bold" : "",
                children: option.label
              },
              index
            )) })
          ]
        }
      );
    }
  }, [
    dropdown,
    dropdownProps,
    groupedOptions,
    groupedOptionsPopulated,
    handleOptionSelection,
    isLoading,
    options,
    selectedIndex
  ]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: inputRef, style: { position: "relative" }, id: containerId, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "form",
      {
        onSubmit: (e) => {
          e.preventDefault();
          setDropdown(false);
          if (handleSubmit) handleSubmit();
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            onClick: () => setDropdown(true),
            onFocus: () => setDropdown(true),
            onKeyDown: handleKeyDown,
            autoComplete: "off",
            ...props
          }
        )
      }
    ),
    dropdownJSX
  ] });
};

"use strict";
const CompanySearch = ({
  companySelected,
  handleSubmit,
  blacklistedIds,
  onChange,
  ...props
}) => {
  const { data } = useCompaniesQuery();
  const [options, setOptions] = React.useState([]);
  const [searchString, setSearchString] = React.useState("");
  const [searchTimeout, setSearchTimeout] = React.useState();
  const fullOptions = React.useMemo(() => {
    if (data?.companies) {
      return data.companies.map((company) => {
        return {
          label: company.name,
          value: company._id
        };
      });
    } else return [];
  }, [data]);
  const setDefaultOptions = React.useCallback(() => {
    if (data?.companies) {
      setOptions(
        data.companies.map((company) => {
          return {
            label: company.name,
            value: company._id
          };
        })
      );
    }
  }, [data?.companies]);
  const filterOptions = React.useCallback(
    (searchString2) => {
      const fullOptionsCopy = JSON.parse(
        JSON.stringify(fullOptions)
      );
      setOptions(
        fullOptionsCopy.filter(
          (option) => option.label.toLowerCase().match(searchString2.toLowerCase())
        )
      );
    },
    [fullOptions]
  );
  const handleChange = React.useCallback(
    (value) => {
      setSearchString(value);
      if (searchTimeout) clearTimeout(searchTimeout);
      if (value !== "") {
        setSearchTimeout(
          setTimeout(() => {
            filterOptions(value);
          }, 500)
        );
      } else setDefaultOptions();
    },
    [filterOptions, searchTimeout, setDefaultOptions]
  );
  React.useEffect(() => {
    if (data?.companies) {
      setDefaultOptions();
    }
  }, [data]);
  React.useEffect(() => {
    if (props.value && isObjectId(props.value.toString())) {
      const option = fullOptions.find((option2) => option2.value === props.value);
      if (option) {
        setSearchString(option.label);
        companySelected({
          _id: option.value,
          name: option.label
        });
      }
    }
  }, [fullOptions]);
  React.useEffect(() => {
    if (props.value && !isObjectId(props.value.toString())) {
      setSearchString(props.value.toString());
    }
  }, [props.value]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    TextDropdown,
    {
      options,
      placeholder: "Search Companies",
      onOptionSelection: (value) => {
        setSearchString(value.label);
        companySelected({
          _id: value.value,
          name: value.label
        });
        setDefaultOptions();
      },
      handleSubmit: () => {
        if (handleSubmit) handleSubmit(searchString);
      },
      autoComplete: "off",
      selectOptionsWithEnter: true,
      ...props,
      onChange: (e) => {
        if (onChange) onChange(e);
        handleChange(e.target.value);
      },
      value: searchString
    }
  );
};

"use strict";
const convertHourToDate = (time, date) => {
  if (dayjs(time).isValid()) {
    let year = dayjs(date).get("year");
    let month = dayjs(date).get("month");
    let dateOfMonth = dayjs(date).date();
    let hour = dayjs(time).get("hour");
    let minute = dayjs(time).get("minute");
    return dayjs(date).set("year", year).set("month", month).set("date", dateOfMonth).set("hour", hour).set("minute", minute).toISOString();
  } else {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!regex.test(time)) {
      throw new Error(`Invalid time format: ${time}. Expected HH:mm format.`);
    }
    let [hour, minute] = time.split(":").map(Number);
    return dayjs(date).set("hour", hour).set("minute", minute).toISOString();
  }
};

"use strict";
const jobsiteMaterialName = (jobsiteMaterial) => {
  let subText = "";
  if (jobsiteMaterial.costType === JobsiteMaterialCostType.DeliveredRate) {
    subText = " (Delivered)";
  } else if (jobsiteMaterial.costType === JobsiteMaterialCostType.Invoice && jobsiteMaterial.delivered === true) {
    subText = " (Delivered)";
  }
  return `${jobsiteMaterial.material.name} - ${jobsiteMaterial.supplier.name}${subText}`;
};

"use strict";
const NumberForm = ({
  stepper = true,
  allowMouseWheel = true,
  min = 0,
  format,
  parse,
  onChange,
  value,
  label,
  errorMessage,
  helperText,
  inputLeftAddon,
  inputLeftElement,
  inputRightAddon,
  inputRightElement,
  inputRightElementProps,
  ...props
}) => {
  const [numberString, setNumberString] = React.useState(value);
  const stepperJSX = React.useMemo(() => {
    if (stepper) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(NumberInputStepper, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(NumberIncrementStepper, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NumberDecrementStepper, {})
      ] });
    } else return null;
  }, [stepper]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { isInvalid: !!errorMessage, margin: "auto", children: [
    label && /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { fontWeight: "bold", mb: 0, mt: 1, ml: 1, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
      inputLeftElement && /* @__PURE__ */ jsxRuntimeExports.jsx(InputLeftElement, { h: "auto", children: inputLeftElement }),
      inputLeftAddon && /* @__PURE__ */ jsxRuntimeExports.jsx(InputLeftAddon, { size: "sm", children: inputLeftAddon }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        NumberInput,
        {
          ...props,
          allowMouseWheel,
          min,
          w: "100%",
          value: format ? format(numberString?.toString()) : numberString?.toString(),
          onInvalid: () => {
            return;
          },
          onChange: (val, num) => {
            setNumberString(val);
            if (onChange)
              if (parse) onChange(parse(val), num);
              else onChange(val, num);
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(NumberInputField, { backgroundColor: "white" }),
            stepperJSX
          ]
        }
      ),
      inputRightElement && /* @__PURE__ */ jsxRuntimeExports.jsx(InputRightElement, { ...inputRightElementProps, children: inputRightElement }),
      inputRightAddon && /* @__PURE__ */ jsxRuntimeExports.jsx(InputRightAddon, { children: inputRightAddon })
    ] }),
    errorMessage && /* @__PURE__ */ jsxRuntimeExports.jsx(FormErrorMessage, { children: errorMessage }),
    helperText && /* @__PURE__ */ jsxRuntimeExports.jsx(FormHelperText, { children: helperText })
  ] });
};

function n(n2) {
  for (var r2 = arguments.length, t2 = Array(r2 > 1 ? r2 - 1 : 0), e2 = 1; e2 < r2; e2++) t2[e2 - 1] = arguments[e2];
  if (false) {
    var i2 = Y[n2], o2 = i2 ? "function" == typeof i2 ? i2.apply(null, t2) : i2 : "unknown error nr: " + n2;
    throw Error("[Immer] " + o2);
  }
  throw Error("[Immer] minified error nr: " + n2 + (t2.length ? " " + t2.map((function(n3) {
    return "'" + n3 + "'";
  })).join(",") : "") + ". Find the full error at: https://bit.ly/3cXEKWf");
}
function r(n2) {
  return !!n2 && !!n2[Q];
}
function t(n2) {
  var r2;
  return !!n2 && ((function(n3) {
    if (!n3 || "object" != typeof n3) return false;
    var r3 = Object.getPrototypeOf(n3);
    if (null === r3) return true;
    var t2 = Object.hasOwnProperty.call(r3, "constructor") && r3.constructor;
    return t2 === Object || "function" == typeof t2 && Function.toString.call(t2) === Z;
  })(n2) || Array.isArray(n2) || !!n2[L] || !!(null === (r2 = n2.constructor) || void 0 === r2 ? void 0 : r2[L]) || s(n2) || v(n2));
}
function e$1(t2) {
  return r(t2) || n(23, t2), t2[Q].t;
}
function i$1(n2, r2, t2) {
  void 0 === t2 && (t2 = false), 0 === o(n2) ? (t2 ? Object.keys : nn)(n2).forEach((function(e2) {
    t2 && "symbol" == typeof e2 || r2(e2, n2[e2], n2);
  })) : n2.forEach((function(t3, e2) {
    return r2(e2, t3, n2);
  }));
}
function o(n2) {
  var r2 = n2[Q];
  return r2 ? r2.i > 3 ? r2.i - 4 : r2.i : Array.isArray(n2) ? 1 : s(n2) ? 2 : v(n2) ? 3 : 0;
}
function u(n2, r2) {
  return 2 === o(n2) ? n2.has(r2) : Object.prototype.hasOwnProperty.call(n2, r2);
}
function a(n2, r2) {
  return 2 === o(n2) ? n2.get(r2) : n2[r2];
}
function f(n2, r2, t2) {
  var e2 = o(n2);
  2 === e2 ? n2.set(r2, t2) : 3 === e2 ? n2.add(t2) : n2[r2] = t2;
}
function c(n2, r2) {
  return n2 === r2 ? 0 !== n2 || 1 / n2 == 1 / r2 : n2 != n2 && r2 != r2;
}
function s(n2) {
  return X && n2 instanceof Map;
}
function v(n2) {
  return q && n2 instanceof Set;
}
function p(n2) {
  return n2.o || n2.t;
}
function l(n2) {
  if (Array.isArray(n2)) return Array.prototype.slice.call(n2);
  var r2 = rn(n2);
  delete r2[Q];
  for (var t2 = nn(r2), e2 = 0; e2 < t2.length; e2++) {
    var i2 = t2[e2], o2 = r2[i2];
    false === o2.writable && (o2.writable = true, o2.configurable = true), (o2.get || o2.set) && (r2[i2] = { configurable: true, writable: true, enumerable: o2.enumerable, value: n2[i2] });
  }
  return Object.create(Object.getPrototypeOf(n2), r2);
}
function d(n2, e2) {
  return void 0 === e2 && (e2 = false), y(n2) || r(n2) || !t(n2) || (o(n2) > 1 && (n2.set = n2.add = n2.clear = n2.delete = h), Object.freeze(n2), e2 && i$1(n2, (function(n3, r2) {
    return d(r2, true);
  }), true)), n2;
}
function h() {
  n(2);
}
function y(n2) {
  return null == n2 || "object" != typeof n2 || Object.isFrozen(n2);
}
function b(r2) {
  var t2 = tn[r2];
  return t2 || n(18, r2), t2;
}
function m(n2, r2) {
  tn[n2] || (tn[n2] = r2);
}
function _() {
  return true, U;
}
function j(n2, r2) {
  r2 && (b("Patches"), n2.u = [], n2.s = [], n2.v = r2);
}
function g(n2) {
  O(n2), n2.p.forEach(S), n2.p = null;
}
function O(n2) {
  n2 === U && (U = n2.l);
}
function w(n2) {
  return U = { p: [], l: U, h: n2, m: true, _: 0 };
}
function S(n2) {
  var r2 = n2[Q];
  0 === r2.i || 1 === r2.i ? r2.j() : r2.g = true;
}
function P(r2, e2) {
  e2._ = e2.p.length;
  var i2 = e2.p[0], o2 = void 0 !== r2 && r2 !== i2;
  return e2.h.O || b("ES5").S(e2, r2, o2), o2 ? (i2[Q].P && (g(e2), n(4)), t(r2) && (r2 = M(e2, r2), e2.l || x(e2, r2)), e2.u && b("Patches").M(i2[Q].t, r2, e2.u, e2.s)) : r2 = M(e2, i2, []), g(e2), e2.u && e2.v(e2.u, e2.s), r2 !== H ? r2 : void 0;
}
function M(n2, r2, t2) {
  if (y(r2)) return r2;
  var e2 = r2[Q];
  if (!e2) return i$1(r2, (function(i2, o3) {
    return A(n2, e2, r2, i2, o3, t2);
  }), true), r2;
  if (e2.A !== n2) return r2;
  if (!e2.P) return x(n2, e2.t, true), e2.t;
  if (!e2.I) {
    e2.I = true, e2.A._--;
    var o2 = 4 === e2.i || 5 === e2.i ? e2.o = l(e2.k) : e2.o, u2 = o2, a2 = false;
    3 === e2.i && (u2 = new Set(o2), o2.clear(), a2 = true), i$1(u2, (function(r3, i2) {
      return A(n2, e2, o2, r3, i2, t2, a2);
    })), x(n2, o2, false), t2 && n2.u && b("Patches").N(e2, t2, n2.u, n2.s);
  }
  return e2.o;
}
function A(e2, i2, o2, a2, c2, s2, v2) {
  if (false, r(c2)) {
    var p2 = M(e2, c2, s2 && i2 && 3 !== i2.i && !u(i2.R, a2) ? s2.concat(a2) : void 0);
    if (f(o2, a2, p2), !r(p2)) return;
    e2.m = false;
  } else v2 && o2.add(c2);
  if (t(c2) && !y(c2)) {
    if (!e2.h.D && e2._ < 1) return;
    M(e2, c2), i2 && i2.A.l || x(e2, c2);
  }
}
function x(n2, r2, t2) {
  void 0 === t2 && (t2 = false), !n2.l && n2.h.D && n2.m && d(r2, t2);
}
function z(n2, r2) {
  var t2 = n2[Q];
  return (t2 ? p(t2) : n2)[r2];
}
function I(n2, r2) {
  if (r2 in n2) for (var t2 = Object.getPrototypeOf(n2); t2; ) {
    var e2 = Object.getOwnPropertyDescriptor(t2, r2);
    if (e2) return e2;
    t2 = Object.getPrototypeOf(t2);
  }
}
function k(n2) {
  n2.P || (n2.P = true, n2.l && k(n2.l));
}
function E(n2) {
  n2.o || (n2.o = l(n2.t));
}
function N(n2, r2, t2) {
  var e2 = s(r2) ? b("MapSet").F(r2, t2) : v(r2) ? b("MapSet").T(r2, t2) : n2.O ? (function(n3, r3) {
    var t3 = Array.isArray(n3), e3 = { i: t3 ? 1 : 0, A: r3 ? r3.A : _(), P: false, I: false, R: {}, l: r3, t: n3, k: null, o: null, j: null, C: false }, i2 = e3, o2 = en;
    t3 && (i2 = [e3], o2 = on);
    var u2 = Proxy.revocable(i2, o2), a2 = u2.revoke, f2 = u2.proxy;
    return e3.k = f2, e3.j = a2, f2;
  })(r2, t2) : b("ES5").J(r2, t2);
  return (t2 ? t2.A : _()).p.push(e2), e2;
}
function R(e2) {
  return r(e2) || n(22, e2), (function n2(r2) {
    if (!t(r2)) return r2;
    var e3, u2 = r2[Q], c2 = o(r2);
    if (u2) {
      if (!u2.P && (u2.i < 4 || !b("ES5").K(u2))) return u2.t;
      u2.I = true, e3 = D(r2, c2), u2.I = false;
    } else e3 = D(r2, c2);
    return i$1(e3, (function(r3, t2) {
      u2 && a(u2.t, r3) === t2 || f(e3, r3, n2(t2));
    })), 3 === c2 ? new Set(e3) : e3;
  })(e2);
}
function D(n2, r2) {
  switch (r2) {
    case 2:
      return new Map(n2);
    case 3:
      return Array.from(n2);
  }
  return l(n2);
}
function F() {
  function t2(n2, r2) {
    var t3 = s2[n2];
    return t3 ? t3.enumerable = r2 : s2[n2] = t3 = { configurable: true, enumerable: r2, get: function() {
      var r3 = this[Q];
      return false, en.get(r3, n2);
    }, set: function(r3) {
      var t4 = this[Q];
      false, en.set(t4, n2, r3);
    } }, t3;
  }
  function e2(n2) {
    for (var r2 = n2.length - 1; r2 >= 0; r2--) {
      var t3 = n2[r2][Q];
      if (!t3.P) switch (t3.i) {
        case 5:
          a2(t3) && k(t3);
          break;
        case 4:
          o2(t3) && k(t3);
      }
    }
  }
  function o2(n2) {
    for (var r2 = n2.t, t3 = n2.k, e3 = nn(t3), i2 = e3.length - 1; i2 >= 0; i2--) {
      var o3 = e3[i2];
      if (o3 !== Q) {
        var a3 = r2[o3];
        if (void 0 === a3 && !u(r2, o3)) return true;
        var f3 = t3[o3], s3 = f3 && f3[Q];
        if (s3 ? s3.t !== a3 : !c(f3, a3)) return true;
      }
    }
    var v2 = !!r2[Q];
    return e3.length !== nn(r2).length + (v2 ? 0 : 1);
  }
  function a2(n2) {
    var r2 = n2.k;
    if (r2.length !== n2.t.length) return true;
    var t3 = Object.getOwnPropertyDescriptor(r2, r2.length - 1);
    if (t3 && !t3.get) return true;
    for (var e3 = 0; e3 < r2.length; e3++) if (!r2.hasOwnProperty(e3)) return true;
    return false;
  }
  function f2(r2) {
    r2.g && n(3, JSON.stringify(p(r2)));
  }
  var s2 = {};
  m("ES5", { J: function(n2, r2) {
    var e3 = Array.isArray(n2), i2 = (function(n3, r3) {
      if (n3) {
        for (var e4 = Array(r3.length), i3 = 0; i3 < r3.length; i3++) Object.defineProperty(e4, "" + i3, t2(i3, true));
        return e4;
      }
      var o4 = rn(r3);
      delete o4[Q];
      for (var u2 = nn(o4), a3 = 0; a3 < u2.length; a3++) {
        var f3 = u2[a3];
        o4[f3] = t2(f3, n3 || !!o4[f3].enumerable);
      }
      return Object.create(Object.getPrototypeOf(r3), o4);
    })(e3, n2), o3 = { i: e3 ? 5 : 4, A: r2 ? r2.A : _(), P: false, I: false, R: {}, l: r2, t: n2, k: i2, o: null, g: false, C: false };
    return Object.defineProperty(i2, Q, { value: o3, writable: true }), i2;
  }, S: function(n2, t3, o3) {
    o3 ? r(t3) && t3[Q].A === n2 && e2(n2.p) : (n2.u && (function n3(r2) {
      if (r2 && "object" == typeof r2) {
        var t4 = r2[Q];
        if (t4) {
          var e3 = t4.t, o4 = t4.k, f3 = t4.R, c2 = t4.i;
          if (4 === c2) i$1(o4, (function(r3) {
            r3 !== Q && (void 0 !== e3[r3] || u(e3, r3) ? f3[r3] || n3(o4[r3]) : (f3[r3] = true, k(t4)));
          })), i$1(e3, (function(n4) {
            void 0 !== o4[n4] || u(o4, n4) || (f3[n4] = false, k(t4));
          }));
          else if (5 === c2) {
            if (a2(t4) && (k(t4), f3.length = true), o4.length < e3.length) for (var s3 = o4.length; s3 < e3.length; s3++) f3[s3] = false;
            else for (var v2 = e3.length; v2 < o4.length; v2++) f3[v2] = true;
            for (var p2 = Math.min(o4.length, e3.length), l2 = 0; l2 < p2; l2++) o4.hasOwnProperty(l2) || (f3[l2] = true), void 0 === f3[l2] && n3(o4[l2]);
          }
        }
      }
    })(n2.p[0]), e2(n2.p));
  }, K: function(n2) {
    return 4 === n2.i ? o2(n2) : a2(n2);
  } });
}
function T() {
  function e2(n2) {
    if (!t(n2)) return n2;
    if (Array.isArray(n2)) return n2.map(e2);
    if (s(n2)) return new Map(Array.from(n2.entries()).map((function(n3) {
      return [n3[0], e2(n3[1])];
    })));
    if (v(n2)) return new Set(Array.from(n2).map(e2));
    var r2 = Object.create(Object.getPrototypeOf(n2));
    for (var i2 in n2) r2[i2] = e2(n2[i2]);
    return u(n2, L) && (r2[L] = n2[L]), r2;
  }
  function f2(n2) {
    return r(n2) ? e2(n2) : n2;
  }
  var c2 = "add";
  m("Patches", { $: function(r2, t2) {
    return t2.forEach((function(t3) {
      for (var i2 = t3.path, u2 = t3.op, f3 = r2, s2 = 0; s2 < i2.length - 1; s2++) {
        var v2 = o(f3), p2 = i2[s2];
        "string" != typeof p2 && "number" != typeof p2 && (p2 = "" + p2), 0 !== v2 && 1 !== v2 || "__proto__" !== p2 && "constructor" !== p2 || n(24), "function" == typeof f3 && "prototype" === p2 && n(24), "object" != typeof (f3 = a(f3, p2)) && n(15, i2.join("/"));
      }
      var l2 = o(f3), d2 = e2(t3.value), h2 = i2[i2.length - 1];
      switch (u2) {
        case "replace":
          switch (l2) {
            case 2:
              return f3.set(h2, d2);
            case 3:
              n(16);
            default:
              return f3[h2] = d2;
          }
        case c2:
          switch (l2) {
            case 1:
              return "-" === h2 ? f3.push(d2) : f3.splice(h2, 0, d2);
            case 2:
              return f3.set(h2, d2);
            case 3:
              return f3.add(d2);
            default:
              return f3[h2] = d2;
          }
        case "remove":
          switch (l2) {
            case 1:
              return f3.splice(h2, 1);
            case 2:
              return f3.delete(h2);
            case 3:
              return f3.delete(t3.value);
            default:
              return delete f3[h2];
          }
        default:
          n(17, u2);
      }
    })), r2;
  }, N: function(n2, r2, t2, e3) {
    switch (n2.i) {
      case 0:
      case 4:
      case 2:
        return (function(n3, r3, t3, e4) {
          var o2 = n3.t, s2 = n3.o;
          i$1(n3.R, (function(n4, i2) {
            var v2 = a(o2, n4), p2 = a(s2, n4), l2 = i2 ? u(o2, n4) ? "replace" : c2 : "remove";
            if (v2 !== p2 || "replace" !== l2) {
              var d2 = r3.concat(n4);
              t3.push("remove" === l2 ? { op: l2, path: d2 } : { op: l2, path: d2, value: p2 }), e4.push(l2 === c2 ? { op: "remove", path: d2 } : "remove" === l2 ? { op: c2, path: d2, value: f2(v2) } : { op: "replace", path: d2, value: f2(v2) });
            }
          }));
        })(n2, r2, t2, e3);
      case 5:
      case 1:
        return (function(n3, r3, t3, e4) {
          var i2 = n3.t, o2 = n3.R, u2 = n3.o;
          if (u2.length < i2.length) {
            var a2 = [u2, i2];
            i2 = a2[0], u2 = a2[1];
            var s2 = [e4, t3];
            t3 = s2[0], e4 = s2[1];
          }
          for (var v2 = 0; v2 < i2.length; v2++) if (o2[v2] && u2[v2] !== i2[v2]) {
            var p2 = r3.concat([v2]);
            t3.push({ op: "replace", path: p2, value: f2(u2[v2]) }), e4.push({ op: "replace", path: p2, value: f2(i2[v2]) });
          }
          for (var l2 = i2.length; l2 < u2.length; l2++) {
            var d2 = r3.concat([l2]);
            t3.push({ op: c2, path: d2, value: f2(u2[l2]) });
          }
          i2.length < u2.length && e4.push({ op: "replace", path: r3.concat(["length"]), value: i2.length });
        })(n2, r2, t2, e3);
      case 3:
        return (function(n3, r3, t3, e4) {
          var i2 = n3.t, o2 = n3.o, u2 = 0;
          i2.forEach((function(n4) {
            if (!o2.has(n4)) {
              var i3 = r3.concat([u2]);
              t3.push({ op: "remove", path: i3, value: n4 }), e4.unshift({ op: c2, path: i3, value: n4 });
            }
            u2++;
          })), u2 = 0, o2.forEach((function(n4) {
            if (!i2.has(n4)) {
              var o3 = r3.concat([u2]);
              t3.push({ op: c2, path: o3, value: n4 }), e4.unshift({ op: "remove", path: o3, value: n4 });
            }
            u2++;
          }));
        })(n2, r2, t2, e3);
    }
  }, M: function(n2, r2, t2, e3) {
    t2.push({ op: "replace", path: [], value: r2 === H ? void 0 : r2 }), e3.push({ op: "replace", path: [], value: n2 });
  } });
}
function C() {
  function r2(n2, r3) {
    function t2() {
      this.constructor = n2;
    }
    a2(n2, r3), n2.prototype = (t2.prototype = r3.prototype, new t2());
  }
  function e2(n2) {
    n2.o || (n2.R = /* @__PURE__ */ new Map(), n2.o = new Map(n2.t));
  }
  function o2(n2) {
    n2.o || (n2.o = /* @__PURE__ */ new Set(), n2.t.forEach((function(r3) {
      if (t(r3)) {
        var e3 = N(n2.A.h, r3, n2);
        n2.p.set(r3, e3), n2.o.add(e3);
      } else n2.o.add(r3);
    })));
  }
  function u2(r3) {
    r3.g && n(3, JSON.stringify(p(r3)));
  }
  var a2 = function(n2, r3) {
    return (a2 = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(n3, r4) {
      n3.__proto__ = r4;
    } || function(n3, r4) {
      for (var t2 in r4) r4.hasOwnProperty(t2) && (n3[t2] = r4[t2]);
    })(n2, r3);
  }, f2 = (function() {
    function n2(n3, r3) {
      return this[Q] = { i: 2, l: r3, A: r3 ? r3.A : _(), P: false, I: false, o: void 0, R: void 0, t: n3, k: this, C: false, g: false }, this;
    }
    r2(n2, Map);
    var o3 = n2.prototype;
    return Object.defineProperty(o3, "size", { get: function() {
      return p(this[Q]).size;
    } }), o3.has = function(n3) {
      return p(this[Q]).has(n3);
    }, o3.set = function(n3, r3) {
      var t2 = this[Q];
      return u2(t2), p(t2).has(n3) && p(t2).get(n3) === r3 || (e2(t2), k(t2), t2.R.set(n3, true), t2.o.set(n3, r3), t2.R.set(n3, true)), this;
    }, o3.delete = function(n3) {
      if (!this.has(n3)) return false;
      var r3 = this[Q];
      return u2(r3), e2(r3), k(r3), r3.t.has(n3) ? r3.R.set(n3, false) : r3.R.delete(n3), r3.o.delete(n3), true;
    }, o3.clear = function() {
      var n3 = this[Q];
      u2(n3), p(n3).size && (e2(n3), k(n3), n3.R = /* @__PURE__ */ new Map(), i$1(n3.t, (function(r3) {
        n3.R.set(r3, false);
      })), n3.o.clear());
    }, o3.forEach = function(n3, r3) {
      var t2 = this;
      p(this[Q]).forEach((function(e3, i2) {
        n3.call(r3, t2.get(i2), i2, t2);
      }));
    }, o3.get = function(n3) {
      var r3 = this[Q];
      u2(r3);
      var i2 = p(r3).get(n3);
      if (r3.I || !t(i2)) return i2;
      if (i2 !== r3.t.get(n3)) return i2;
      var o4 = N(r3.A.h, i2, r3);
      return e2(r3), r3.o.set(n3, o4), o4;
    }, o3.keys = function() {
      return p(this[Q]).keys();
    }, o3.values = function() {
      var n3, r3 = this, t2 = this.keys();
      return (n3 = {})[V] = function() {
        return r3.values();
      }, n3.next = function() {
        var n4 = t2.next();
        return n4.done ? n4 : { done: false, value: r3.get(n4.value) };
      }, n3;
    }, o3.entries = function() {
      var n3, r3 = this, t2 = this.keys();
      return (n3 = {})[V] = function() {
        return r3.entries();
      }, n3.next = function() {
        var n4 = t2.next();
        if (n4.done) return n4;
        var e3 = r3.get(n4.value);
        return { done: false, value: [n4.value, e3] };
      }, n3;
    }, o3[V] = function() {
      return this.entries();
    }, n2;
  })(), c2 = (function() {
    function n2(n3, r3) {
      return this[Q] = { i: 3, l: r3, A: r3 ? r3.A : _(), P: false, I: false, o: void 0, t: n3, k: this, p: /* @__PURE__ */ new Map(), g: false, C: false }, this;
    }
    r2(n2, Set);
    var t2 = n2.prototype;
    return Object.defineProperty(t2, "size", { get: function() {
      return p(this[Q]).size;
    } }), t2.has = function(n3) {
      var r3 = this[Q];
      return u2(r3), r3.o ? !!r3.o.has(n3) || !(!r3.p.has(n3) || !r3.o.has(r3.p.get(n3))) : r3.t.has(n3);
    }, t2.add = function(n3) {
      var r3 = this[Q];
      return u2(r3), this.has(n3) || (o2(r3), k(r3), r3.o.add(n3)), this;
    }, t2.delete = function(n3) {
      if (!this.has(n3)) return false;
      var r3 = this[Q];
      return u2(r3), o2(r3), k(r3), r3.o.delete(n3) || !!r3.p.has(n3) && r3.o.delete(r3.p.get(n3));
    }, t2.clear = function() {
      var n3 = this[Q];
      u2(n3), p(n3).size && (o2(n3), k(n3), n3.o.clear());
    }, t2.values = function() {
      var n3 = this[Q];
      return u2(n3), o2(n3), n3.o.values();
    }, t2.entries = function() {
      var n3 = this[Q];
      return u2(n3), o2(n3), n3.o.entries();
    }, t2.keys = function() {
      return this.values();
    }, t2[V] = function() {
      return this.values();
    }, t2.forEach = function(n3, r3) {
      for (var t3 = this.values(), e3 = t3.next(); !e3.done; ) n3.call(r3, e3.value, e3.value, this), e3 = t3.next();
    }, n2;
  })();
  m("MapSet", { F: function(n2, r3) {
    return new f2(n2, r3);
  }, T: function(n2, r3) {
    return new c2(n2, r3);
  } });
}
function J() {
  F(), C(), T();
}
function K(n2) {
  return n2;
}
function $(n2) {
  return n2;
}
var G, U, W = "undefined" != typeof Symbol && "symbol" == typeof Symbol("x"), X = "undefined" != typeof Map, q = "undefined" != typeof Set, B = "undefined" != typeof Proxy && void 0 !== Proxy.revocable && "undefined" != typeof Reflect, H = W ? Symbol.for("immer-nothing") : ((G = {})["immer-nothing"] = true, G), L = W ? Symbol.for("immer-draftable") : "__$immer_draftable", Q = W ? Symbol.for("immer-state") : "__$immer_state", V = "undefined" != typeof Symbol && Symbol.iterator || "@@iterator", Y = { 0: "Illegal state", 1: "Immer drafts cannot have computed properties", 2: "This object has been frozen and should not be mutated", 3: function(n2) {
  return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + n2;
}, 4: "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.", 5: "Immer forbids circular references", 6: "The first or second argument to `produce` must be a function", 7: "The third argument to `produce` must be a function or undefined", 8: "First argument to `createDraft` must be a plain object, an array, or an immerable object", 9: "First argument to `finishDraft` must be a draft returned by `createDraft`", 10: "The given draft is already finalized", 11: "Object.defineProperty() cannot be used on an Immer draft", 12: "Object.setPrototypeOf() cannot be used on an Immer draft", 13: "Immer only supports deleting array indices", 14: "Immer only supports setting array indices and the 'length' property", 15: function(n2) {
  return "Cannot apply patch, path doesn't resolve: " + n2;
}, 16: 'Sets cannot have "replace" patches.', 17: function(n2) {
  return "Unsupported patch operation: " + n2;
}, 18: function(n2) {
  return "The plugin for '" + n2 + "' has not been loaded into Immer. To enable the plugin, import and call `enable" + n2 + "()` when initializing your application.";
}, 20: "Cannot use proxies if Proxy, Proxy.revocable or Reflect are not available", 21: function(n2) {
  return "produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '" + n2 + "'";
}, 22: function(n2) {
  return "'current' expects a draft, got: " + n2;
}, 23: function(n2) {
  return "'original' expects a draft, got: " + n2;
}, 24: "Patching reserved attributes like __proto__, prototype and constructor is not allowed" }, Z = "" + Object.prototype.constructor, nn = "undefined" != typeof Reflect && Reflect.ownKeys ? Reflect.ownKeys : void 0 !== Object.getOwnPropertySymbols ? function(n2) {
  return Object.getOwnPropertyNames(n2).concat(Object.getOwnPropertySymbols(n2));
} : Object.getOwnPropertyNames, rn = Object.getOwnPropertyDescriptors || function(n2) {
  var r2 = {};
  return nn(n2).forEach((function(t2) {
    r2[t2] = Object.getOwnPropertyDescriptor(n2, t2);
  })), r2;
}, tn = {}, en = { get: function(n2, r2) {
  if (r2 === Q) return n2;
  var e2 = p(n2);
  if (!u(e2, r2)) return (function(n3, r3, t2) {
    var e3, i3 = I(r3, t2);
    return i3 ? "value" in i3 ? i3.value : null === (e3 = i3.get) || void 0 === e3 ? void 0 : e3.call(n3.k) : void 0;
  })(n2, e2, r2);
  var i2 = e2[r2];
  return n2.I || !t(i2) ? i2 : i2 === z(n2.t, r2) ? (E(n2), n2.o[r2] = N(n2.A.h, i2, n2)) : i2;
}, has: function(n2, r2) {
  return r2 in p(n2);
}, ownKeys: function(n2) {
  return Reflect.ownKeys(p(n2));
}, set: function(n2, r2, t2) {
  var e2 = I(p(n2), r2);
  if (null == e2 ? void 0 : e2.set) return e2.set.call(n2.k, t2), true;
  if (!n2.P) {
    var i2 = z(p(n2), r2), o2 = null == i2 ? void 0 : i2[Q];
    if (o2 && o2.t === t2) return n2.o[r2] = t2, n2.R[r2] = false, true;
    if (c(t2, i2) && (void 0 !== t2 || u(n2.t, r2))) return true;
    E(n2), k(n2);
  }
  return n2.o[r2] === t2 && (void 0 !== t2 || r2 in n2.o) || Number.isNaN(t2) && Number.isNaN(n2.o[r2]) || (n2.o[r2] = t2, n2.R[r2] = true), true;
}, deleteProperty: function(n2, r2) {
  return void 0 !== z(n2.t, r2) || r2 in n2.t ? (n2.R[r2] = false, E(n2), k(n2)) : delete n2.R[r2], n2.o && delete n2.o[r2], true;
}, getOwnPropertyDescriptor: function(n2, r2) {
  var t2 = p(n2), e2 = Reflect.getOwnPropertyDescriptor(t2, r2);
  return e2 ? { writable: true, configurable: 1 !== n2.i || "length" !== r2, enumerable: e2.enumerable, value: t2[r2] } : e2;
}, defineProperty: function() {
  n(11);
}, getPrototypeOf: function(n2) {
  return Object.getPrototypeOf(n2.t);
}, setPrototypeOf: function() {
  n(12);
} }, on = {};
i$1(en, (function(n2, r2) {
  on[n2] = function() {
    return arguments[0] = arguments[0][0], r2.apply(this, arguments);
  };
})), on.deleteProperty = function(r2, t2) {
  return false, on.set.call(this, r2, t2, void 0);
}, on.set = function(r2, t2, e2) {
  return false, en.set.call(this, r2[0], t2, e2, r2[0]);
};
var un = (function() {
  function e2(r2) {
    var e3 = this;
    this.O = B, this.D = true, this.produce = function(r3, i3, o2) {
      if ("function" == typeof r3 && "function" != typeof i3) {
        var u2 = i3;
        i3 = r3;
        var a2 = e3;
        return function(n2) {
          var r4 = this;
          void 0 === n2 && (n2 = u2);
          for (var t2 = arguments.length, e4 = Array(t2 > 1 ? t2 - 1 : 0), o3 = 1; o3 < t2; o3++) e4[o3 - 1] = arguments[o3];
          return a2.produce(n2, (function(n3) {
            var t3;
            return (t3 = i3).call.apply(t3, [r4, n3].concat(e4));
          }));
        };
      }
      var f2;
      if ("function" != typeof i3 && n(6), void 0 !== o2 && "function" != typeof o2 && n(7), t(r3)) {
        var c2 = w(e3), s2 = N(e3, r3, void 0), v2 = true;
        try {
          f2 = i3(s2), v2 = false;
        } finally {
          v2 ? g(c2) : O(c2);
        }
        return "undefined" != typeof Promise && f2 instanceof Promise ? f2.then((function(n2) {
          return j(c2, o2), P(n2, c2);
        }), (function(n2) {
          throw g(c2), n2;
        })) : (j(c2, o2), P(f2, c2));
      }
      if (!r3 || "object" != typeof r3) {
        if (void 0 === (f2 = i3(r3)) && (f2 = r3), f2 === H && (f2 = void 0), e3.D && d(f2, true), o2) {
          var p2 = [], l2 = [];
          b("Patches").M(r3, f2, p2, l2), o2(p2, l2);
        }
        return f2;
      }
      n(21, r3);
    }, this.produceWithPatches = function(n2, r3) {
      if ("function" == typeof n2) return function(r4) {
        for (var t3 = arguments.length, i4 = Array(t3 > 1 ? t3 - 1 : 0), o3 = 1; o3 < t3; o3++) i4[o3 - 1] = arguments[o3];
        return e3.produceWithPatches(r4, (function(r5) {
          return n2.apply(void 0, [r5].concat(i4));
        }));
      };
      var t2, i3, o2 = e3.produce(n2, r3, (function(n3, r4) {
        t2 = n3, i3 = r4;
      }));
      return "undefined" != typeof Promise && o2 instanceof Promise ? o2.then((function(n3) {
        return [n3, t2, i3];
      })) : [o2, t2, i3];
    }, "boolean" == typeof (null == r2 ? void 0 : r2.useProxies) && this.setUseProxies(r2.useProxies), "boolean" == typeof (null == r2 ? void 0 : r2.autoFreeze) && this.setAutoFreeze(r2.autoFreeze);
  }
  var i2 = e2.prototype;
  return i2.createDraft = function(e3) {
    t(e3) || n(8), r(e3) && (e3 = R(e3));
    var i3 = w(this), o2 = N(this, e3, void 0);
    return o2[Q].C = true, O(i3), o2;
  }, i2.finishDraft = function(r2, t2) {
    var e3 = r2 && r2[Q];
    var i3 = e3.A;
    return j(i3, t2), P(void 0, i3);
  }, i2.setAutoFreeze = function(n2) {
    this.D = n2;
  }, i2.setUseProxies = function(r2) {
    r2 && !B && n(20), this.O = r2;
  }, i2.applyPatches = function(n2, t2) {
    var e3;
    for (e3 = t2.length - 1; e3 >= 0; e3--) {
      var i3 = t2[e3];
      if (0 === i3.path.length && "replace" === i3.op) {
        n2 = i3.value;
        break;
      }
    }
    e3 > -1 && (t2 = t2.slice(e3 + 1));
    var o2 = b("Patches").$;
    return r(n2) ? o2(n2, t2) : this.produce(n2, (function(n3) {
      return o2(n3, t2);
    }));
  }, e2;
})(), an = new un(), fn = an.produce, cn = an.produceWithPatches.bind(an), sn = an.setAutoFreeze.bind(an), vn = an.setUseProxies.bind(an), pn = an.applyPatches.bind(an), ln = an.createDraft.bind(an), dn = an.finishDraft.bind(an);

function i(f){var u=reactExports.useState(function(){return d("function"==typeof f?f():f,!0)}),i=u[1];return [u[0],reactExports.useCallback(function(t){i("function"==typeof t?fn(t):d(t));},[])]}function e(r,t,o){var i=reactExports.useMemo(function(){return fn(r)},[r]);return reactExports.useReducer(i,t,o)}

"use strict";
const initialState = {
  system: void 0
};
const SystemContext = React.createContext(
  void 0
);
const SystemReducer = (_draft, action) => {
  switch (action.type) {
    case "set-system": {
      return {
        system: action.payload.system
      };
    }
    case "system-loading": {
      return {
        system: void 0
      };
    }
    case "system-not-found": {
      return {
        system: null
      };
    }
  }
};
const SystemProvider = ({ children }) => {
  const [state, dispatch] = e(SystemReducer, initialState);
  const { data, loading } = useSystemQuery();
  React.useEffect(() => {
    if (data?.system && !loading) {
      dispatch({
        type: "set-system",
        payload: {
          system: data.system
        }
      });
    } else if (!data?.system && loading) {
      dispatch({
        type: "system-loading"
      });
    } else if (!data?.system && !loading) {
      dispatch({
        type: "system-not-found"
      });
    }
  }, [data, loading, dispatch]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SystemContext.Provider, { value: { state }, children });
};
const useSystem = () => {
  const context = React.useContext(SystemContext);
  if (context === void 0)
    throw new Error(
      "useSystem can only be used in a component wrapped by SystemProvider"
    );
  return context;
};

"use strict";
const Unit = ({ ...props }) => {
  const {
    state: { system }
  } = useSystem();
  const options = React.useMemo(() => {
    if (!system) return [];
    const options2 = [];
    for (let i = 0; i < system.unitDefaults.length; i++) {
      options2.push({
        title: system.unitDefaults[i],
        value: system.unitDefaults[i]
      });
    }
    return options2;
  }, [system]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { options, placeholder: "Select unit", ...props });
};

"use strict";
const MaterialSearch = ({
  materialSelected,
  handleSubmit,
  blacklistedIds,
  onChange,
  ...props
}) => {
  const { data } = useMaterialsCardQuery();
  const [options, setOptions] = React.useState([]);
  const [searchString, setSearchString] = React.useState("");
  const [searchTimeout, setSearchTimeout] = React.useState();
  const fullOptions = React.useMemo(() => {
    if (data?.materials) {
      return data.materials.map((material) => {
        return {
          label: material.name,
          value: material._id
        };
      });
    } else return [];
  }, [data]);
  const setDefaultOptions = React.useCallback(() => {
    if (data?.materials) {
      setOptions(
        data.materials.map((company) => {
          return {
            label: company.name,
            value: company._id
          };
        })
      );
    }
  }, [data?.materials]);
  const filterOptions = React.useCallback(
    (searchString2) => {
      const fullOptionsCopy = JSON.parse(
        JSON.stringify(fullOptions)
      );
      setOptions(
        fullOptionsCopy.filter(
          (option) => option.label.toLowerCase().match(searchString2.toLowerCase())
        )
      );
    },
    [fullOptions]
  );
  const handleChange = React.useCallback(
    (value) => {
      setSearchString(value);
      if (searchTimeout) clearTimeout(searchTimeout);
      if (value !== "") {
        setSearchTimeout(
          setTimeout(() => {
            filterOptions(value);
          }, 500)
        );
      } else setDefaultOptions();
    },
    [filterOptions, searchTimeout, setDefaultOptions]
  );
  React.useEffect(() => {
    if (data?.materials) {
      setDefaultOptions();
    }
  }, [data]);
  React.useEffect(() => {
    if (props.value && isObjectId(props.value.toString())) {
      const option = fullOptions.find((option2) => option2.value === props.value);
      if (option) {
        setSearchString(option.label);
        materialSelected({
          _id: option.value,
          name: option.label
        });
      }
    }
  }, [fullOptions]);
  React.useEffect(() => {
    if (props.value && !isObjectId(props.value.toString())) {
      setSearchString(props.value.toString());
    }
  }, [props.value]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    TextDropdown,
    {
      options,
      placeholder: "Search Materials",
      onOptionSelection: (value) => {
        setSearchString(value.label);
        materialSelected({
          _id: value.value,
          name: value.label
        });
        setDefaultOptions();
      },
      handleSubmit: () => {
        if (handleSubmit) handleSubmit(searchString);
      },
      autoComplete: "off",
      selectOptionsWithEnter: true,
      ...props,
      onChange: (e) => {
        if (onChange) onChange(e);
        handleChange(e.target.value);
      },
      value: searchString
    }
  );
};

"use strict";
const MaterialShipmentShipmentForm = ({
  shipment,
  canDelete,
  isLoading,
  jobsiteMaterials,
  dailyReportDate,
  errors,
  index,
  deliveredMaterial,
  showStartEndTime,
  afterMaterial,
  onChange,
  remove
}) => {
  const shipmentCopy = React.useMemo(() => {
    return JSON.parse(JSON.stringify(shipment));
  }, [shipment]);
  const jobsiteMaterialOptions = React.useMemo(() => {
    return jobsiteMaterials.filter((material) => {
      if (!deliveredMaterial && index > 0 && material.costType === JobsiteMaterialCostType.DeliveredRate)
        return false;
      return true;
    }).map((jobsiteMaterial) => {
      return {
        title: jobsiteMaterialName(jobsiteMaterial),
        value: jobsiteMaterial._id
      };
    });
  }, [deliveredMaterial, index, jobsiteMaterials]);
  const updateJobsiteMaterial = React.useCallback(
    (jobsiteMaterialId) => {
      if (isEmpty(jobsiteMaterialId)) shipmentCopy.noJobsiteMaterial = true;
      else shipmentCopy.noJobsiteMaterial = false;
      shipmentCopy.jobsiteMaterialId = jobsiteMaterialId;
      onChange(shipmentCopy);
    },
    [shipmentCopy, onChange]
  );
  const updateQuantity = React.useCallback(
    (value) => {
      shipmentCopy.quantity = value;
      onChange(shipmentCopy);
    },
    [shipmentCopy, onChange]
  );
  const updateUnit = React.useCallback(
    (value) => {
      shipmentCopy.unit = value;
      onChange(shipmentCopy);
    },
    [onChange, shipmentCopy]
  );
  const updateShipmentType = React.useCallback(
    (value) => {
      shipmentCopy.shipmentType = value;
      onChange(shipmentCopy);
    },
    [onChange, shipmentCopy]
  );
  const updateSupplier = React.useCallback(
    (value) => {
      shipmentCopy.supplier = value;
      onChange(shipmentCopy);
    },
    [onChange, shipmentCopy]
  );
  const updateStartTime = React.useCallback(
    (value) => {
      shipmentCopy.startTime = convertHourToDate(value, dailyReportDate);
      onChange(shipmentCopy);
    },
    [dailyReportDate, onChange, shipmentCopy]
  );
  const updateEndTime = React.useCallback(
    (value) => {
      shipmentCopy.endTime = convertHourToDate(value, dailyReportDate);
      onChange(shipmentCopy);
    },
    [dailyReportDate, onChange, shipmentCopy]
  );
  React.useEffect(() => {
    if (deliveredMaterial && index > 0) {
      updateJobsiteMaterial(deliveredMaterial._id);
    } else if (!deliveredMaterial && index > 0) {
      updateJobsiteMaterial(jobsiteMaterials[0]._id || "");
    }
  }, [deliveredMaterial, index]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { backgroundColor: "gray.300", borderRadius: 4, p: 2, m: 2, children: [
    canDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(Flex, { justifyContent: "end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      IconButton,
      {
        p: 0,
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FiX, {}),
        "aria-label": "remove",
        onClick: () => remove(),
        backgroundColor: "transparent",
        isLoading
      }
    ) }),
    shipment.noJobsiteMaterial ? (
      // NO JOBSITE MATERIAL
      /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            name: "jobsiteMaterialId",
            options: jobsiteMaterialOptions,
            placeholder: "Material not listed",
            label: "Material",
            isDisabled: isLoading || !!deliveredMaterial && index > 0,
            value: shipment.jobsiteMaterialId || void 0,
            errorMessage: errors?.jobsiteMaterialId,
            onChange: (e) => {
              updateJobsiteMaterial(e.target.value);
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(SimpleGrid, { spacing: 2, columns: [1, 1, 2], children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            NumberForm,
            {
              step: 10,
              stepper: true,
              label: "Quantity",
              isDisabled: isLoading,
              value: shipment.quantity,
              errorMessage: errors?.quantity,
              onChange: (e) => updateQuantity(parseFloat(e))
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Unit,
            {
              label: "Units",
              value: shipment.unit || void 0,
              onChange: (e) => updateUnit(e.target.value),
              errorMessage: errors?.unit
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(SimpleGrid, { spacing: 2, columns: [1, 1, 2], children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            MaterialSearch,
            {
              label: "Received Material",
              isDisabled: isLoading,
              errorMessage: errors?.shipmentType,
              materialSelected: (material) => updateShipmentType(material.name)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            CompanySearch,
            {
              label: "Supplier",
              isDisabled: isLoading,
              errorMessage: errors?.supplier,
              companySelected: (company) => updateSupplier(company.name)
            }
          )
        ] })
      ] })
    ) : (
      // JOBSITE MATERIAL
      /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            name: "jobsiteMaterialId",
            options: jobsiteMaterialOptions,
            placeholder: "Material not listed",
            label: "Material",
            isDisabled: isLoading || !!deliveredMaterial && index > 0,
            value: shipment.jobsiteMaterialId || void 0,
            errorMessage: errors?.jobsiteMaterialId,
            onChange: (e) => {
              updateJobsiteMaterial(e.target.value);
            }
          }
        ),
        afterMaterial,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          NumberForm,
          {
            step: 10,
            stepper: true,
            label: "Quantity",
            isDisabled: isLoading,
            value: shipment.quantity,
            errorMessage: errors?.quantity,
            onChange: (e) => updateQuantity(parseFloat(e))
          }
        )
      ] })
    ),
    showStartEndTime !== false && /* @__PURE__ */ jsxRuntimeExports.jsxs(SimpleGrid, { spacing: 2, columns: [1, 1, 2], children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          label: showStartEndTime ? "Start Time" : "Start Time (optional)",
          isDisabled: isLoading,
          value: shipment.startTime,
          bgColor: "white",
          type: "time",
          onChange: (e) => updateStartTime(e.target.value),
          errorMessage: errors?.startTime
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          label: showStartEndTime ? "End Time" : "End Time (optional)",
          isDisabled: isLoading,
          value: shipment.endTime,
          bgColor: "white",
          type: "time",
          onChange: (e) => updateEndTime(e.target.value),
          errorMessage: errors?.endTime
        }
      )
    ] })
  ] });
};

"use strict";
const SectionDivider = ({ label }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { alignItems: "center", gap: 2, px: 1, pt: 2, pb: 1, children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { h: "1px", flex: 1, bg: "gray.300" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(
    Text,
    {
      fontSize: "xs",
      fontWeight: "bold",
      color: "gray.400",
      textTransform: "uppercase",
      letterSpacing: "wider",
      children: label
    }
  ),
  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { h: "1px", flex: 1, bg: "gray.300" })
] });
const MaterialShipmentDataForm = ({
  formData,
  canDelete,
  isLoading,
  jobsiteMaterials,
  truckingRates,
  dailyReportDate,
  errors,
  onChange,
  remove
}) => {
  const formDataCopy = React.useMemo(() => {
    return JSON.parse(JSON.stringify(formData));
  }, [formData]);
  const initialShipment = React.useMemo(() => {
    const jobsiteMaterialId = jobsiteMaterials[0]?._id || "";
    return {
      noJobsiteMaterial: isEmpty(jobsiteMaterialId),
      jobsiteMaterialId,
      quantity: 0,
      startTime: void 0,
      endTime: void 0
    };
  }, [jobsiteMaterials]);
  const initialVehicleObject = React.useMemo(() => {
    return {
      source: "",
      vehicleType: truckingRates[0]?.title || MaterialShipmentVehicleTypes[0],
      vehicleCode: "",
      truckingRateId: truckingRates[0]?._id || ""
    };
  }, [truckingRates]);
  const selectedMaterial = React.useMemo(() => {
    const shipment = formData.shipments[0];
    if (!shipment || shipment.noJobsiteMaterial) return void 0;
    return jobsiteMaterials.find((m) => m._id === shipment.jobsiteMaterialId);
  }, [formData.shipments, jobsiteMaterials]);
  const isInvoiceModel = selectedMaterial?.costModel === JobsiteMaterialCostModel.Invoice;
  const isRateModel = selectedMaterial?.costModel === JobsiteMaterialCostModel.Rate;
  const isLegacy = !selectedMaterial?.costModel;
  const deliveredMaterial = React.useMemo(() => {
    if (!isLegacy) return void 0;
    if (selectedMaterial && selectedMaterial.costType === JobsiteMaterialCostType.DeliveredRate)
      return selectedMaterial;
    return void 0;
  }, [isLegacy, selectedMaterial]);
  const selectedScenario = React.useMemo(() => {
    if (!isRateModel) return void 0;
    const scenarioId = formData.vehicleObject?.rateScenarioId;
    return selectedMaterial?.scenarios?.find((s) => s._id === scenarioId);
  }, [isRateModel, formData.vehicleObject?.rateScenarioId, selectedMaterial]);
  const isDeliveredScenario = selectedScenario?.delivered ?? false;
  const isPickupScenario = isRateModel && !!selectedScenario && !isDeliveredScenario;
  const isHourlyTruck = React.useMemo(() => {
    if (!isPickupScenario) return false;
    const rate = truckingRates.find(
      (r) => r._id === formData.vehicleObject?.truckingRateId
    );
    return rate?.rates?.[0]?.type === TruckingRateTypes.Hour;
  }, [isPickupScenario, truckingRates, formData.vehicleObject?.truckingRateId]);
  const showScenarioSelector = isRateModel && (selectedMaterial?.scenarios?.length ?? 0) > 0;
  const showVehicleSection = isLegacy || isPickupScenario;
  const shipmentStartEndTime = isLegacy ? void 0 : isPickupScenario && isHourlyTruck ? true : false;
  const vehicleTypeOptions = React.useMemo(() => {
    if (deliveredMaterial) {
      return deliveredMaterial.deliveredRates.map((rate) => {
        return {
          title: rate.title,
          value: rate._id
        };
      });
    } else {
      return truckingRates.map((rate) => {
        return {
          title: rate.title,
          value: rate._id
        };
      });
    }
  }, [deliveredMaterial, truckingRates]);
  const addShipment = React.useCallback(() => {
    formDataCopy.shipments.push(initialShipment);
    onChange(formDataCopy);
  }, [formDataCopy, initialShipment, onChange]);
  const removeShipment = React.useCallback(
    (index) => {
      formDataCopy.shipments.splice(index, 1);
      onChange(formDataCopy);
    },
    [formDataCopy, onChange]
  );
  const updateVehicleSource = React.useCallback(
    (value) => {
      if (!formDataCopy.vehicleObject)
        formDataCopy.vehicleObject = initialVehicleObject;
      formDataCopy.vehicleObject.source = value;
      onChange(formDataCopy);
    },
    [formDataCopy, initialVehicleObject, onChange]
  );
  const updateVehicleCode = React.useCallback(
    (value) => {
      if (!formDataCopy.vehicleObject)
        formDataCopy.vehicleObject = initialVehicleObject;
      formDataCopy.vehicleObject.vehicleCode = value;
      onChange(formDataCopy);
    },
    [formDataCopy, initialVehicleObject, onChange]
  );
  const updateVehicleType = React.useCallback(
    (type, truckingRateId) => {
      if (!formDataCopy.vehicleObject)
        formDataCopy.vehicleObject = initialVehicleObject;
      formDataCopy.vehicleObject.vehicleType = type;
      if (deliveredMaterial) {
        formDataCopy.vehicleObject.deliveredRateId = truckingRateId;
      } else {
        formDataCopy.vehicleObject.truckingRateId = truckingRateId;
      }
      onChange(formDataCopy);
    },
    [deliveredMaterial, formDataCopy, initialVehicleObject, onChange]
  );
  const updateShipment = React.useCallback(
    (shipment, index) => {
      formDataCopy.shipments[index] = shipment;
      onChange(formDataCopy);
    },
    [formDataCopy, onChange]
  );
  const updateScenario = React.useCallback(
    (scenarioId) => {
      formDataCopy.vehicleObject = {
        ...formDataCopy.vehicleObject ?? initialVehicleObject,
        rateScenarioId: scenarioId
      };
      onChange(formDataCopy);
    },
    [formDataCopy, initialVehicleObject, onChange]
  );
  React.useEffect(() => {
    if (deliveredMaterial) {
      updateVehicleSource(deliveredMaterial.supplier.name);
      if (deliveredMaterial.deliveredRates[0])
        updateVehicleType(
          deliveredMaterial.deliveredRates[0].title,
          deliveredMaterial.deliveredRates[0]._id
        );
    }
  }, [deliveredMaterial]);
  React.useEffect(() => {
    if (isRateModel && selectedMaterial?.scenarios?.[0]) {
      updateScenario(selectedMaterial.scenarios[0]._id);
    }
  }, [selectedMaterial?._id]);
  const selectedScenarioId = formData.vehicleObject?.rateScenarioId;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(FormContainer, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { justifyContent: "space-between", alignItems: "center", px: 1, pb: 1, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { alignItems: "center", gap: 2, children: [
        deliveredMaterial && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { colorScheme: "green", fontSize: "xs", px: 2, py: 0.5, children: "Delivered" }),
        isInvoiceModel && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { colorScheme: "orange", fontSize: "xs", px: 2, py: 0.5, children: "Invoice" })
      ] }),
      canDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
        IconButton,
        {
          p: 0,
          size: "sm",
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FiX, {}),
          "aria-label": "remove",
          onClick: () => remove(),
          variant: "ghost",
          isLoading
        }
      )
    ] }),
    isInvoiceModel && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { status: "info", borderRadius: 6, py: 2, px: 3, mx: 1, mb: 3, fontSize: "sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertIcon, { boxSize: 4 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, { children: "Invoiced material — enter quantity only." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SectionDivider, { label: "Shipment" }),
    formData.shipments.map((shipment, shipmentIndex) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      MaterialShipmentShipmentForm,
      {
        errors: errors?.shipments[shipmentIndex],
        jobsiteMaterials,
        onChange: (shipment2) => updateShipment(shipment2, shipmentIndex),
        dailyReportDate,
        shipment,
        canDelete: formData.shipments.length > 1,
        isLoading,
        remove: () => removeShipment(shipmentIndex),
        index: shipmentIndex,
        deliveredMaterial,
        showStartEndTime: shipmentStartEndTime,
        afterMaterial: shipmentIndex === 0 && showScenarioSelector ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { py: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Text,
            {
              fontSize: "xs",
              fontWeight: "bold",
              color: "gray.500",
              textTransform: "uppercase",
              letterSpacing: "wider",
              mb: 2,
              children: "Rate Scenario"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            SimpleGrid,
            {
              columns: Math.min(selectedMaterial?.scenarios?.length ?? 0, 4),
              spacing: 2,
              children: (selectedMaterial?.scenarios ?? []).map((s) => {
                const isSelected = s._id === selectedScenarioId;
                const scheme = s.delivered ? "green" : "blue";
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Box,
                  {
                    as: "button",
                    type: "button",
                    onClick: () => !isLoading && updateScenario(s._id),
                    border: "2px solid",
                    borderColor: isSelected ? `${scheme}.400` : "gray.300",
                    borderRadius: 8,
                    p: 3,
                    bg: isSelected ? `${scheme}.50` : "white",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.6 : 1,
                    transition: "all 0.15s ease",
                    _hover: isLoading ? {} : { borderColor: `${scheme}.300`, bg: `${scheme}.50` },
                    textAlign: "left",
                    w: "100%",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { alignItems: "center", gap: 1, mb: s.delivered ? 1 : 0, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Box,
                          {
                            as: s.delivered ? FiTruck : FiPackage,
                            color: isSelected ? `${scheme}.500` : "gray.400",
                            flexShrink: 0
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Text,
                          {
                            fontWeight: "semibold",
                            fontSize: "sm",
                            color: isSelected ? `${scheme}.700` : "gray.700",
                            noOfLines: 1,
                            children: s.label
                          }
                        )
                      ] }),
                      s.delivered && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "xs", color: "green.600", children: "Trucking included" })
                    ]
                  },
                  s._id
                );
              })
            }
          ),
          isDeliveredScenario && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { status: "success", borderRadius: 6, py: 2, px: 3, mt: 2, fontSize: "sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertIcon, { boxSize: 4 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, { children: "Trucking is included in this rate — no vehicle info needed." })
          ] })
        ] }) : void 0
      },
      shipmentIndex
    )),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { w: "100%", px: 2, pb: 1, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      IconButton,
      {
        w: "100%",
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FiPlus, {}),
        "aria-label": "add-shipment",
        onClick: () => addShipment(),
        backgroundColor: "gray.300",
        isLoading
      }
    ) }),
    showVehicleSection && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SectionDivider, { label: "Vehicle" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(SimpleGrid, { spacing: 2, columns: [1, 1, 3], px: 2, pb: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          CompanySearch,
          {
            label: "Vehicle Source",
            isDisabled: isLoading,
            errorMessage: errors?.vehicleObject?.source,
            value: formData.vehicleObject?.source,
            companySelected: (company) => updateVehicleSource(company.name),
            helperText: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              "if not available contact ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ContactOffice, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            name: "vehicleType",
            onChange: (e) => {
              updateVehicleType(
                e.target.options[e.target.selectedIndex].text,
                e.target.value
              );
            },
            placeholder: "Select vehicle type",
            options: vehicleTypeOptions,
            errorMessage: errors?.vehicleObject?.vehicleType,
            label: "Vehicle Type",
            isDisabled: isLoading,
            helperText: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              "if not available contact ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ContactOffice, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "Vehicle Code",
            isDisabled: isLoading,
            value: formData.vehicleObject?.vehicleCode,
            errorMessage: errors?.vehicleObject?.vehicleCode,
            onChange: (e) => updateVehicleCode(e.target.value),
            helperText: " "
          }
        )
      ] })
    ] })
  ] });
};

export { MaterialShipmentDataForm as default };
//# sourceMappingURL=Data-Cqi7Q99q.js.map
