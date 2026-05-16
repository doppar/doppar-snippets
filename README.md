# Doppar Snippets

`Doppar Snippets` is a standalone VS Code extension project for the Doppar framework with a focus on `*.odo.php` templates.

It currently gives you:

- automatic recognition for `*.odo.php`
- basic syntax highlighting for ODO directives and echo tags
- snippets that keep Doppar ODO spacing consistent
- format support for common ODO spacing on save
- a Doppar file icon theme for `*.odo.php`
- PHP snippets for Doppar framework attributes

## What this extension knows about ODO

The scaffold was derived from the real framework compiler and directive traits in `package/doppar`:

- `src/Phaseolies/Support/Odo/OdoCompiler.php`
- `src/Phaseolies/Support/Odo/OdoCondition.php`
- `src/Phaseolies/Support/Odo/OdoDirectives.php`

That means the extension already understands syntax such as:

- `#extends`, `#section`, `#yield`, `#include`
- `#if`, `#elseif`, `#foreach`, `#forelse`, `#while`
- `#auth`, `#guest`, `#error`, `#errors`
- `#vite`, `#csrf`, `#method`
- `#scope`, `#scopenot`, `#blank`, `#solo`
- `#inject`, `#slot`
- `[[ ... ]]`, `[[! ... !]]`, `[[[ ... ]]]`, `[[-- ... --]]`

## Doppar PHP attributes

The extension now also ships PHP snippets for the framework attribute surface, including:

- routing and controller attributes: `#[Mapper]`, `#[Route]`, `#[Middleware]`, `#[Throttle]`, `#[Resolver]`, `#[Transaction]`
- parameter binding attributes: `#[Bind]`, `#[BindPayload]`, `#[Model]`
- model attributes: `#[Temporal]`, `#[Computed]`, `#[Hook]`, `#[Watches]`
- package-level attributes: `#[Immutable]`, `#[Broadcast]`, `#[Queueable]`
- cast attributes: `#[Transform]`, `#[ToString]`, `#[ToInteger]`, `#[ToFloat]`, `#[ToBoolean]`, `#[ToDate]`, `#[ToDateTime]`, `#[ToTimestamp]`, `#[ToArray]`, `#[ToJson]`, `#[ToObject]`, `#[ToCollection]`, and deprecated `#[CastToDate]`

Useful PHP snippet prefixes include:

- `doppar-route`
- `doppar-mapper`
- `doppar-middleware`
- `doppar-throttle`
- `doppar-bind`
- `doppar-immutable`
- `doppar-broadcast`
- `doppar-queueable`
- `doppar-temporal`
- `doppar-hook`
- `doppar-to-string`
- `doppar-to-array`

## Doppar logo in ODO files

Yes, this is possible in VS Code, but there is one platform rule to know:

- explorer file icons are controlled by the active File Icon Theme
- this extension now ships a `Doppar Icons` file icon theme that maps `*.odo.php` to a Doppar logo-style icon
- the `odo` language also contributes a language icon as a fallback, but an active icon theme can still override it

If you want guaranteed Doppar logos for ODO files in the explorer, select the `Doppar Icons` theme in VS Code:

1. Open Command Palette.
2. Run `Preferences: File Icon Theme`.
3. Choose `Doppar Icons`.

## Spacing behavior

The extension now formats common ODO syntax on save and through `Format Document`:

- `[[ $value ]]`
- `[[! $html !]]`
- `[[[ $value ]]]`
- `#if ($condition)`
- `#foreach ($items as $item)`

This means typing these unformatted variants:

- `[[$value]]`
- `[[!$html!]]`
- `[[[$value]]]`
- `#if($condition)`
- `#foreach($items as $item)`

will be normalized when the document is formatted or saved.

You can still trigger snippets with either the helper prefix or the real ODO syntax:

- `odo-echo` or `[[`
- `odo-if` or `#if`
- `odo-section` or `#section`
- `odo-foreach` or `#foreach`
