import { onRequestGet as __api_likes__slug__ts_onRequestGet } from "D:\\Henry\\Projects\\henry-chen-reading-notes\\functions\\api\\likes\\[slug].ts"
import { onRequestPost as __api_likes__slug__ts_onRequestPost } from "D:\\Henry\\Projects\\henry-chen-reading-notes\\functions\\api\\likes\\[slug].ts"

export const routes = [
    {
      routePath: "/api/likes/:slug",
      mountPath: "/api/likes",
      method: "GET",
      middlewares: [],
      modules: [__api_likes__slug__ts_onRequestGet],
    },
  {
      routePath: "/api/likes/:slug",
      mountPath: "/api/likes",
      method: "POST",
      middlewares: [],
      modules: [__api_likes__slug__ts_onRequestPost],
    },
  ]