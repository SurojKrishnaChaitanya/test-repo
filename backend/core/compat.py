"""
INDRA-AI Operational Compatibility Layer
Provides transparent fallbacks for environments where binary wheels are unavailable.
When deployed on Render or standard Python environments, standard pydantic, fastapi,
and uvicorn are utilized directly. In environments without compiled extensions,
Starlette or pure ASGI provides the robust application runtime.
"""

import inspect
from typing import Any, Dict, List, Optional, Callable

try:
    from pydantic import BaseModel as _PydanticBaseModel, Field as _PydanticField
    BaseModel = _PydanticBaseModel
    Field = _PydanticField
except Exception:
    class BaseModel:
        def __init__(self, **data):
            for cls in reversed(self.__class__.__mro__):
                for k in getattr(cls, "__annotations__", {}):
                    if hasattr(cls, k):
                        val = getattr(cls, k)
                        if hasattr(val, "default"):
                            val = val.default
                        setattr(self, k, val)
            for k, v in data.items():
                setattr(self, k, v)

        def model_dump(self):
            return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

        def dict(self):
            return self.model_dump()

    def Field(default=None, **kwargs):
        return default


_FASTAPI_AVAILABLE = False
try:
    from fastapi import (
        FastAPI as _RealFastAPI,
        Request as _RealRequest,
        APIRouter as _RealAPIRouter,
        Query as _RealQuery,
        HTTPException as _RealHTTPException,
    )
    from fastapi.middleware.cors import CORSMiddleware as _RealCORSMiddleware
    from starlette.middleware.base import BaseHTTPMiddleware as _RealBaseHTTPMiddleware
    from starlette.responses import JSONResponse as _RealJSONResponse, Response as _RealResponse

    FastAPI = _RealFastAPI
    Request = _RealRequest
    APIRouter = _RealAPIRouter
    Query = _RealQuery
    HTTPException = _RealHTTPException
    CORSMiddleware = _RealCORSMiddleware
    BaseHTTPMiddleware = _RealBaseHTTPMiddleware
    JSONResponse = _RealJSONResponse
    Response = _RealResponse
    _FASTAPI_AVAILABLE = True
except Exception:
    _FASTAPI_AVAILABLE = False


