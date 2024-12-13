import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/main.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/Users/julian/expts/rayleigh/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=df99c0d5"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.__vite_plugin_react_preamble_installed__) {
    throw new Error("@vitejs/plugin-react can't detect preamble. Something is wrong. See https://github.com/vitejs/vite-plugin-react/pull/11#discussion_r430879201");
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    RefreshRuntime.register(type, "/Users/julian/expts/rayleigh/client/src/main.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import __vite__cjsImport3_react from "/@fs/Users/julian/expts/rayleigh/node_modules/.vite/deps/react.js?v=df99c0d5"; const StrictMode = __vite__cjsImport3_react["StrictMode"];
import __vite__cjsImport4_reactDom_client from "/@fs/Users/julian/expts/rayleigh/node_modules/.vite/deps/react-dom_client.js?v=df99c0d5"; const createRoot = __vite__cjsImport4_reactDom_client["createRoot"];
import "/src/index.css";
import { QueryClientProvider } from "/@fs/Users/julian/expts/rayleigh/node_modules/.vite/deps/@tanstack_react-query.js?v=df99c0d5";
import { queryClient } from "/src/lib/queryClient.ts";
import { Toaster } from "/src/components/ui/toaster.tsx";
import { ThemeProvider } from "/src/components/theme-provider.tsx";
import Router from "/src/routes/Router.tsx";
import __vite__cjsImport11__atproto_api from "/@fs/Users/julian/expts/rayleigh/node_modules/.vite/deps/@atproto_api.js?v=df99c0d5"; const BskyAgent = __vite__cjsImport11__atproto_api["BskyAgent"];
import { AgentProvider as AgentProviderContext } from "/src/contexts/agent.tsx";
const agent = new BskyAgent({ service: "https://bsky.social" });
function App() {
  return /* @__PURE__ */ jsxDEV(Router, {}, void 0, false, {
    fileName: "/Users/julian/expts/rayleigh/client/src/main.tsx",
    lineNumber: 17,
    columnNumber: 5
  }, this);
}
_c = App;
createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxDEV(StrictMode, { children: /* @__PURE__ */ jsxDEV(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxDEV(ThemeProvider, { defaultTheme: "light", storageKey: "ui-theme", children: /* @__PURE__ */ jsxDEV(AgentProviderContext, { agent, children: [
    /* @__PURE__ */ jsxDEV(Toaster, {}, void 0, false, {
      fileName: "/Users/julian/expts/rayleigh/client/src/main.tsx",
      lineNumber: 26,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
      fileName: "/Users/julian/expts/rayleigh/client/src/main.tsx",
      lineNumber: 27,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/julian/expts/rayleigh/client/src/main.tsx",
    lineNumber: 25,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "/Users/julian/expts/rayleigh/client/src/main.tsx",
    lineNumber: 24,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/julian/expts/rayleigh/client/src/main.tsx",
    lineNumber: 23,
    columnNumber: 5
  }, this) }, void 0, false, {
    fileName: "/Users/julian/expts/rayleigh/client/src/main.tsx",
    lineNumber: 22,
    columnNumber: 3
  }, this)
);
var _c;
$RefreshReg$(_c, "App");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/julian/expts/rayleigh/client/src/main.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/julian/expts/rayleigh/client/src/main.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBZ0JJO0FBaEJKLDJCQUEyQjtBQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUNsQyxTQUFTQSxrQkFBa0I7QUFDM0IsT0FBTztBQUNQLFNBQVNDLDJCQUEyQjtBQUNwQyxTQUFTQyxtQkFBbUI7QUFDNUIsU0FBU0MsZUFBZTtBQUN4QixTQUFTQyxxQkFBcUI7QUFFOUIsT0FBT0MsWUFBWTtBQUNuQixTQUFTQyxpQkFBaUI7QUFDMUIsU0FBU0MsaUJBQWlCQyw0QkFBNEI7QUFFdEQsTUFBTUMsUUFBUSxJQUFJSCxVQUFVLEVBQUVJLFNBQVMsc0JBQXNCLENBQUM7QUFFOUQsU0FBU0MsTUFBTTtBQUNiLFNBQ0UsdUJBQUMsWUFBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQU87QUFFWDtBQUFDQyxLQUpRRDtBQU1UWCxXQUFXYSxTQUFTQyxlQUFlLE1BQU0sQ0FBRSxFQUFFQztBQUFBQSxFQUMzQyx1QkFBQyxjQUNDLGlDQUFDLHVCQUFvQixRQUFRYixhQUMzQixpQ0FBQyxpQkFBYyxjQUFhLFNBQVEsWUFBVyxZQUM3QyxpQ0FBQyx3QkFBcUIsT0FDcEI7QUFBQSwyQkFBQyxhQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBUTtBQUFBLElBQ1IsdUJBQUMsU0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQUk7QUFBQSxPQUZOO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FHQSxLQUpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FLQSxLQU5GO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FPQSxLQVJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FTQTtBQUNGO0FBQUUsSUFBQVU7QUFBQUksYUFBQUosSUFBQSIsIm5hbWVzIjpbImNyZWF0ZVJvb3QiLCJRdWVyeUNsaWVudFByb3ZpZGVyIiwicXVlcnlDbGllbnQiLCJUb2FzdGVyIiwiVGhlbWVQcm92aWRlciIsIlJvdXRlciIsIkJza3lBZ2VudCIsIkFnZW50UHJvdmlkZXIiLCJBZ2VudFByb3ZpZGVyQ29udGV4dCIsImFnZW50Iiwic2VydmljZSIsIkFwcCIsIl9jIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsInJlbmRlciIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJtYWluLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdHJpY3RNb2RlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBjcmVhdGVSb290IH0gZnJvbSBcInJlYWN0LWRvbS9jbGllbnRcIjtcbmltcG9ydCBcIi4vaW5kZXguY3NzXCI7XG5pbXBvcnQgeyBRdWVyeUNsaWVudFByb3ZpZGVyIH0gZnJvbSBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiO1xuaW1wb3J0IHsgcXVlcnlDbGllbnQgfSBmcm9tIFwiLi9saWIvcXVlcnlDbGllbnRcIjtcbmltcG9ydCB7IFRvYXN0ZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3RvYXN0ZXJcIjtcbmltcG9ydCB7IFRoZW1lUHJvdmlkZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL3RoZW1lLXByb3ZpZGVyXCI7XG5pbXBvcnQgeyBBZ2VudFByb3ZpZGVyIH0gZnJvbSBcIi4vY29udGV4dHMvYWdlbnRcIjtcbmltcG9ydCBSb3V0ZXIgZnJvbSBcIi4vcm91dGVzL1JvdXRlclwiO1xuaW1wb3J0IHsgQnNreUFnZW50IH0gZnJvbSBcIkBhdHByb3RvL2FwaVwiO1xuaW1wb3J0IHsgQWdlbnRQcm92aWRlciBhcyBBZ2VudFByb3ZpZGVyQ29udGV4dCB9IGZyb20gXCIuL2NvbnRleHRzL2FnZW50XCI7XG5cbmNvbnN0IGFnZW50ID0gbmV3IEJza3lBZ2VudCh7IHNlcnZpY2U6IFwiaHR0cHM6Ly9ic2t5LnNvY2lhbFwiIH0pO1xuXG5mdW5jdGlvbiBBcHAoKSB7XG4gIHJldHVybiAoXG4gICAgPFJvdXRlciAvPlxuICApO1xufVxuXG5jcmVhdGVSb290KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicm9vdFwiKSEpLnJlbmRlcihcbiAgPFN0cmljdE1vZGU+XG4gICAgPFF1ZXJ5Q2xpZW50UHJvdmlkZXIgY2xpZW50PXtxdWVyeUNsaWVudH0+XG4gICAgICA8VGhlbWVQcm92aWRlciBkZWZhdWx0VGhlbWU9XCJsaWdodFwiIHN0b3JhZ2VLZXk9XCJ1aS10aGVtZVwiPlxuICAgICAgICA8QWdlbnRQcm92aWRlckNvbnRleHQgYWdlbnQ9e2FnZW50fT5cbiAgICAgICAgICA8VG9hc3RlciAvPlxuICAgICAgICAgIDxBcHAgLz5cbiAgICAgICAgPC9BZ2VudFByb3ZpZGVyQ29udGV4dD5cbiAgICAgIDwvVGhlbWVQcm92aWRlcj5cbiAgICA8L1F1ZXJ5Q2xpZW50UHJvdmlkZXI+XG4gIDwvU3RyaWN0TW9kZT4sXG4pO1xuIl0sImZpbGUiOiIvVXNlcnMvanVsaWFuL2V4cHRzL3JheWxlaWdoL2NsaWVudC9zcmMvbWFpbi50c3gifQ==