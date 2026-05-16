# Doppar Snippets

`Doppar Snippets` is a VS Code extension for working with the Doppar framework. It improves the authoring experience for ODO templates and Doppar PHP code by bringing framework-aware editing support directly into the editor.

## What It Does

- recognizes `*.odo.php` files as Doppar ODO templates
- adds ODO syntax highlighting for common template directives and echo tags
- provides ODO snippets for faster template authoring
- formats supported ODO syntax for cleaner, more consistent templates
- includes Doppar-focused PHP snippets for framework attributes
- adds a Doppar file icon theme for ODO files

## How To Use

Open an `*.odo.php` file and start typing an ODO directive or snippet prefix to get completion suggestions. You can use either Doppar-style prefixes or the directive syntax itself for many template snippets.

Common ODO triggers include:

- `odo-echo` or `[[`
- `odo-raw` or `[[!`
- `odo-comment` or `[[--`
- `odo-extends` or `#extends`
- `odo-section` or `#section`
- `odo-yield` or `#yield`
- `odo-include` or `#include`
- `odo-if` or `#if`
- `odo-elseif` or `#elseif`
- `odo-foreach` or `#foreach`

For Doppar PHP snippets, open a PHP file and type a Doppar prefix such as:

- `doppar-route`
- `doppar-mapper`
- `doppar-middleware`
- `doppar-throttle`
- `doppar-bind`
- `doppar-temporal`
- `doppar-hook`
- `doppar-to-string`
- `doppar-to-array`

Supported ODO formatting is applied through VS Code formatting, including `Format Document`, on-type formatting for supported syntax, and format-on-save when enabled for the language.

## ODO Template Support

The extension is built for everyday ODO template work and helps make templates easier to read, write, and maintain. It supports the directive patterns commonly used across layouts, sections, conditionals, loops, includes, auth blocks, form helpers, slots, and echo expressions.

## Doppar PHP Snippets

Alongside ODO support, the extension includes PHP snippets tailored to Doppar development. These cover common framework attributes used in routing, controllers, middleware, model behavior, binding, casting, queueing, broadcasting, and related application concerns.

## Best For

- building views with `*.odo.php`
- writing Doppar framework PHP code faster
- keeping template syntax consistent across projects
- improving readability when working in mixed ODO and PHP codebases

## Summary

If you build with Doppar, this extension gives VS Code a more framework-aware editing experience for both ODO templates and Doppar PHP development.
