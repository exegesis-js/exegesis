# Controllers

<!-- markdownlint-disable MD007 -->
<!-- TOC depthFrom:2 -->

- [Controllers](#controllers)
  - [x-exegesis-controller](#x-exegesis-controller)
  - [x-exegesis-operationId](#x-exegesis-operationid)

<!-- /TOC -->
<!-- markdownlint-enable MD007 -->

## x-exegesis-controller

Controls which module defines the controller for an operation.
`x-exegesis-controller` may contains "/"s if controllers are organized in a
hierarchy.

Allowed in:

- [OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#oasObject)
- [Paths Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#pathsObject)
- [Path Item Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#pathItemObject)
- [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#operationObject)
- [Media Type Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#mediaTypeObject) within the Operation Object's `requestBody.content[string]`.

Definitions at lower levels override definitions at higher levels.

## x-exegesis-operationId

Controls which operation is called within a controller.

Allowed in:

- [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#operationObject) - If `operationId` and `x-exegesis-operationId` are both specified, then `x-exegesis-operationId` takes precedence.
- [Media Type Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#mediaTypeObject) within the Operation Object's `requestBody.content[string]`.

Definitions at lower levels override definitions at higher levels. Definitions in Operation or Media Type Object also override `operationId` in the Operation Object.
