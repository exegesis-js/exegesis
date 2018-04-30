# oas3

This represents a "parsed" OpenAPI 3.x.x document.

This is a rough view of the heirachy of objects in an OpenApi object:

```text
OpenApi
+- Servers
+- Paths
   +- Path[]
      +- Operation
         +- MediaType
          +- Parameter
```

Every object has an Oas3CompileContext which has "global" information about
configuration and about where that object came from.