# Agents Guide

> Starlight — Among Us mod manager built with Tauri 2 + SvelteKit

## Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Runtime  | Tauri 2.x (Rust backend) + SvelteKit (static adapter)   |
| Frontend | Svelte 5 (runes), TypeScript 5, Tailwind CSS 4          |
| UI       | shadcn-svelte, bits-ui, tailwind-variants, Lucide icons |
| Data     | TanStack Query, arktype (runtime validation)            |
| Package  | bun                                                     |

## Commands

```bash
# Quality
bun lint                   # ESLint + Prettier check
bun format                 # Prettier write
bun check                  # svelte-check (type checking)

# Rust (run from src-tauri/)
cargo check                # Check Rust code
cargo clippy               # Lint Rust code
cargo fmt                  # Format Rust code
```