if not _FASTAPI_AVAILABLE:
    try:
        from starlette.applications import Starlette
        from starlette.requests import Request
        from starlette.responses import JSONResponse, Response
        from starlette.routing import Route
        from starlette.middleware.cors import CORSMiddleware
        from starlette.middleware.base import BaseHTTPMiddleware
        from starlette.exceptions import HTTPException

        def Query(default=None, **kwargs):
            return default

        class APIRouter:
            def __init__(self, prefix: str = "", tags: Optional[List[str]] = None):
                self.prefix = prefix
                self.tags = tags or []
                self.routes = []

            def get(self, path: str, **kwargs):
                def decorator(func: Callable):
                    self.routes.append(("GET", self.prefix + path, func))
                    return func
                return decorator

            def post(self, path: str, **kwargs):
                def decorator(func: Callable):
                    self.routes.append(("POST", self.prefix + path, func))
                    return func
                return decorator

        class FastAPI:
            def __init__(
                self,
                title: str = "INDRA-AI Engine",
                version: str = "2.4.0",
                description: str = "",
                docs_url: Optional[str] = "/docs",
                redoc_url: Optional[str] = "/redoc",
                **kwargs,
            ):
                self.title = title
                self.version = version
                self.description = description
                self._raw_routes = []
                self._middlewares = []
                self._app = None

            def add_middleware(self, middleware_cls, **kwargs):
                self._middlewares.append((middleware_cls, kwargs))

            def include_router(self, router: APIRouter, prefix: str = ""):
                for method, path, func in router.routes:
                    self._raw_routes.append((method, prefix + path, func))

            def get(self, path: str, **kwargs):
                def decorator(func: Callable):
                    self._raw_routes.append(("GET", path, func))
                    return func
                return decorator

            def post(self, path: str, **kwargs):
                def decorator(func: Callable):
                    self._raw_routes.append(("POST", path, func))
                    return func
                return decorator

            def _wrap_endpoint(self, func: Callable, method: str):
                sig = inspect.signature(func)

                async def endpoint(request: Request):
                    kwargs = {}
                    body = None
                    if request.method in ("POST", "PUT", "PATCH"):
                        try:
                            body = await request.json()
                        except Exception:
                            body = {}

                    for name, param in sig.parameters.items():
                        if param.annotation == Request or name == "request":
                            kwargs[name] = request
                        elif body is not None and (
                            name == "payload"
                            or hasattr(param.annotation, "__annotations__")
                            or hasattr(param.annotation, "model_dump")
                        ):
                            try:
                                kwargs[name] = param.annotation(**body) if callable(param.annotation) else body
                            except Exception:
                                kwargs[name] = body
                        elif name in request.query_params:
                            val = request.query_params[name]
                            if param.annotation in (int, float):
                                try:
                                    val = param.annotation(val)
                                except Exception:
                                    pass
                            kwargs[name] = val
                        elif param.default is not inspect.Parameter.empty:
                            kwargs[name] = param.default

                    if inspect.iscoroutinefunction(func):
                        res = await func(**kwargs)
                    else:
                        res = func(**kwargs)

                    if isinstance(res, Response):
                        return res
                    if hasattr(res, "model_dump"):
                        res = res.model_dump()
                    return JSONResponse(res)

                return endpoint

            def _build_app(self):
                if self._app is not None:
                    return self._app

                routes = []
                for method, path, func in self._raw_routes:
                    wrapped = self._wrap_endpoint(func, method)
                    routes.append(Route(path, wrapped, methods=[method]))

                app = Starlette(routes=routes)
                for mw_cls, kw in self._middlewares:
                    app.add_middleware(mw_cls, **kw)

                self._app = app
                return self._app

            async def __call__(self, scope, receive, send):
                app = self._build_app()
                await app(scope, receive, send)

    except Exception:
        # Minimal Pure ASGI Fallback
        class HTTPException(Exception):
            def __init__(self, status_code: int, detail: str):
                self.status_code = status_code
                self.detail = detail
                super().__init__(detail)

        def Query(default=None, **kwargs):
            return default

        class APIRouter:
            def __init__(self, prefix: str = "", tags: Optional[List[str]] = None):
                self.prefix = prefix
                self.tags = tags or []
                self.routes = []

            def get(self, path: str, **kwargs):
                def decorator(func: Callable):
                    self.routes.append(("GET", self.prefix + path, func))
                    return func
                return decorator

            def post(self, path: str, **kwargs):
                def decorator(func: Callable):
                    self.routes.append(("POST", self.prefix + path, func))
                    return func
                return decorator

        class Request:
            def __init__(self, scope, receive):
                self.scope = scope
                self.receive = receive
                self.method = scope.get("method", "GET")
                self.url = type("URL", (), {"path": scope.get("path", "/")})()
                self.headers = {k.decode("latin1"): v.decode("latin1") for k, v in scope.get("headers", [])}
                self.query_params = {}

            async def json(self):
                return {}

        class Response:
            def __init__(self, content: bytes = b"", status_code: int = 200, headers: Optional[Dict[str, str]] = None):
                self.content = content
                self.status_code = status_code
                self.headers = headers or {}

        class JSONResponse(Response):
            def __init__(self, content: Any = None, status_code: int = 200, headers: Optional[Dict[str, str]] = None):
                import json
                encoded = json.dumps(content).encode("utf-8")
                hdrs = headers or {}
                hdrs["content-type"] = "application/json"
                super().__init__(content=encoded, status_code=status_code, headers=hdrs)

        class CORSMiddleware:
            pass

        class BaseHTTPMiddleware:
            def __init__(self, app):
                self.app = app

        class FastAPI:
            def __init__(self, title: str = "", version: str = "", **kwargs):
                self.title = title
                self.version = version
                self.routes = []
                self.middlewares = []

            def add_middleware(self, middleware_cls, **kwargs):
                self.middlewares.append((middleware_cls, kwargs))

            def include_router(self, router: APIRouter, prefix: str = ""):
                for method, path, func in router.routes:
                    self.routes.append((method, prefix + path, func))

            def get(self, path: str, **kwargs):
                def decorator(func: Callable):
                    self.routes.append(("GET", path, func))
                    return func
                return decorator

            def post(self, path: str, **kwargs):
                def decorator(func: Callable):
                    self.routes.append(("POST", path, func))
                    return func
                return decorator

            async def __call__(self, scope, receive, send):
                if scope["type"] != "http":
                    return

                path = scope.get("path", "/")
                method = scope.get("method", "GET")

                handler = None
                for m, p, f in self.routes:
                    if m == method and p == path:
                        handler = f
                        break

                req = Request(scope, receive)
                async def base_call_next(request):
                    nonlocal handler
                    if handler is None:
                        return JSONResponse({"detail": "Not Found"}, status_code=404)
                    if inspect.iscoroutinefunction(handler):
                        res = await handler()
                    else:
                        res = handler()
                    if isinstance(res, Response):
                        return res
                    return JSONResponse(res)

                call_next = base_call_next
                for mw_cls, kw in reversed(self.middlewares):
                    if hasattr(mw_cls, "dispatch"):
                        mw_inst = mw_cls(self)
                        curr_call = call_next
                        def make_step(m, nxt):
                            async def step(r):
                                return await m.dispatch(r, nxt)
                            return step
                        call_next = make_step(mw_inst, curr_call)

                response = await call_next(req)

                headers_raw = [(k.encode("latin1"), v.encode("latin1")) for k, v in response.headers.items()]
                await send({
                    "type": "http.response.start",
                    "status": response.status_code,
                    "headers": headers_raw,
                })
                await send({
                    "type": "http.response.body",
                    "body": response.content,
                })


__all__ = [
    "BaseModel",
    "Field",
    "FastAPI",
    "Request",
    "Response",
    "JSONResponse",
    "APIRouter",
    "Query",
    "HTTPException",
    "CORSMiddleware",
    "BaseHTTPMiddleware",
]
